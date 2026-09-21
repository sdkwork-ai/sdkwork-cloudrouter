use crate::invocation_dispatcher::OutboundConnector;
use axum::body::{Body, Bytes, HttpBody};
use axum::http::header::{self, HeaderName, HeaderValue};
use axum::http::request::{Builder as RequestBuilder, Parts as RequestParts};
use axum::http::uri::PathAndQuery;
use axum::http::{HeaderMap, Uri};
use axum::response::Response;
use http_body::Frame;
use http_body_util::Full;
use hyper::Request as HyperRequest;
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::proxy::Tunnel;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sdkwork_cloudrouter_config::{
    ProviderPassthroughAuth, ProviderPassthroughAuthType, ProviderPassthroughHeader,
};
use sdkwork_cloudrouter_http::ensure_rustls_crypto_provider;
use sdkwork_cloudrouter_http::{upsert_query_parameter, OutboundDnsResolver};
use sdkwork_cloudrouter_router_service::infrastructure::provider::ProviderRelayHttpPoolConfig;
use sdkwork_cloudrouter_security::{validate_outbound_url, OutboundTargetPolicy};
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

    pub(crate) fn base_url_has_openai_v1_prefix(&self) -> bool {
        self.base_url
            .parse::<Uri>()
            .ok()
            .map(|uri| {
                let path = uri.path().trim_end_matches('/');
                path == "/v1" || path.ends_with("/v1")
            })
            .unwrap_or(false)
    }

    pub(crate) fn normalize_openai_compatible_path(&self, path: &str) -> String {
        if self.base_url_has_openai_v1_prefix() {
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
        upstream_to_axum_response(upstream_response),
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
    Response::from_parts(
        parts,
        apply_stream_deadlines_to_body(body, total_timeout),
    )
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

fn upstream_to_axum_response(
    upstream_response: hyper::Response<hyper::body::Incoming>,
) -> Response {
    let (parts, body) = upstream_response.into_parts();
    let mut response = Response::new(axum::body::Body::new(body));
    *response.status_mut() = parts.status;
    let connection_header_names = connection_header_names(&parts.headers);
    for (name, value) in parts.headers.iter() {
        if should_forward_provider_response_header(name, &connection_header_names) {
            response.headers_mut().append(name, value.clone());
        }
    }
    response
}

fn should_forward_provider_request_header(
    name: &HeaderName,
    connection_header_names: &HashSet<String>,
    configured_header_names: &HashSet<String>,
) -> bool {
    !is_hop_by_hop_header(name)
        && !connection_header_names.contains(name.as_str())
        && !configured_header_names.contains(name.as_str())
        && name != header::HOST
        && name != header::AUTHORIZATION
        && name != header::CONTENT_LENGTH
        && name != header::COOKIE
        && name.as_str() != "x-api-key"
        && name.as_str() != "x-goog-api-key"
        && name.as_str() != "x-forwarded-host"
        && name.as_str() != "x-forwarded-proto"
        && name.as_str() != "x-forwarded-for"
        && name.as_str() != "forwarded"
        && name.as_str() != "x-real-ip"
}

fn should_forward_provider_response_header(
    name: &HeaderName,
    connection_header_names: &HashSet<String>,
) -> bool {
    !is_hop_by_hop_header(name)
        && !connection_header_names.contains(name.as_str())
        && name != header::CONTENT_LENGTH
        && name != header::TRANSFER_ENCODING
        && name != header::SET_COOKIE
        && !name.as_str().starts_with("access-control-")
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
        build_provider_passthrough_client, forward_provider_passthrough_to_target,
        should_forward_provider_request_header, should_forward_provider_response_header,
        ProviderPassthroughTarget,
    };
    use axum::http::{header, Request};
    use axum::routing::post;
    use axum::Router;
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
    /// path **only when the base_url already ends with `/v1`** (see
    /// `build_uri_is_base_url_concatenated_with_path` for why the composed URL is a
    /// plain concatenation). `Uri::path()` keeps the trailing segment, so all of
    /// `.../v1`, `.../compatible-mode/v1` and `.../v1beta/openai/v1` are recognised.
    /// A bare-host base_url keeps the inbound `/v1`, which is what the vendor wants.
    #[test]
    fn normalize_openai_compatible_path_depends_on_base_url_shape() {
        let with_v1 = ProviderPassthroughTarget::new(
            "openai",
            "https://api.openai.com/v1",
            ProviderPassthroughAuth::bearer("provider-secret").unwrap(),
            Vec::new(),
        );
        assert!(with_v1.base_url_has_openai_v1_prefix());
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
        assert!(!bare.base_url_has_openai_v1_prefix());
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
        assert!(compatible_mode.base_url_has_openai_v1_prefix());
        assert_eq!(
            "/chat/completions",
            compatible_mode.normalize_openai_compatible_path("/v1/chat/completions")
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
        assert!(super::validate_provider_passthrough_target(
            &uri,
            OutboundTargetPolicy::Development
        )
        .is_ok());
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
        assert!(!should_forward_provider_response_header(
            &header::SET_COOKIE,
            &connection_header_names,
        ));
        assert!(should_forward_provider_request_header(
            &header::ACCEPT,
            &connection_header_names,
            &configured_header_names,
        ));
        assert!(should_forward_provider_response_header(
            &header::CONTENT_TYPE,
            &connection_header_names,
        ));
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
}
