use crate::invocation_dispatcher::OutboundConnector;
use axum::body::{Body, Bytes, HttpBody};
use axum::http::header::{self, HeaderName, HeaderValue};
use axum::http::request::{Builder as RequestBuilder, Parts as RequestParts};
use axum::http::uri::PathAndQuery;
use axum::http::{HeaderMap, Uri};
use axum::response::Response;
use http_body::Frame;
use http_body_util::{BodyExt, Full};
use hyper::Request as HyperRequest;
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::Client;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::connect::proxy::Tunnel;
use hyper_util::rt::TokioExecutor;
use sdkwork_cloudrouter_config::{
    ProviderPassthroughAuth, ProviderPassthroughAuthType, ProviderPassthroughHeader,
};
use sdkwork_cloudrouter_http::ensure_rustls_crypto_provider;
use sdkwork_cloudrouter_http::{
    OutboundDnsResolver, path_carries_version_prefix, upsert_query_parameter,
};
use sdkwork_cloudrouter_router_service::infrastructure::provider::ProviderRelayHttpPoolConfig;
use sdkwork_cloudrouter_security::{OutboundTargetPolicy, validate_outbound_url};
use std::collections::HashSet;
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::Duration;

pub(crate) type PassthroughBody = Full<Bytes>;
pub(crate) type PassthroughConnector = HttpsConnector<OutboundConnector>;
pub(crate) type PassthroughClient = Client<PassthroughConnector, PassthroughBody>;

#[derive(Clone)]
pub(crate) struct ProviderPassthroughTarget {
    provider: String,
    base_url: String,
    auth: ProviderPassthroughAuth,
    default_headers: Vec<ProviderPassthroughHeader>,
}

impl ProviderPassthroughTarget {
    pub(crate) fn new(
        provider: impl Into<String>,
        base_url: impl Into<String>,
        auth: ProviderPassthroughAuth,
        default_headers: Vec<ProviderPassthroughHeader>,
    ) -> Self {
        Self {
            provider: provider.into(),
            base_url: base_url.into(),
            auth,
            default_headers,
        }
    }

    pub(crate) fn provider(&self) -> &str {
        &self.provider
    }

    pub(crate) fn base_url(&self) -> &str {
        &self.base_url
    }

    pub(crate) fn auth(&self) -> &ProviderPassthroughAuth {
        &self.auth
    }

    pub(crate) fn default_headers(&self) -> &[ProviderPassthroughHeader] {
        &self.default_headers
    }

    /// Whether the configured base URL already carries the OpenAI-family API
    /// version segment. Recognises every published prefix, not only `/v1`
    /// (`/api/v3`, `/v2`, `/api/paas/v4`, `/v1beta/openai`,
    /// `/compatible-mode/v1`). See
    /// [`sdkwork_cloudrouter_http::path_carries_version_prefix`].
    pub(crate) fn base_url_carries_version_prefix(&self) -> bool {
        self.base_url
            .parse::<Uri>()
            .ok()
            .is_some_and(|uri| path_carries_version_prefix(uri.path()))
    }

    pub(crate) fn normalize_openai_compatible_path(&self, path: &str) -> String {
        if self.base_url_carries_version_prefix() {
            path.strip_prefix("/v1").unwrap_or(path).to_owned()
        } else {
            path.to_owned()
        }
    }

    pub(crate) fn build_uri(&self, path_and_query: impl AsRef<str>) -> Result<Uri, String> {
        let path_and_query = self.append_query_auth(path_and_query.as_ref())?;
        format!("{}{}", self.base_url(), path_and_query)
            .parse::<Uri>()
            .map_err(|error| format!("invalid provider passthrough upstream URI: {error}"))
    }

    fn append_query_auth(&self, path_and_query: &str) -> Result<String, String> {
        if self.auth.auth_type() != ProviderPassthroughAuthType::Query {
            return Ok(path_and_query.to_owned());
        }
        let name = self
            .auth
            .name()
            .ok_or_else(|| "provider passthrough query auth name is missing".to_owned())?;
        let path_and_query = path_and_query
            .parse::<PathAndQuery>()
            .map_err(|error| format!("provider passthrough path and query are invalid: {error}"))?;
        let query = upsert_query_parameter(path_and_query.query(), name, self.auth.value());
        Ok(format!("{}?{query}", path_and_query.path()))
    }
}

pub(crate) fn build_provider_passthrough_client(
    outbound_target_policy: OutboundTargetPolicy,
    pool_config: ProviderRelayHttpPoolConfig,
    proxy: Option<Uri>,
) -> PassthroughClient {
    ensure_rustls_crypto_provider();
    let outbound_connector = match proxy {
        Some(proxy) => {
            // The proxy is operator infrastructure: resolved by the system
            // resolver (no SSRF validation) and connected over plain TCP; the
            // tunnelled target is resolved by the proxy itself.
            let mut proxy_connector = HttpConnector::new();
            proxy_connector.set_connect_timeout(Some(pool_config.connect_timeout));
            OutboundConnector::Tunnelled(Tunnel::new(proxy, proxy_connector))
        }
        None => {
            let mut http_connector =
                HttpConnector::new_with_resolver(OutboundDnsResolver::new(outbound_target_policy));
            http_connector.set_connect_timeout(Some(pool_config.connect_timeout));
            http_connector.enforce_http(false);
            OutboundConnector::Direct(http_connector)
        }
    };
    let builder = hyper_rustls::HttpsConnectorBuilder::new().with_webpki_roots();
    let builder = match outbound_target_policy {
        OutboundTargetPolicy::Production => builder.https_only(),
        OutboundTargetPolicy::Development => builder.https_or_http(),
    };
    let connector = builder.enable_http1().wrap_connector(outbound_connector);
    Client::builder(TokioExecutor::new())
        .pool_idle_timeout(Some(pool_config.pool_idle_timeout))
        .pool_max_idle_per_host(pool_config.pool_max_idle_per_host)
        .build(connector)
}

pub(crate) async fn forward_provider_passthrough_to_target(
    client: &PassthroughClient,
    outbound_target_policy: OutboundTargetPolicy,
    parts: RequestParts,
    body: Bytes,
    target: &ProviderPassthroughTarget,
    upstream_uri: Uri,
    response_timeout: Duration,
) -> Result<Response, String> {
    validate_provider_passthrough_target(&upstream_uri, outbound_target_policy)?;
    let mut builder = HyperRequest::builder()
        .method(parts.method)
        .uri(upstream_uri);
    let connection_header_names = connection_header_names(&parts.headers);
    let configured_header_names = configured_provider_passthrough_header_names(target)?;
    for (name, value) in parts.headers.iter() {
        if should_forward_provider_request_header(
            name,
            &connection_header_names,
            &configured_header_names,
        ) {
            builder = builder.header(name, value);
        }
    }
    builder = apply_provider_passthrough_default_headers(builder, target)?;
    if let Some(headers) = builder.headers_mut() {
        headers.insert(
            header::ACCEPT_ENCODING,
            HeaderValue::from_static("identity"),
        );
    }
    builder = apply_provider_passthrough_auth(builder, target)?;
    let upstream_request = builder
        .body(Full::new(body))
        .map_err(|error| format!("failed to build provider passthrough request: {error}"))?;
    let upstream_response =
        tokio::time::timeout(response_timeout, client.request(upstream_request))
            .await
            .map_err(|_| {
                format!(
                    "provider passthrough upstream request timed out after {} ms",
                    response_timeout.as_millis()
                )
            })?
            .map_err(|error| format!("provider passthrough upstream request failed: {error}"))?;
    Ok(apply_passthrough_stream_timeouts(
        upstream_to_axum_response(upstream_response).await,
        response_timeout,
    ))
}

/// Total stream lifetime applied when no request-specific stream timeout is
/// configured (30 minutes, matching the OpenAI-compatible relay default).
pub(crate) const PROVIDER_STREAM_TOTAL: Duration = Duration::from_secs(1_800);

/// Applies bounded total and idle deadlines to a forwarded streaming response
/// body. The response-header timeout above only covers header arrival; a
/// stalled upstream that never sends another frame must not hold the
/// downstream connection (and its upstream quota) indefinitely.
fn apply_passthrough_stream_timeouts(response: Response, total_timeout: Duration) -> Response {
    let (parts, body) = response.into_parts();
    Response::from_parts(parts, apply_stream_deadlines_to_body(body, total_timeout))
}

/// Applies the passthrough total/idle stream deadlines to an already-built
/// body. Used directly by the adapter streaming path, which has no
/// response-level wrapper to attach deadlines to.
pub(crate) fn apply_stream_deadlines_to_body(body: Body, total_timeout: Duration) -> Body {
    let idle_timeout = total_timeout
        .min(Duration::from_secs(60))
        .max(Duration::from_secs(1));
    Body::new(PassthroughStreamTimeoutBody {
        inner: body,
        total_deadline: std::time::Instant::now() + total_timeout,
        idle: idle_timeout,
        idle_timer: None,
    })
}

/// Poll-based body wrapper enforcing total and idle deadlines without
/// buffering the stream.
struct PassthroughStreamTimeoutBody {
    inner: Body,
    total_deadline: std::time::Instant,
    idle: Duration,
    idle_timer: Option<Pin<Box<dyn Future<Output = ()> + Send>>>,
}

impl HttpBody for PassthroughStreamTimeoutBody {
    type Data = Bytes;
    type Error = axum::Error;

    fn poll_frame(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Result<Frame<Self::Data>, Self::Error>>> {
        if std::time::Instant::now() >= self.total_deadline {
            return Poll::Ready(Some(Err(axum::Error::new(std::io::Error::other(
                "provider passthrough stream exceeded the total response deadline",
            )))));
        }
        match Pin::new(&mut self.inner).poll_frame(cx) {
            Poll::Ready(Some(Ok(frame))) => {
                // A frame arrived: reset the idle timer for the next gap.
                self.idle_timer = Some(Box::pin(tokio::time::sleep(self.idle)));
                Poll::Ready(Some(Ok(frame)))
            }
            Poll::Ready(Some(Err(error))) => Poll::Ready(Some(Err(error))),
            Poll::Ready(None) => Poll::Ready(None),
            Poll::Pending => {
                // No frame yet: poll the idle timer in the same call so its
                // waker is registered with the consumer. Creating the timer
                // without polling it would leave the stream unable to wake
                // when a stalled upstream never wakes the inner body.
                let idle = self.idle;
                let timer = self
                    .idle_timer
                    .get_or_insert_with(|| Box::pin(tokio::time::sleep(idle)));
                if timer.as_mut().poll(cx).is_ready() {
                    return Poll::Ready(Some(Err(axum::Error::new(std::io::Error::other(
                        "provider passthrough stream idle deadline exceeded",
                    )))));
                }
                Poll::Pending
            }
        }
    }
}

pub(crate) fn validate_provider_passthrough_target(
    upstream_uri: &Uri,
    outbound_target_policy: OutboundTargetPolicy,
) -> Result<(), String> {
    validate_outbound_url(&upstream_uri.to_string(), outbound_target_policy)
        .map(|_| ())
        .map_err(|_| "provider passthrough target violates the outbound target policy".to_owned())
}

fn apply_provider_passthrough_auth(
    mut builder: RequestBuilder,
    target: &ProviderPassthroughTarget,
) -> Result<RequestBuilder, String> {
    match target.auth.auth_type() {
        ProviderPassthroughAuthType::Bearer => {
            let authorization = HeaderValue::from_str(
                format!("Bearer {}", target.auth.value()).as_str(),
            )
            .map_err(|error| format!("provider passthrough bearer token is invalid: {error}"))?;
            builder = builder.header(header::AUTHORIZATION, authorization);
        }
        ProviderPassthroughAuthType::Header => {
            let name = target
                .auth
                .name()
                .ok_or_else(|| "provider passthrough header auth name is missing".to_owned())?;
            let header_name = HeaderName::from_bytes(name.as_bytes()).map_err(|error| {
                format!("provider passthrough auth header name is invalid: {error}")
            })?;
            let header_value = HeaderValue::from_str(target.auth.value()).map_err(|error| {
                format!("provider passthrough auth header value is invalid: {error}")
            })?;
            builder = builder.header(header_name, header_value);
        }
        ProviderPassthroughAuthType::Query => {}
    }
    Ok(builder)
}

fn apply_provider_passthrough_default_headers(
    mut builder: RequestBuilder,
    target: &ProviderPassthroughTarget,
) -> Result<RequestBuilder, String> {
    for header in &target.default_headers {
        let header_name = HeaderName::from_bytes(header.name().as_bytes()).map_err(|error| {
            format!(
                "provider passthrough default header name {} is invalid: {error}",
                header.name()
            )
        })?;
        let header_value = HeaderValue::from_str(header.value()).map_err(|error| {
            format!(
                "provider passthrough default header {} value is invalid: {error}",
                header.name()
            )
        })?;
        builder = builder.header(header_name, header_value);
    }
    Ok(builder)
}

fn configured_provider_passthrough_header_names(
    target: &ProviderPassthroughTarget,
) -> Result<HashSet<String>, String> {
    let mut headers = target
        .default_headers
        .iter()
        .map(|header| header.name().to_owned())
        .collect::<HashSet<_>>();
    if target.auth.auth_type() == ProviderPassthroughAuthType::Header {
        let name = target
            .auth
            .name()
            .ok_or_else(|| "provider passthrough header auth name is missing".to_owned())?;
        headers.insert(name.to_ascii_lowercase());
    }
    Ok(headers)
}

/// Upper bound for buffering a non-success provider error body so it can be
/// scrubbed before it reaches the gateway client. Provider rejections are
/// small JSON documents; anything near this bound is a contract violation and
/// the body is withheld instead of forwarded.
const MAX_PROVIDER_PASSTHROUGH_ERROR_BYTES: usize = 64 * 1024;

fn withheld_provider_error_body() -> &'static str {
    "{\"error\":{\"message\":\"provider error body exceeded the redaction buffer and was withheld\",\"code\":\"provider_error_body_withheld\"}}"
}

/// Converts an upstream provider response into an axum response.
///
/// Success responses stream through with zero buffering. Non-success bodies
/// are buffered (bounded) and scrubbed through the shared
/// [`redact_sensitive_tokens`] pass first: the upstream credentials were just
/// attached to this request, so a provider that echoes a rejected credential
/// (`sk-...`, `Bearer ...`, `api key: ...`) inside its error body must not
/// leak that material to the calling tenant. This mirrors the buffered relay
/// path in `invocation_http` so redaction behavior cannot drift between the
/// two egress paths.
async fn upstream_to_axum_response(
    upstream_response: hyper::Response<hyper::body::Incoming>,
) -> Response {
    let (mut parts, body) = upstream_response.into_parts();
    let content_type = parts
        .headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let mut error_body_withheld = false;
    let mut response = if parts.status.is_success() {
        Response::new(axum::body::Body::new(body))
    } else {
        // A compressed error body cannot be scrubbed (and could re-expand into
        // echoed credential material on the client), so it is withheld whole.
        // Providers should not compress in the first place: `accept-encoding`
        // is stripped from forwarded requests.
        let compressed = provider_response_is_encoded(&parts.headers);
        let mut buffered = bytes::BytesMut::new();
        let mut overflow = compressed;
        let mut body = body;
        while !overflow {
            let Some(frame) = body.frame().await else {
                break;
            };
            let Ok(frame) = frame else {
                break;
            };
            if let Some(data) = frame.data_ref() {
                if buffered.len() + data.len() > MAX_PROVIDER_PASSTHROUGH_ERROR_BYTES {
                    overflow = true;
                    break;
                }
                buffered.extend_from_slice(data);
            }
        }
        let body: axum::body::Body = if overflow {
            error_body_withheld = true;
            axum::body::Body::from(withheld_provider_error_body())
        } else {
            let safe_body = match std::str::from_utf8(&buffered) {
                Ok(text) => redact_sensitive_tokens(text).into_bytes(),
                Err(_) => buffered.to_vec(),
            };
            axum::body::Body::from(safe_body)
        };
        if overflow {
            parts.headers.remove(header::CONTENT_ENCODING);
        }
        Response::new(body)
    };
    *response.status_mut() = parts.status;
    let preserved_headers =
        sdkwork_cloudrouter_http::preserve_safe_upstream_response_headers(&parts.headers);
    for (name, value) in preserved_headers.iter() {
        response.headers_mut().append(name.clone(), value.clone());
    }
    if parts.status.is_success() {
        if let Some(content_type) = content_type {
            if let Ok(value) = HeaderValue::from_str(content_type.as_str()) {
                response.headers_mut().insert(header::CONTENT_TYPE, value);
            }
        }
        for value in parts.headers.get_all(header::CONTENT_ENCODING).iter() {
            response
                .headers_mut()
                .append(header::CONTENT_ENCODING, value.clone());
        }
    } else {
        response.headers_mut().remove(header::CONTENT_LENGTH);
        response.headers_mut().remove(header::CONTENT_ENCODING);
        let content_type = if error_body_withheld {
            Some("application/json")
        } else {
            content_type.as_deref()
        };
        if let Some(content_type) = content_type {
            if let Ok(value) = HeaderValue::from_str(content_type) {
                response.headers_mut().insert(header::CONTENT_TYPE, value);
            }
        }
    }
    response
}

fn redact_sensitive_tokens(message: &str) -> String {
    sdkwork_cloudrouter_router_service::redaction::redact_sensitive_tokens(message)
}

fn should_forward_provider_request_header(
    name: &HeaderName,
    connection_header_names: &HashSet<String>,
    configured_header_names: &HashSet<String>,
) -> bool {
    !is_hop_by_hop_header(name)
        && !connection_header_names.contains(name.as_str())
        && !configured_header_names.contains(name.as_str())
        && !crate::invocation_dispatcher::is_gateway_owned_request_header(name)
        && name != header::HOST
        && name != header::AUTHORIZATION
        && name != header::CONTENT_LENGTH
        && name != header::COOKIE
        // Error responses are scrubbed in clear text before passthrough; a
        // compressed upstream response could hide echoed credentials from the
        // redaction pass, so compression is never solicited.
        && name != header::ACCEPT_ENCODING
        && name.as_str() != "x-api-key"
        && name.as_str() != "x-goog-api-key"
        && name.as_str() != "x-forwarded-host"
        && name.as_str() != "x-forwarded-proto"
        && name.as_str() != "x-forwarded-for"
        && name.as_str() != "forwarded"
        && name.as_str() != "x-real-ip"
}

fn connection_header_names(headers: &HeaderMap) -> HashSet<String> {
    headers
        .get_all(header::CONNECTION)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(','))
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty())
        .collect()
}

fn provider_response_is_encoded(headers: &HeaderMap) -> bool {
    headers
        .get_all(header::CONTENT_ENCODING)
        .iter()
        .any(|value| {
            value.to_str().map_or(true, |value| {
                value.split(',').any(|encoding| {
                    let encoding = encoding.trim();
                    !encoding.is_empty() && !encoding.eq_ignore_ascii_case("identity")
                })
            })
        })
}

fn is_hop_by_hop_header(name: &HeaderName) -> bool {
    matches!(
        name.as_str(),
        "connection"
            | "keep-alive"
            | "proxy-authenticate"
            | "proxy-authorization"
            | "te"
            | "trailer"
            | "transfer-encoding"
            | "upgrade"
    )
}

#[cfg(test)]
mod tests {
    use super::{
        ProviderPassthroughTarget, build_provider_passthrough_client,
        forward_provider_passthrough_to_target, should_forward_provider_request_header,
    };
    use axum::Router;
    use axum::http::{HeaderName, HeaderValue, Request, header};
    use axum::routing::post;
    use bytes::Bytes;
    use sdkwork_cloudrouter_config::ProviderPassthroughAuth;
    use sdkwork_cloudrouter_router_service::infrastructure::provider::ProviderRelayHttpPoolConfig;
    use sdkwork_cloudrouter_security::OutboundTargetPolicy;
    use std::collections::HashSet;
    use std::time::Duration;

    /// Regression pin: the upstream URI is a naive `base_url + path` concatenation.
    ///
    /// The catalog publishes the *host* and the protocol *path prefix* separately
    /// (`models/<vendor>/<region>/vendor.json -> protocolBaseUrls.<protocol>`), e.g.
    /// DeepSeek's Anthropic face is `host: api.deepseek.com, pathPrefix: /anthropic`.
    /// The runtime only carries the endpoint `base_url` (the bare host), so the
    /// prefix must be present in `base_url` for the composed URL to be the vendor's
    /// real endpoint. This test pins the composition so a future change to either
    /// side is visible instead of silently producing a 404 upstream.
    #[test]
    fn build_uri_is_base_url_concatenated_with_path() {
        let bare_host = ProviderPassthroughTarget::new(
            "deepseek",
            "https://api.deepseek.com",
            ProviderPassthroughAuth::bearer("provider-secret").unwrap(),
            Vec::new(),
        );
        // No `/anthropic` prefix on base_url -> the Anthropic Messages call lands on
        // the vendor root, not the Anthropic-compatible surface.
        assert_eq!(
            "https://api.deepseek.com/v1/messages",
            bare_host.build_uri("/v1/messages").unwrap().to_string()
        );

        let prefixed = ProviderPassthroughTarget::new(
            "deepseek",
            "https://api.deepseek.com/anthropic",
            ProviderPassthroughAuth::bearer("provider-secret").unwrap(),
            Vec::new(),
        );
        // Prefix present -> the vendor's real Anthropic surface.
        assert_eq!(
            "https://api.deepseek.com/anthropic/v1/messages",
            prefixed.build_uri("/v1/messages").unwrap().to_string()
        );
    }

    /// `normalize_openai_compatible_path` strips a leading `/v1` from the inbound
    /// path when the base_url already carries the OpenAI-family version segment
    /// (see `build_uri_is_base_url_concatenated_with_path` for why the composed
    /// URL is a plain concatenation). Every catalog prefix is recognised, not
    /// only `/v1`: `/compatible-mode/v1`, `/api/v3`, `/v2`, `/api/paas/v4` and
    /// `/v1beta/openai` all embed the version, so appending the inbound `/v1`
    /// would produce a path the vendor does not serve. A bare-host base_url
    /// keeps the inbound `/v1`, which is what the vendor wants.
    #[test]
    fn normalize_openai_compatible_path_depends_on_base_url_shape() {
        let with_v1 = ProviderPassthroughTarget::new(
            "openai",
            "https://api.openai.com/v1",
            ProviderPassthroughAuth::bearer("provider-secret").unwrap(),
            Vec::new(),
        );
        assert!(with_v1.base_url_carries_version_prefix());
        assert_eq!(
            "/chat/completions",
            with_v1.normalize_openai_compatible_path("/v1/chat/completions")
        );

        let bare = ProviderPassthroughTarget::new(
            "deepseek",
            "https://api.deepseek.com",
            ProviderPassthroughAuth::bearer("provider-secret").unwrap(),
            Vec::new(),
        );
        assert!(!bare.base_url_carries_version_prefix());
        assert_eq!(
            "/v1/chat/completions",
            bare.normalize_openai_compatible_path("/v1/chat/completions")
        );

        // Alibaba's real OpenAI-compatible prefix also ends in `/v1`, so it is
        // recognised and the inbound `/v1` is stripped -> no duplicated segment.
        let compatible_mode = ProviderPassthroughTarget::new(
            "alibaba",
            "https://dashscope.aliyuncs.com/compatible-mode/v1",
            ProviderPassthroughAuth::bearer("provider-secret").unwrap(),
            Vec::new(),
        );
        assert!(compatible_mode.base_url_carries_version_prefix());
        assert_eq!(
            "/chat/completions",
            compatible_mode.normalize_openai_compatible_path("/v1/chat/completions")
        );

        // The remaining published prefixes do not end in `/v1`, but they are
        // still complete OpenAI base URLs: ByteDance Ark `/api/v3`, Baidu
        // Qianfan `/v2`, Zhipu `/api/paas/v4`, Gemini `/v1beta/openai`.
        for (provider, base_url) in [
            ("bytedance", "https://ark.cn-beijing.volces.com/api/v3"),
            ("baidu", "https://qianfan.baidubce.com/v2"),
            ("zhipu", "https://open.bigmodel.cn/api/paas/v4"),
            (
                "gemini",
                "https://generativelanguage.googleapis.com/v1beta/openai",
            ),
        ] {
            let target = ProviderPassthroughTarget::new(
                provider,
                base_url,
                ProviderPassthroughAuth::bearer("provider-secret").unwrap(),
                Vec::new(),
            );
            assert!(
                target.base_url_carries_version_prefix(),
                "{base_url} carries its version segment"
            );
            assert_eq!(
                "/chat/completions",
                target.normalize_openai_compatible_path("/v1/chat/completions"),
                "{base_url} must not append the inbound /v1 again"
            );
        }

        // An Anthropic surface prefix is not a version prefix: the Anthropic
        // SDK supplies `/v1`, so the inbound segment stays.
        let anthropic = ProviderPassthroughTarget::new(
            "deepseek",
            "https://api.deepseek.com/anthropic",
            ProviderPassthroughAuth::bearer("provider-secret").unwrap(),
            Vec::new(),
        );
        assert!(!anthropic.base_url_carries_version_prefix());
        assert_eq!(
            "/v1/messages",
            anthropic.normalize_openai_compatible_path("/v1/messages")
        );
    }

    #[tokio::test]
    async fn production_policy_rejects_local_target_before_forwarding_body_or_credentials() {
        let target = ProviderPassthroughTarget::new(
            "test-provider",
            "http://127.0.0.1:8080",
            ProviderPassthroughAuth::bearer("provider-secret").unwrap(),
            Vec::new(),
        );
        let (parts, _) = Request::builder()
            .method("POST")
            .uri("/test-provider/v1/invoke")
            .body(())
            .unwrap()
            .into_parts();
        let upstream_uri = "http://127.0.0.1:8080/v1/invoke".parse().unwrap();

        let error = forward_provider_passthrough_to_target(
            &build_provider_passthrough_client(
                OutboundTargetPolicy::Production,
                ProviderRelayHttpPoolConfig::default(),
                None,
            ),
            OutboundTargetPolicy::Production,
            parts,
            Bytes::from_static(b"request-body-must-not-be-forwarded"),
            &target,
            upstream_uri,
            Duration::from_secs(1),
        )
        .await
        .unwrap_err();

        assert_eq!(
            "provider passthrough target violates the outbound target policy",
            error
        );
    }

    #[test]
    fn development_policy_allows_explicit_local_http_target() {
        let uri = "http://127.0.0.1:8080/v1/invoke".parse().unwrap();
        assert!(
            super::validate_provider_passthrough_target(&uri, OutboundTargetPolicy::Development)
                .is_ok()
        );
    }

    #[test]
    fn provider_passthrough_does_not_forward_gateway_or_upstream_cookies() {
        let connection_header_names = HashSet::new();
        let configured_header_names = HashSet::new();

        assert!(!should_forward_provider_request_header(
            &header::COOKIE,
            &connection_header_names,
            &configured_header_names,
        ));
        for name in [
            "access-token",
            "x-sdkwork-internal-tenant-id",
            "idempotency-key",
            "x-forwarded-port",
        ] {
            assert!(
                !should_forward_provider_request_header(
                    &HeaderName::from_static(name),
                    &connection_header_names,
                    &configured_header_names,
                ),
                "{name} must not reach an upstream provider"
            );
        }
        assert!(should_forward_provider_request_header(
            &header::ACCEPT,
            &connection_header_names,
            &configured_header_names,
        ));
        // Content metadata is carried separately: the passthrough re-inserts the
        // upstream content type explicitly (both for success and scrubbed error
        // bodies), so the generic metadata predicate must not forward a second
        // copy of it.
        let mut response_headers = axum::http::HeaderMap::new();
        response_headers.insert(header::SET_COOKIE, HeaderValue::from_static("secret"));
        response_headers.insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json"),
        );
        response_headers.insert("x-request-id", HeaderValue::from_static("request-1"));
        let preserved =
            sdkwork_cloudrouter_http::preserve_safe_upstream_response_headers(&response_headers);
        assert!(!preserved.contains_key(header::SET_COOKIE));
        assert!(!preserved.contains_key(header::CONTENT_TYPE));
        assert_eq!(
            Some("request-1"),
            preserved.get("x-request-id").and_then(|v| v.to_str().ok())
        );
    }

    #[test]
    fn identity_content_encoding_does_not_disable_error_redaction() {
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(header::CONTENT_ENCODING, "identity".parse().unwrap());
        assert!(!super::provider_response_is_encoded(&headers));

        headers.append(header::CONTENT_ENCODING, "gzip".parse().unwrap());
        assert!(super::provider_response_is_encoded(&headers));
    }

    #[tokio::test]
    async fn passthrough_request_timeout_bounds_wait_for_upstream_headers() {
        let upstream = Router::new().route(
            "/v1/invoke",
            post(|| async {
                tokio::time::sleep(Duration::from_millis(250)).await;
                "late response"
            }),
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind test upstream");
        let address = listener.local_addr().expect("test upstream address");
        let server = tokio::spawn(async move {
            axum::serve(listener, upstream)
                .await
                .expect("serve test upstream");
        });
        let target = ProviderPassthroughTarget::new(
            "test-provider",
            format!("http://{address}"),
            ProviderPassthroughAuth::bearer("provider-secret").expect("test provider auth"),
            Vec::new(),
        );
        let (parts, _) = Request::builder()
            .method("POST")
            .uri("/test-provider/v1/invoke")
            .body(())
            .expect("test passthrough request")
            .into_parts();
        let upstream_uri = format!("http://{address}/v1/invoke")
            .parse()
            .expect("test upstream URI");

        let error = forward_provider_passthrough_to_target(
            &build_provider_passthrough_client(
                OutboundTargetPolicy::Development,
                ProviderRelayHttpPoolConfig::default(),
                None,
            ),
            OutboundTargetPolicy::Development,
            parts,
            Bytes::new(),
            &target,
            upstream_uri,
            Duration::from_millis(25),
        )
        .await
        .expect_err("slow upstream headers must respect the configured timeout");

        assert!(error.contains("timed out after 25 ms"));
        server.abort();
    }

    async fn spawn_upstream(
        upstream: Router,
    ) -> (std::net::SocketAddr, tokio::task::JoinHandle<()>) {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind test upstream");
        let address = listener.local_addr().expect("test upstream address");
        let server = tokio::spawn(async move {
            axum::serve(listener, upstream)
                .await
                .expect("serve test upstream");
        });
        (address, server)
    }

    /// Regression pin: a provider that echoes the (gateway-injected) upstream
    /// credential in a non-success body must not leak it through the
    /// passthrough path; the body is scrubbed with the shared redaction pass
    /// while the upstream status code is preserved.
    #[tokio::test]
    async fn passthrough_error_bodies_are_redacted_before_forwarding() {
        let leaked = "sk-gateway-secret-1234567890";
        let upstream = Router::new().route(
            "/v1/invoke",
            post(move || async move {
                (
                    axum::http::StatusCode::UNAUTHORIZED,
                    format!("Incorrect API key provided: {leaked}"),
                )
            }),
        );
        let (address, server) = spawn_upstream(upstream).await;
        let target = ProviderPassthroughTarget::new(
            "test-provider",
            format!("http://{address}"),
            ProviderPassthroughAuth::bearer("provider-secret").expect("test provider auth"),
            Vec::new(),
        );
        let (parts, _) = Request::builder()
            .method("POST")
            .uri("/test-provider/v1/invoke")
            .body(())
            .expect("test passthrough request")
            .into_parts();
        let upstream_uri = format!("http://{address}/v1/invoke")
            .parse()
            .expect("test upstream URI");

        let response = forward_provider_passthrough_to_target(
            &build_provider_passthrough_client(
                OutboundTargetPolicy::Development,
                ProviderRelayHttpPoolConfig::default(),
                None,
            ),
            OutboundTargetPolicy::Development,
            parts,
            Bytes::new(),
            &target,
            upstream_uri,
            Duration::from_secs(5),
        )
        .await
        .expect("forwarding must succeed");

        assert_eq!(response.status(), axum::http::StatusCode::UNAUTHORIZED);
        let body = axum::body::to_bytes(response.into_body(), 64 * 1024)
            .await
            .expect("read redacted body");
        let body = String::from_utf8(body.to_vec()).expect("body is utf-8");
        assert!(!body.contains(leaked), "leaked credential in body: {body}");
        assert!(body.contains("[REDACTED]"), "body must be scrubbed: {body}");
        server.abort();
    }

    /// Regression pin: success responses keep streaming through unchanged
    /// (no buffering, no body rewrite).
    #[tokio::test]
    async fn passthrough_success_bodies_stream_through_unchanged() {
        let upstream = Router::new().route(
            "/v1/invoke",
            post(|| async {
                axum::Json(serde_json::json!({
                    "choices": [{"message": {"role": "assistant", "content": "ok"}}]
                }))
            }),
        );
        let (address, server) = spawn_upstream(upstream).await;
        let target = ProviderPassthroughTarget::new(
            "test-provider",
            format!("http://{address}"),
            ProviderPassthroughAuth::bearer("provider-secret").expect("test provider auth"),
            Vec::new(),
        );
        let (parts, _) = Request::builder()
            .method("POST")
            .uri("/test-provider/v1/invoke")
            .body(())
            .expect("test passthrough request")
            .into_parts();
        let upstream_uri = format!("http://{address}/v1/invoke")
            .parse()
            .expect("test upstream URI");

        let response = forward_provider_passthrough_to_target(
            &build_provider_passthrough_client(
                OutboundTargetPolicy::Development,
                ProviderRelayHttpPoolConfig::default(),
                None,
            ),
            OutboundTargetPolicy::Development,
            parts,
            Bytes::new(),
            &target,
            upstream_uri,
            Duration::from_secs(5),
        )
        .await
        .expect("forwarding must succeed");

        assert!(response.status().is_success());
        let body = axum::body::to_bytes(response.into_body(), 64 * 1024)
            .await
            .expect("read forwarded body");
        let body: serde_json::Value = serde_json::from_slice(&body).expect("json body");
        assert_eq!(
            body["choices"][0]["message"]["content"],
            serde_json::Value::String("ok".to_owned())
        );
        server.abort();
    }

    #[tokio::test]
    async fn passthrough_success_preserves_content_encoding_and_raw_bytes() {
        use std::sync::{Arc, Mutex};

        let compressed_body = vec![
            0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff, 0xcb, 0x48, 0xcd, 0xc9,
            0xc9, 0xe7, 0x02, 0x00, 0x20, 0x30, 0x3a, 0x36, 0x06, 0x00, 0x00, 0x00,
        ];
        let upstream_body = compressed_body.clone();
        let observed_encoding = Arc::new(Mutex::new(None));
        let upstream_observed_encoding = Arc::clone(&observed_encoding);
        let upstream = Router::new().route(
            "/v1/invoke",
            post(move |request: axum::extract::Request| {
                let body = upstream_body.clone();
                async move {
                    *upstream_observed_encoding.lock().expect("encoding lock") = request
                        .headers()
                        .get(header::ACCEPT_ENCODING)
                        .and_then(|value| value.to_str().ok())
                        .map(str::to_owned);
                    let mut response = axum::response::Response::new(axum::body::Body::from(body));
                    response.headers_mut().insert(
                        header::CONTENT_TYPE,
                        "application/json".parse().expect("content type"),
                    );
                    response.headers_mut().append(
                        header::CONTENT_ENCODING,
                        "gzip".parse().expect("content encoding"),
                    );
                    response
                }
            }),
        );
        let (address, server) = spawn_upstream(upstream).await;
        let target = ProviderPassthroughTarget::new(
            "test-provider",
            format!("http://{address}"),
            ProviderPassthroughAuth::bearer("provider-secret").expect("test provider auth"),
            Vec::new(),
        );
        let (parts, _) = Request::builder()
            .method("POST")
            .uri("/test-provider/v1/invoke")
            .body(())
            .expect("test passthrough request")
            .into_parts();
        let upstream_uri = format!("http://{address}/v1/invoke")
            .parse()
            .expect("test upstream URI");

        let response = forward_provider_passthrough_to_target(
            &build_provider_passthrough_client(
                OutboundTargetPolicy::Development,
                ProviderRelayHttpPoolConfig::default(),
                None,
            ),
            OutboundTargetPolicy::Development,
            parts,
            Bytes::new(),
            &target,
            upstream_uri,
            Duration::from_secs(5),
        )
        .await
        .expect("forwarding must succeed");

        assert_eq!(
            Some("identity".to_owned()),
            *observed_encoding.lock().expect("encoding lock")
        );
        assert_eq!(
            "gzip",
            response
                .headers()
                .get(header::CONTENT_ENCODING)
                .expect("encoding metadata must match the raw body")
        );
        let body = axum::body::to_bytes(response.into_body(), 64 * 1024)
            .await
            .expect("read forwarded body");
        assert_eq!(compressed_body, body.as_ref());
        server.abort();
    }
}
