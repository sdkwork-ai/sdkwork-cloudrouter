use std::time::Duration;

use bytes::Bytes;
use http_body_util::{BodyExt, Full, LengthLimitError, Limited};
use hyper::header::{HeaderValue, AUTHORIZATION, CONTENT_LENGTH, CONTENT_TYPE};
use hyper::{Method, Request, Uri};
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sdkwork_claw_http::{ensure_rustls_crypto_provider, OutboundDnsResolver};
use sdkwork_claw_provider_adapter_contract::{
    AdapterInvocationRequest, AdapterInvocationResponse, ProviderAdapterManifest,
};
use sdkwork_claw_provider_adapter_registry::ProviderAdapterRouteConfig;
use sdkwork_claw_security::{
    validate_outbound_base_url, validate_outbound_url, OutboundTargetPolicy,
};

type AdapterRequestBody = Full<Bytes>;
type AdapterConnector = HttpsConnector<HttpConnector<OutboundDnsResolver>>;
type AdapterClient = Client<AdapterConnector, AdapterRequestBody>;

/// Default timeout for adapter HTTP requests (including body read).
const DEFAULT_ADAPTER_TIMEOUT: Duration = Duration::from_secs(120);

/// Default connect timeout for establishing TCP+TLS connections.
const DEFAULT_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// Default idle timeout for pooled keep-alive connections.
const DEFAULT_POOL_IDLE_TIMEOUT: Duration = Duration::from_secs(90);

/// Maximum idle connections kept per host in the connection pool.
const DEFAULT_POOL_MAX_IDLE_PER_HOST: usize = 32;
/// Adapter invocation envelopes are structured control-plane data, not media.
/// Keep their in-memory representation bounded independently of gateway request
/// limits so a faulty internal adapter cannot exhaust a gateway process.
const MAX_ADAPTER_BUFFERED_RESPONSE_BYTES: usize = 4 * 1024 * 1024;
const MAX_ADAPTER_MANIFEST_RESPONSE_BYTES: usize = 1024 * 1024;
const MAX_ADAPTER_ERROR_PREVIEW_BYTES: usize = 64 * 1024;

#[derive(Clone)]
pub struct ProviderAdapterHttpClient {
    client: AdapterClient,
    gateway_token: String,
    outbound_target_policy: OutboundTargetPolicy,
}

/// Result of an adapter invocation — either a buffered JSON response or a
/// streaming body that must not be buffered.
#[derive(Debug)]
pub enum AdapterInvokeResult {
    /// Buffered JSON response from the adapter.
    Buffered(AdapterInvocationResponse),
    /// Streaming SSE/NDJSON response — the body is passed through without
    /// buffering to preserve real-time token streaming semantics.
    Streaming {
        status_code: u16,
        content_type: Option<String>,
        stream_body: axum::body::Body,
    },
}

impl AdapterInvokeResult {
    /// Returns `true` if the result is a streaming response.
    pub fn is_streaming(&self) -> bool {
        matches!(self, Self::Streaming { .. })
    }

    /// Returns the HTTP status code from either variant.
    pub fn status_code(&self) -> u16 {
        match self {
            Self::Buffered(response) => response.status_code,
            Self::Streaming { status_code, .. } => *status_code,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderAdapterHttpError {
    pub status_code: Option<u16>,
    pub message: String,
    pub retryable: bool,
}

impl ProviderAdapterHttpClient {
    /// Maximum wire bytes buffered for a non-streaming adapter response.
    /// Callers that perform process-wide admission use the same authority.
    pub const MAX_BUFFERED_RESPONSE_BYTES: usize = MAX_ADAPTER_BUFFERED_RESPONSE_BYTES;

    pub fn new(gateway_token: impl Into<String>) -> Self {
        Self::with_outbound_target_policy(gateway_token, OutboundTargetPolicy::Production)
    }

    /// Creates an explicit development-only client for local adapter fixtures.
    pub fn for_development(gateway_token: impl Into<String>) -> Self {
        Self::with_outbound_target_policy(gateway_token, OutboundTargetPolicy::Development)
    }

    pub fn with_outbound_target_policy(
        gateway_token: impl Into<String>,
        outbound_target_policy: OutboundTargetPolicy,
    ) -> Self {
        Self {
            client: build_adapter_client(outbound_target_policy),
            gateway_token: gateway_token.into(),
            outbound_target_policy,
        }
    }

    /// Invokes the adapter and returns either a buffered JSON response or a
    /// streaming body, depending on the adapter's response content-type.
    ///
    /// SSE (`text/event-stream`) and NDJSON (`application/x-ndjson`) responses
    /// are returned as [`AdapterInvokeResult::Streaming`] without buffering.
    /// All other responses are buffered and deserialized as JSON.
    pub async fn invoke(
        &self,
        route: &ProviderAdapterRouteConfig,
        request: AdapterInvocationRequest,
    ) -> Result<AdapterInvokeResult, ProviderAdapterHttpError> {
        let uri = adapter_uri(
            route,
            request.invocation.standard_path.as_str(),
            self.outbound_target_policy,
        )?;
        let body = serde_json::to_vec(&request).map_err(|error| {
            ProviderAdapterHttpError::non_retryable(format!(
                "failed to serialize adapter invocation request: {error}"
            ))
        })?;
        let http_request = Request::builder()
            .method(Method::POST)
            .uri(uri)
            .header(CONTENT_TYPE, "application/json")
            .header(AUTHORIZATION, format!("Bearer {}", self.gateway_token))
            .body(Full::new(Bytes::from(body)))
            .map_err(|error| {
                ProviderAdapterHttpError::non_retryable(format!(
                    "failed to build adapter invocation request: {error}"
                ))
            })?;

        // Wrap the entire request (connect + send + receive headers) in a timeout
        // to prevent indefinite hangs on unresponsive adapter services.
        let response =
            tokio::time::timeout(DEFAULT_ADAPTER_TIMEOUT, self.client.request(http_request))
                .await
                .map_err(|_| {
                    ProviderAdapterHttpError::retryable(format!(
                        "adapter request timed out after {}s",
                        DEFAULT_ADAPTER_TIMEOUT.as_secs()
                    ))
                })?
                .map_err(|error| {
                    ProviderAdapterHttpError::retryable(format!("adapter request failed: {error}"))
                })?;

        let status_code = response.status().as_u16();
        let content_type = response
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned);
        let response_exceeds_buffer_limit = declared_content_length_exceeds_limit(
            response.headers().get(CONTENT_LENGTH),
            MAX_ADAPTER_BUFFERED_RESPONSE_BYTES,
        );
        let response_exceeds_error_preview_limit = declared_content_length_exceeds_limit(
            response.headers().get(CONTENT_LENGTH),
            MAX_ADAPTER_ERROR_PREVIEW_BYTES,
        );

        if !(200..300).contains(&status_code) {
            let error_body = if response_exceeds_error_preview_limit {
                "adapter error response body exceeds diagnostic preview limit".to_owned()
            } else {
                collect_bounded_adapter_body(response.into_body(), MAX_ADAPTER_ERROR_PREVIEW_BYTES)
                    .await
                    .map(|bytes| String::from_utf8_lossy(&bytes).to_string())
                    .unwrap_or_else(|_| "adapter error response body unavailable".to_owned())
            };
            return Err(ProviderAdapterHttpError {
                status_code: Some(status_code),
                message: format!(
                    "adapter returned HTTP {status_code}: {}",
                    error_body.chars().take(500).collect::<String>()
                ),
                retryable: status_code == 429 || status_code >= 500,
            });
        }

        // Detect streaming responses and pass through without buffering.
        let is_stream = content_type.as_deref().is_some_and(|ct| {
            let ct_lower = ct.to_lowercase();
            ct_lower.starts_with("text/event-stream")
                || ct_lower.starts_with("application/x-ndjson")
        });

        if is_stream {
            let (_, body) = response.into_parts();
            let stream_body = axum::body::Body::new(body);
            return Ok(AdapterInvokeResult::Streaming {
                status_code,
                content_type,
                stream_body,
            });
        }

        if response_exceeds_buffer_limit {
            return Err(ProviderAdapterHttpError::non_retryable(format!(
                "adapter response body exceeds {MAX_ADAPTER_BUFFERED_RESPONSE_BYTES} bytes"
            )));
        }

        // Non-streaming: buffer and deserialize as JSON.
        let bytes =
            collect_bounded_adapter_body(response.into_body(), MAX_ADAPTER_BUFFERED_RESPONSE_BYTES)
                .await
                .map_err(|error| {
                    adapter_body_error(
                        "adapter response body",
                        MAX_ADAPTER_BUFFERED_RESPONSE_BYTES,
                        error,
                    )
                })?;

        serde_json::from_slice::<AdapterInvocationResponse>(&bytes)
            .map_err(|error| {
                ProviderAdapterHttpError::non_retryable(format!(
                    "adapter returned invalid response JSON: {error}"
                ))
            })
            .map(AdapterInvokeResult::Buffered)
    }

    pub async fn fetch_manifest(
        &self,
        adapter_base_url: impl AsRef<str>,
    ) -> Result<ProviderAdapterManifest, ProviderAdapterHttpError> {
        let uri = adapter_manifest_uri(adapter_base_url.as_ref(), self.outbound_target_policy)?;
        let http_request = Request::builder()
            .method(Method::GET)
            .uri(uri)
            .header(AUTHORIZATION, format!("Bearer {}", self.gateway_token))
            .body(Full::new(Bytes::new()))
            .map_err(|error| {
                ProviderAdapterHttpError::non_retryable(format!(
                    "failed to build adapter manifest request: {error}"
                ))
            })?;

        let response =
            tokio::time::timeout(DEFAULT_ADAPTER_TIMEOUT, self.client.request(http_request))
                .await
                .map_err(|_| {
                    ProviderAdapterHttpError::retryable(format!(
                        "adapter manifest request timed out after {}s",
                        DEFAULT_ADAPTER_TIMEOUT.as_secs()
                    ))
                })?
                .map_err(|error| {
                    ProviderAdapterHttpError::retryable(format!(
                        "adapter manifest request failed: {error}"
                    ))
                })?;

        let status_code = response.status().as_u16();

        if !(200..300).contains(&status_code) {
            return Err(ProviderAdapterHttpError {
                status_code: Some(status_code),
                message: format!("adapter manifest returned HTTP {status_code}"),
                retryable: status_code == 429 || status_code >= 500,
            });
        }

        if declared_content_length_exceeds_limit(
            response.headers().get(CONTENT_LENGTH),
            MAX_ADAPTER_MANIFEST_RESPONSE_BYTES,
        ) {
            return Err(ProviderAdapterHttpError::non_retryable(format!(
                "adapter manifest response body exceeds {MAX_ADAPTER_MANIFEST_RESPONSE_BYTES} bytes"
            )));
        }

        let bytes =
            collect_bounded_adapter_body(response.into_body(), MAX_ADAPTER_MANIFEST_RESPONSE_BYTES)
                .await
                .map_err(|error| {
                    adapter_body_error(
                        "adapter manifest response body",
                        MAX_ADAPTER_MANIFEST_RESPONSE_BYTES,
                        error,
                    )
                })?;

        serde_json::from_slice::<ProviderAdapterManifest>(&bytes).map_err(|error| {
            ProviderAdapterHttpError::non_retryable(format!(
                "adapter returned invalid manifest JSON: {error}"
            ))
        })
    }
}

#[derive(Debug, PartialEq, Eq)]
enum AdapterBodyReadError {
    Timeout,
    LimitExceeded,
    ReadFailed(String),
}

async fn collect_bounded_adapter_body<B>(
    body: B,
    limit: usize,
) -> Result<Bytes, AdapterBodyReadError>
where
    B: hyper::body::Body<Data = Bytes> + Send + 'static,
    B::Error: Into<Box<dyn std::error::Error + Send + Sync>>,
{
    tokio::time::timeout(DEFAULT_ADAPTER_TIMEOUT, Limited::new(body, limit).collect())
        .await
        .map_err(|_| AdapterBodyReadError::Timeout)?
        .map_err(|error| {
            if error.downcast_ref::<LengthLimitError>().is_some() {
                AdapterBodyReadError::LimitExceeded
            } else {
                AdapterBodyReadError::ReadFailed(error.to_string())
            }
        })
        .map(|collected| collected.to_bytes())
}

fn adapter_body_error(
    operation: &str,
    limit: usize,
    error: AdapterBodyReadError,
) -> ProviderAdapterHttpError {
    match error {
        AdapterBodyReadError::Timeout => ProviderAdapterHttpError::retryable(format!(
            "{operation} timed out after {}s",
            DEFAULT_ADAPTER_TIMEOUT.as_secs()
        )),
        AdapterBodyReadError::LimitExceeded => {
            ProviderAdapterHttpError::non_retryable(format!("{operation} exceeds {limit} bytes"))
        }
        AdapterBodyReadError::ReadFailed(error) => {
            ProviderAdapterHttpError::retryable(format!("{operation} failed: {error}"))
        }
    }
}

fn declared_content_length_exceeds_limit(
    content_length: Option<&HeaderValue>,
    limit: usize,
) -> bool {
    content_length
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.trim().parse::<u64>().ok())
        .is_some_and(|value| value > limit as u64)
}

impl ProviderAdapterHttpError {
    fn retryable(message: impl Into<String>) -> Self {
        Self {
            status_code: None,
            message: message.into(),
            retryable: true,
        }
    }

    fn non_retryable(message: impl Into<String>) -> Self {
        Self {
            status_code: None,
            message: message.into(),
            retryable: false,
        }
    }
}

fn adapter_uri(
    route: &ProviderAdapterRouteConfig,
    standard_path: &str,
    outbound_target_policy: OutboundTargetPolicy,
) -> Result<Uri, ProviderAdapterHttpError> {
    let base_url = route.adapter_base_url.trim().trim_end_matches('/');
    if base_url.is_empty() {
        return Err(ProviderAdapterHttpError::non_retryable(
            "adapter base URL is required",
        ));
    }
    let path = route.adapter_path(standard_path);
    let path = if path.starts_with('/') {
        path
    } else {
        format!("/{path}")
    };
    validate_outbound_base_url(base_url, outbound_target_policy).map_err(|_| {
        ProviderAdapterHttpError::non_retryable(
            "adapter base URL violates the outbound target policy",
        )
    })?;
    let url = format!("{base_url}{path}");
    validate_outbound_url(&url, outbound_target_policy).map_err(|_| {
        ProviderAdapterHttpError::non_retryable("adapter URL violates the outbound target policy")
    })?;
    url.parse::<Uri>()
        .map_err(|_| ProviderAdapterHttpError::non_retryable("adapter URL is invalid"))
}

fn adapter_manifest_uri(
    adapter_base_url: &str,
    outbound_target_policy: OutboundTargetPolicy,
) -> Result<Uri, ProviderAdapterHttpError> {
    let base_url = adapter_base_url.trim().trim_end_matches('/');
    if base_url.is_empty() {
        return Err(ProviderAdapterHttpError::non_retryable(
            "adapter base URL is required",
        ));
    }
    validate_outbound_base_url(base_url, outbound_target_policy).map_err(|_| {
        ProviderAdapterHttpError::non_retryable(
            "adapter base URL violates the outbound target policy",
        )
    })?;
    let url = format!("{base_url}/internal/adapter-manifest");
    validate_outbound_url(&url, outbound_target_policy).map_err(|_| {
        ProviderAdapterHttpError::non_retryable(
            "adapter manifest URL violates the outbound target policy",
        )
    })?;
    url.parse::<Uri>()
        .map_err(|_| ProviderAdapterHttpError::non_retryable("adapter manifest URL is invalid"))
}

fn build_adapter_client(outbound_target_policy: OutboundTargetPolicy) -> AdapterClient {
    ensure_rustls_crypto_provider();
    let mut http_connector =
        HttpConnector::new_with_resolver(OutboundDnsResolver::new(outbound_target_policy));
    http_connector.set_connect_timeout(Some(DEFAULT_CONNECT_TIMEOUT));
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
        .pool_idle_timeout(Some(DEFAULT_POOL_IDLE_TIMEOUT))
        .pool_max_idle_per_host(DEFAULT_POOL_MAX_IDLE_PER_HOST)
        .build(connector)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn declared_content_length_rejects_only_valid_values_over_the_limit() {
        assert!(declared_content_length_exceeds_limit(
            Some(&HeaderValue::from_static("5")),
            4
        ));
        assert!(!declared_content_length_exceeds_limit(
            Some(&HeaderValue::from_static("4")),
            4
        ));
        assert!(!declared_content_length_exceeds_limit(
            Some(&HeaderValue::from_static("invalid")),
            4
        ));
        assert!(declared_content_length_exceeds_limit(
            Some(&HeaderValue::from_static(" 5 ")),
            4
        ));
    }

    #[tokio::test]
    async fn bounded_adapter_collection_rejects_an_oversized_frame() {
        let error = collect_bounded_adapter_body(Full::new(Bytes::from_static(b"12345")), 4)
            .await
            .expect_err("a frame over the budget must not be collected");

        assert_eq!(AdapterBodyReadError::LimitExceeded, error);
    }

    #[test]
    fn oversized_adapter_bodies_are_not_retryable() {
        let error = adapter_body_error(
            "adapter response body",
            4,
            AdapterBodyReadError::LimitExceeded,
        );

        assert!(!error.retryable);
        assert!(error.message.contains("exceeds 4 bytes"));
    }

    #[test]
    fn adapter_manifest_target_policy_is_fail_closed_in_production() {
        let error = adapter_manifest_uri("http://127.0.0.1:8080", OutboundTargetPolicy::Production)
            .expect_err("production adapter target must reject local HTTP");
        assert!(!error.retryable);

        assert!(adapter_manifest_uri(
            "https://adapter.example.test",
            OutboundTargetPolicy::Production,
        )
        .is_ok());
        assert!(
            adapter_manifest_uri("http://127.0.0.1:8080", OutboundTargetPolicy::Development,)
                .is_ok()
        );
    }
}
