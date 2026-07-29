use std::time::Duration;

use axum::body::Body;
use bytes::Bytes;
use http_body_util::Full;
use hyper::header::{HeaderName, HeaderValue, CONTENT_TYPE};
use hyper::{Request, Uri};
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sdkwork_claw_config::InternalGatewaySecurityConfig;
use sdkwork_claw_security::{
    InternalGatewayRequestSigner, SignedInternalGatewayRequest, INTERNAL_GATEWAY_ROUTE_PREFIX,
    X_SDKWORK_INTERNAL_ACCOUNT_GROUP_ID, X_SDKWORK_INTERNAL_API_KEY_ID,
    X_SDKWORK_INTERNAL_AUTH_VERSION, X_SDKWORK_INTERNAL_BODY_SHA256, X_SDKWORK_INTERNAL_EXPIRES_AT,
    X_SDKWORK_INTERNAL_ISSUED_AT, X_SDKWORK_INTERNAL_NONCE, X_SDKWORK_INTERNAL_ORGANIZATION_ID,
    X_SDKWORK_INTERNAL_SIGNATURE, X_SDKWORK_INTERNAL_TENANT_ID, X_SDKWORK_INTERNAL_USER_ID,
};

use crate::domain::{DomainError, DomainResult};
use crate::ports::{
    AppRuntimeFuture, AppRuntimeGatewayClient, AppRuntimeGatewayRequest, AppRuntimeGatewayResponse,
};

type GatewayRequestBody = Full<Bytes>;
type GatewayConnector = HttpsConnector<HttpConnector>;
type GatewayClient = Client<GatewayConnector, GatewayRequestBody>;

pub const DEFAULT_APP_RUNTIME_GATEWAY_TIMEOUT_MILLIS: u64 = 120_000;

#[derive(Clone)]
pub struct AppRuntimeGatewayHttpClient {
    base_url: String,
    client: GatewayClient,
    response_timeout: Duration,
    request_signer: InternalGatewayRequestSigner,
}

impl AppRuntimeGatewayHttpClient {
    pub fn new(
        base_url: impl Into<String>,
        security_config: &InternalGatewaySecurityConfig,
    ) -> DomainResult<Self> {
        Self::with_response_timeout(
            base_url,
            security_config,
            Duration::from_millis(DEFAULT_APP_RUNTIME_GATEWAY_TIMEOUT_MILLIS),
        )
    }

    pub fn with_response_timeout(
        base_url: impl Into<String>,
        security_config: &InternalGatewaySecurityConfig,
        response_timeout: Duration,
    ) -> DomainResult<Self> {
        let base_url = normalize_gateway_base_url(base_url.into())?;
        Ok(Self {
            base_url,
            client: build_gateway_client(),
            response_timeout,
            request_signer: InternalGatewayRequestSigner::new(
                security_config.signing_secret(),
                security_config.request_ttl_seconds(),
            ),
        })
    }
}

impl AppRuntimeGatewayClient for AppRuntimeGatewayHttpClient {
    fn send<'a>(
        &'a self,
        request: AppRuntimeGatewayRequest,
    ) -> AppRuntimeFuture<'a, AppRuntimeGatewayResponse> {
        Box::pin(async move {
            let AppRuntimeGatewayRequest {
                method,
                path,
                headers,
                body,
                raw_body,
                internal_principal,
            } = request;
            let internal_principal = internal_principal.ok_or_else(|| {
                DomainError::new("app runtime gateway internal principal is required")
            })?;
            let body = if let Some(raw_body) = raw_body {
                raw_body
            } else {
                Bytes::from(serde_json::to_vec(&body).map_err(|error| {
                    DomainError::new(format!(
                        "failed to serialize app runtime gateway request: {error}"
                    ))
                })?)
            };
            let internal_path = internal_gateway_path(&path);
            let signed_request = self
                .request_signer
                .sign(internal_principal, method.as_str(), &internal_path, &body)
                .map_err(|error| {
                    DomainError::new(format!(
                        "failed to sign app runtime gateway request: {error}"
                    ))
                })?;
            let uri = gateway_request_uri(&self.base_url, &internal_path)?;
            let mut builder = Request::builder().method(method).uri(uri);
            if !headers
                .keys()
                .any(|name| name.eq_ignore_ascii_case(CONTENT_TYPE.as_str()))
            {
                builder = builder.header(CONTENT_TYPE, "application/json");
            }
            for (name, value) in headers {
                builder = builder.header(
                    parse_gateway_header_name(&name)?,
                    parse_gateway_header_value(&name, &value)?,
                );
            }
            builder = apply_internal_auth_headers(builder, &signed_request);
            let http_request = builder.body(Full::new(body)).map_err(|error| {
                DomainError::new(format!(
                    "failed to build app runtime gateway request: {error}"
                ))
            })?;
            let response =
                tokio::time::timeout(self.response_timeout, self.client.request(http_request))
                    .await
                    .map_err(|_| DomainError::new("app runtime gateway response timed out"))?
                    .map_err(|error| {
                        DomainError::new(format!("app runtime gateway request failed: {error}"))
                    })?;
            let status_code = response.status().as_u16();
            let content_type = response
                .headers()
                .get(CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned);
            Ok(AppRuntimeGatewayResponse::new(
                status_code,
                content_type,
                Body::new(response.into_body()),
            ))
        })
    }
}

fn internal_gateway_path(path: &str) -> String {
    let path = if path.starts_with('/') {
        path.to_owned()
    } else {
        format!("/{path}")
    };
    format!("{INTERNAL_GATEWAY_ROUTE_PREFIX}{path}")
}

fn apply_internal_auth_headers(
    builder: hyper::http::request::Builder,
    signed_request: &SignedInternalGatewayRequest,
) -> hyper::http::request::Builder {
    builder
        .header(X_SDKWORK_INTERNAL_AUTH_VERSION, &signed_request.version)
        .header(
            X_SDKWORK_INTERNAL_API_KEY_ID,
            signed_request.principal.api_key_id,
        )
        .header(
            X_SDKWORK_INTERNAL_TENANT_ID,
            signed_request.principal.tenant_id,
        )
        .header(
            X_SDKWORK_INTERNAL_ORGANIZATION_ID,
            signed_request.principal.organization_id,
        )
        .header(X_SDKWORK_INTERNAL_USER_ID, signed_request.principal.user_id)
        .header(
            X_SDKWORK_INTERNAL_ACCOUNT_GROUP_ID,
            signed_request.principal.account_group_id,
        )
        .header(X_SDKWORK_INTERNAL_ISSUED_AT, signed_request.issued_at)
        .header(X_SDKWORK_INTERNAL_EXPIRES_AT, signed_request.expires_at)
        .header(X_SDKWORK_INTERNAL_NONCE, &signed_request.nonce)
        .header(X_SDKWORK_INTERNAL_BODY_SHA256, &signed_request.body_sha256)
        .header(X_SDKWORK_INTERNAL_SIGNATURE, &signed_request.signature)
}

fn normalize_gateway_base_url(base_url: String) -> DomainResult<String> {
    let base_url = base_url.trim().trim_end_matches('/').to_owned();
    if base_url.is_empty() {
        return Err(DomainError::new("app runtime gateway base URL is required"));
    }
    let uri = base_url.parse::<Uri>().map_err(|error| {
        DomainError::new(format!(
            "app runtime gateway base URL must be an absolute http or https URL: {error}"
        ))
    })?;
    if !matches!(uri.scheme_str(), Some("http" | "https")) || uri.authority().is_none() {
        return Err(DomainError::new(
            "app runtime gateway base URL must be an absolute http or https URL",
        ));
    }
    Ok(base_url)
}

fn gateway_request_uri(base_url: &str, path: &str) -> DomainResult<Uri> {
    let normalized_path = if path.starts_with('/') {
        path.to_owned()
    } else {
        format!("/{path}")
    };
    let base_url = base_url.trim_end_matches('/');
    let url = if base_url.ends_with("/v1") && normalized_path.starts_with("/v1/") {
        format!("{}{}", base_url, normalized_path.trim_start_matches("/v1"))
    } else if base_url.ends_with("/v1") && normalized_path.starts_with("/provider/") {
        format!("{}{}", base_url.trim_end_matches("/v1"), normalized_path)
    } else {
        format!("{base_url}{normalized_path}")
    };
    url.parse()
        .map_err(|error| DomainError::new(format!("invalid app runtime gateway URI: {error}")))
}

fn parse_gateway_header_name(name: &str) -> DomainResult<HeaderName> {
    HeaderName::from_bytes(name.trim().as_bytes()).map_err(|error| {
        DomainError::new(format!(
            "app runtime gateway header name is invalid: {error}"
        ))
    })
}

fn parse_gateway_header_value(name: &str, value: &str) -> DomainResult<HeaderValue> {
    HeaderValue::from_str(value).map_err(|error| {
        DomainError::new(format!(
            "app runtime gateway header {name} value is invalid: {error}"
        ))
    })
}

fn build_gateway_client() -> GatewayClient {
    let connector = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_or_http()
        .enable_http1()
        .build();
    Client::builder(TokioExecutor::new()).build(connector)
}
