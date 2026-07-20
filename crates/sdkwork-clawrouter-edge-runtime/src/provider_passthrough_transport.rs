use axum::http::header::{self, HeaderName, HeaderValue};
use axum::http::request::{Builder as RequestBuilder, Parts as RequestParts};
use axum::http::uri::PathAndQuery;
use axum::http::{HeaderMap, Uri};
use axum::response::Response;
use bytes::Bytes;
use http_body_util::Full;
use hyper::Request as HyperRequest;
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sdkwork_claw_config::{
    ProviderPassthroughAuth, ProviderPassthroughAuthType, ProviderPassthroughHeader,
};
use sdkwork_claw_http::upsert_query_parameter;
use sdkwork_claw_security::{validate_outbound_url, OutboundTargetPolicy};
use sdkwork_clawrouter_router_service::infrastructure::provider::ProviderRelayHttpPoolConfig;
use std::collections::HashSet;
use std::time::Duration;

pub(crate) type PassthroughBody = Full<Bytes>;
pub(crate) type PassthroughConnector = HttpsConnector<HttpConnector>;
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
) -> PassthroughClient {
    let mut http_connector = HttpConnector::new();
    http_connector.set_connect_timeout(Some(pool_config.connect_timeout));
    http_connector.enforce_http(false);
    let connector = match outbound_target_policy {
        OutboundTargetPolicy::Production => hyper_rustls::HttpsConnectorBuilder::new()
            .with_webpki_roots()
            .https_only()
            .enable_http1()
            .wrap_connector(http_connector),
        OutboundTargetPolicy::Development => hyper_rustls::HttpsConnectorBuilder::new()
            .with_webpki_roots()
            .https_or_http()
            .enable_http1()
            .wrap_connector(http_connector),
    };
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
    Ok(upstream_to_axum_response(upstream_response))
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
    use sdkwork_claw_config::ProviderPassthroughAuth;
    use sdkwork_claw_security::OutboundTargetPolicy;
    use sdkwork_clawrouter_router_service::infrastructure::provider::ProviderRelayHttpPoolConfig;
    use std::collections::HashSet;
    use std::time::Duration;

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
            .uri("/provider/test-provider/v1/invoke")
            .body(())
            .unwrap()
            .into_parts();
        let upstream_uri = "http://127.0.0.1:8080/v1/invoke".parse().unwrap();

        let error = forward_provider_passthrough_to_target(
            &build_provider_passthrough_client(
                OutboundTargetPolicy::Production,
                ProviderRelayHttpPoolConfig::default(),
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
            .uri("/provider/test-provider/v1/invoke")
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
