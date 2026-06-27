use std::collections::HashSet;
use std::time::Duration;

use axum::body::Body as AxumBody;
use axum::http::header::{self, HeaderName, HeaderValue};
use axum::http::request::Builder as RequestBuilder;
use axum::http::Uri;
use bytes::Bytes;
use http_body_util::BodyExt;
use http_body_util::Full;
use hyper::Request as HyperRequest;
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sdkwork_clawrouter_router_service::application::{
    Invocation, InvocationAccount, InvocationBody, InvocationDispatchResponse,
};
use sdkwork_clawrouter_router_service::ports::{
    InvocationDispatchError, InvocationDispatcher, InvocationDispatcherFuture,
};

const INVOCATION_UPSTREAM_BODY_LIMIT_BYTES: usize = 32 * 1024 * 1024;
const DEFAULT_DISPATCH_TIMEOUT_MS: u64 = 30_000;

type InvocationHttpBody = Full<Bytes>;
type InvocationHttpConnector = HttpsConnector<HttpConnector>;
type InvocationHttpClient = Client<InvocationHttpConnector, InvocationHttpBody>;

#[derive(Clone)]
pub struct InvocationHttpDispatcher {
    client: InvocationHttpClient,
}

impl InvocationHttpDispatcher {
    pub fn new() -> Self {
        Self {
            client: build_invocation_http_client(),
        }
    }
}

impl Default for InvocationHttpDispatcher {
    fn default() -> Self {
        Self::new()
    }
}

impl InvocationDispatcher for InvocationHttpDispatcher {
    fn dispatch<'a>(
        &'a self,
        invocation: &'a Invocation,
        account: &'a InvocationAccount,
    ) -> InvocationDispatcherFuture<'a> {
        Box::pin(async move {
            let provider_request =
                invocation
                    .dispatch
                    .provider_request
                    .as_ref()
                    .ok_or_else(|| {
                        dispatch_error(
                            "provider_request_missing",
                            "invocation dispatch requires transformed provider request",
                            None,
                            false,
                        )
                    })?;
            let uri = provider_request
                .url
                .as_deref()
                .ok_or_else(|| {
                    dispatch_error(
                        "provider_url_missing",
                        format!(
                            "invocation route {}:{} is missing provider URL",
                            account.provider_code, account.channel_id
                        ),
                        None,
                        false,
                    )
                })?
                .parse::<Uri>()
                .map_err(|error| {
                    dispatch_error(
                        "invalid_provider_url",
                        format!("provider URL is invalid: {error}"),
                        None,
                        false,
                    )
                })?;

            let request = build_upstream_request(provider_request, uri)?;
            let response = execute_with_optional_timeout(
                account,
                "provider HTTP request",
                self.client.request(request),
            )
            .await?
            .map_err(|error| {
                dispatch_error(
                    "provider_http_transport_failed",
                    format!("provider HTTP request failed: {error}"),
                    None,
                    true,
                )
            })?;

            let status_code = response.status().as_u16();
            let content_type = response
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_owned);

            let is_sse_stream = content_type.as_deref().is_some_and(|ct| {
                let ct_lower = ct.to_lowercase();
                ct_lower.starts_with("text/event-stream")
                    || ct_lower.starts_with("application/x-ndjson")
            });

            if is_sse_stream {
                // For SSE streaming responses, don't buffer — pass the body through
                let (_, body) = response.into_parts();
                let stream_body = AxumBody::new(body);
                return Ok(InvocationDispatchResponse::streaming(
                    status_code,
                    content_type,
                    stream_body,
                ));
            }

            let body = execute_with_optional_timeout(
                account,
                "provider response body",
                response.into_body().collect(),
            )
            .await?
            .map_err(|error| {
                dispatch_error(
                    "provider_http_body_failed",
                    format!("failed to read provider response body: {error}"),
                    Some(status_code),
                    true,
                )
            })?
            .to_bytes();

            if body.is_empty() {
                return Ok(InvocationDispatchResponse::empty(status_code));
            }
            if body.len() > INVOCATION_UPSTREAM_BODY_LIMIT_BYTES {
                return Err(dispatch_error(
                    "provider_response_too_large",
                    format!(
                        "provider response body exceeds {} bytes",
                        INVOCATION_UPSTREAM_BODY_LIMIT_BYTES
                    ),
                    Some(status_code),
                    false,
                ));
            }
            if response_body_should_parse_json(content_type.as_deref(), &body) {
                let body = serde_json::from_slice::<serde_json::Value>(&body).map_err(|error| {
                    dispatch_error(
                        "provider_json_invalid",
                        format!("provider JSON response is invalid: {error}"),
                        Some(status_code),
                        false,
                    )
                })?;
                let mut response = InvocationDispatchResponse::json(status_code, body);
                response.content_type = content_type;
                return Ok(response);
            }

            Ok(InvocationDispatchResponse::bytes(
                status_code,
                body.to_vec(),
                content_type,
            ))
        })
    }
}

async fn execute_with_optional_timeout<F, T>(
    account: &InvocationAccount,
    operation: &'static str,
    future: F,
) -> Result<T, InvocationDispatchError>
where
    F: std::future::Future<Output = T>,
{
    let Some(timeout) = account
        .timeout_ms
        .and_then(timeout_duration)
        .or_else(|| timeout_duration(DEFAULT_DISPATCH_TIMEOUT_MS))
    else {
        return Ok(future.await);
    };
    tokio::time::timeout(timeout, future).await.map_err(|_| {
        dispatch_error(
            "provider_http_timeout",
            format!(
                "{operation} timed out after {} ms for invocation route {}:{}",
                timeout.as_millis(),
                account.provider_code,
                account.channel_id
            ),
            None,
            true,
        )
    })
}

fn timeout_duration(timeout_ms: u64) -> Option<Duration> {
    (timeout_ms > 0).then(|| Duration::from_millis(timeout_ms))
}

fn build_invocation_http_client() -> InvocationHttpClient {
    let connector = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_or_http()
        .enable_http1()
        .build();
    Client::builder(TokioExecutor::new()).build(connector)
}

fn build_upstream_request(
    provider_request: &sdkwork_clawrouter_router_service::application::InvocationProviderRequest,
    uri: Uri,
) -> Result<HyperRequest<InvocationHttpBody>, InvocationDispatchError> {
    let mut builder = HyperRequest::builder()
        .method(provider_request.method.clone())
        .uri(uri);
    let connection_header_names = connection_header_names(&provider_request.headers);
    for (name, value) in provider_request.headers.iter() {
        if should_forward_header(name, &connection_header_names) {
            builder = builder.header(name, value);
        }
    }
    builder = apply_body_content_type(builder, &provider_request.body)?;
    builder
        .body(Full::new(body_bytes(&provider_request.body)?))
        .map_err(|error| {
            dispatch_error(
                "provider_request_build_failed",
                format!("failed to build provider request: {error}"),
                None,
                false,
            )
        })
}

fn apply_body_content_type(
    mut builder: RequestBuilder,
    body: &InvocationBody,
) -> Result<RequestBuilder, InvocationDispatchError> {
    let content_type_missing = builder
        .headers_ref()
        .and_then(|headers| headers.get(header::CONTENT_TYPE))
        .is_none();
    if matches!(body, InvocationBody::Json(_)) && content_type_missing {
        builder = builder.header(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/json"),
        );
    }
    Ok(builder)
}

fn body_bytes(body: &InvocationBody) -> Result<Bytes, InvocationDispatchError> {
    match body {
        InvocationBody::Empty => Ok(Bytes::new()),
        InvocationBody::Json(value) => {
            serde_json::to_vec(value).map(Bytes::from).map_err(|error| {
                dispatch_error(
                    "provider_request_json_failed",
                    format!("failed to serialize provider JSON request body: {error}"),
                    None,
                    false,
                )
            })
        }
        InvocationBody::Bytes(value) => Ok(Bytes::from(value.clone())),
    }
}

fn response_body_should_parse_json(content_type: Option<&str>, bytes: &[u8]) -> bool {
    content_type
        .map(|value| value.to_ascii_lowercase().contains("application/json"))
        .unwrap_or_else(|| {
            let first = bytes
                .iter()
                .copied()
                .skip_while(u8::is_ascii_whitespace)
                .next();
            matches!(first, Some(b'{') | Some(b'['))
        })
}

fn should_forward_header(name: &HeaderName, connection_header_names: &HashSet<String>) -> bool {
    !is_hop_by_hop_header(name)
        && !connection_header_names.contains(name.as_str())
        && name != header::HOST
        && name != header::CONTENT_LENGTH
}

fn connection_header_names(headers: &axum::http::HeaderMap) -> HashSet<String> {
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

fn dispatch_error(
    code: impl Into<String>,
    message: impl Into<String>,
    status_code: Option<u16>,
    retryable: bool,
) -> InvocationDispatchError {
    InvocationDispatchError::new(code, message, status_code, retryable)
}
