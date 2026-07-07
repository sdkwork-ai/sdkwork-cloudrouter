use std::time::Duration;

use bytes::Bytes;
use http_body_util::{BodyExt, Full};
use hyper::header::{AUTHORIZATION, CONTENT_TYPE};
use hyper::{Method, Request, Uri};
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sdkwork_claw_provider_adapter_contract::{
    AdapterInvocationRequest, AdapterInvocationResponse, ProviderAdapterManifest,
};
use sdkwork_claw_provider_adapter_registry::ProviderAdapterRouteConfig;

type AdapterRequestBody = Full<Bytes>;
type AdapterConnector = HttpsConnector<HttpConnector>;
type AdapterClient = Client<AdapterConnector, AdapterRequestBody>;

/// Default timeout for adapter HTTP requests (including body read).
const DEFAULT_ADAPTER_TIMEOUT: Duration = Duration::from_secs(120);

/// Default connect timeout for establishing TCP+TLS connections.
const DEFAULT_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// Default idle timeout for pooled keep-alive connections.
const DEFAULT_POOL_IDLE_TIMEOUT: Duration = Duration::from_secs(90);

/// Maximum idle connections kept per host in the connection pool.
const DEFAULT_POOL_MAX_IDLE_PER_HOST: usize = 32;

#[derive(Clone)]
pub struct ProviderAdapterHttpClient {
    client: AdapterClient,
    gateway_token: String,
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
    pub fn new(gateway_token: impl Into<String>) -> Self {
        Self {
            client: build_adapter_client(),
            gateway_token: gateway_token.into(),
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
        let uri = adapter_uri(route, request.invocation.standard_path.as_str())?;
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

        if !(200..300).contains(&status_code) {
            // For error responses, drain the body to get a meaningful error message.
            let error_body = response
                .into_body()
                .collect()
                .await
                .map(|collected| String::from_utf8_lossy(&collected.to_bytes()).to_string())
                .unwrap_or_default();
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

        // Non-streaming: buffer and deserialize as JSON.
        let bytes = tokio::time::timeout(DEFAULT_ADAPTER_TIMEOUT, response.into_body().collect())
            .await
            .map_err(|_| {
                ProviderAdapterHttpError::retryable(format!(
                    "adapter response body timed out after {}s",
                    DEFAULT_ADAPTER_TIMEOUT.as_secs()
                ))
            })?
            .map_err(|error| {
                ProviderAdapterHttpError::retryable(format!(
                    "adapter response body failed: {error}"
                ))
            })?
            .to_bytes();

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
        let uri = adapter_manifest_uri(adapter_base_url.as_ref())?;
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
        let bytes = tokio::time::timeout(DEFAULT_ADAPTER_TIMEOUT, response.into_body().collect())
            .await
            .map_err(|_| {
                ProviderAdapterHttpError::retryable(format!(
                    "adapter manifest response body timed out after {}s",
                    DEFAULT_ADAPTER_TIMEOUT.as_secs()
                ))
            })?
            .map_err(|error| {
                ProviderAdapterHttpError::retryable(format!(
                    "adapter manifest response body failed: {error}"
                ))
            })?
            .to_bytes();

        if !(200..300).contains(&status_code) {
            return Err(ProviderAdapterHttpError {
                status_code: Some(status_code),
                message: format!("adapter manifest returned HTTP {status_code}"),
                retryable: status_code == 429 || status_code >= 500,
            });
        }

        serde_json::from_slice::<ProviderAdapterManifest>(&bytes).map_err(|error| {
            ProviderAdapterHttpError::non_retryable(format!(
                "adapter returned invalid manifest JSON: {error}"
            ))
        })
    }
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
    format!("{base_url}{path}").parse::<Uri>().map_err(|error| {
        ProviderAdapterHttpError::non_retryable(format!("adapter URL is invalid: {error}"))
    })
}

fn adapter_manifest_uri(adapter_base_url: &str) -> Result<Uri, ProviderAdapterHttpError> {
    let base_url = adapter_base_url.trim().trim_end_matches('/');
    if base_url.is_empty() {
        return Err(ProviderAdapterHttpError::non_retryable(
            "adapter base URL is required",
        ));
    }
    format!("{base_url}/internal/adapter-manifest")
        .parse::<Uri>()
        .map_err(|error| {
            ProviderAdapterHttpError::non_retryable(format!(
                "adapter manifest URL is invalid: {error}"
            ))
        })
}

fn build_adapter_client() -> AdapterClient {
    let mut http_connector = HttpConnector::new();
    http_connector.set_connect_timeout(Some(DEFAULT_CONNECT_TIMEOUT));
    http_connector.enforce_http(false);
    let connector = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_or_http()
        .enable_http1()
        .wrap_connector(http_connector);
    Client::builder(TokioExecutor::new())
        .pool_idle_timeout(Some(DEFAULT_POOL_IDLE_TIMEOUT))
        .pool_max_idle_per_host(DEFAULT_POOL_MAX_IDLE_PER_HOST)
        .build(connector)
}
