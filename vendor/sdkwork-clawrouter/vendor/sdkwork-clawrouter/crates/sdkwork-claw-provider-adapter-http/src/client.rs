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

#[derive(Clone)]
pub struct ProviderAdapterHttpClient {
    client: AdapterClient,
    gateway_token: String,
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

    pub async fn invoke(
        &self,
        route: &ProviderAdapterRouteConfig,
        request: AdapterInvocationRequest,
    ) -> Result<AdapterInvocationResponse, ProviderAdapterHttpError> {
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

        let response = self.client.request(http_request).await.map_err(|error| {
            ProviderAdapterHttpError::retryable(format!("adapter request failed: {error}"))
        })?;
        let status_code = response.status().as_u16();
        let bytes = response
            .into_body()
            .collect()
            .await
            .map_err(|error| {
                ProviderAdapterHttpError::retryable(format!(
                    "adapter response body failed: {error}"
                ))
            })?
            .to_bytes();

        if !(200..300).contains(&status_code) {
            return Err(ProviderAdapterHttpError {
                status_code: Some(status_code),
                message: format!("adapter returned HTTP {status_code}"),
                retryable: status_code == 429 || status_code >= 500,
            });
        }

        serde_json::from_slice::<AdapterInvocationResponse>(&bytes).map_err(|error| {
            ProviderAdapterHttpError::non_retryable(format!(
                "adapter returned invalid response JSON: {error}"
            ))
        })
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

        let response = self.client.request(http_request).await.map_err(|error| {
            ProviderAdapterHttpError::retryable(format!("adapter manifest request failed: {error}"))
        })?;
        let status_code = response.status().as_u16();
        let bytes = response
            .into_body()
            .collect()
            .await
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
    let connector = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_or_http()
        .enable_http1()
        .build();
    Client::builder(TokioExecutor::new()).build(connector)
}
