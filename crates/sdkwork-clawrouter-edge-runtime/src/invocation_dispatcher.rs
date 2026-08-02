use std::collections::HashSet;
use std::num::NonZeroUsize;
use std::time::Duration;

use axum::body::Body as AxumBody;
use axum::http::header::{self, HeaderName, HeaderValue};
use axum::http::request::Builder as RequestBuilder;
use axum::http::Uri;
use bytes::Bytes;
use http_body_util::{BodyExt, Full, LengthLimitError, Limited};
use hyper::Request as HyperRequest;
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sdkwork_claw_http::OutboundDnsResolver;
use sdkwork_claw_security::{validate_outbound_url, OutboundTargetPolicy};
use sdkwork_clawrouter_router_service::application::{
    Invocation, InvocationAccount, InvocationBody, InvocationDispatchResponse,
};
use sdkwork_clawrouter_router_service::infrastructure::provider::{
    ProviderRelayHttpPoolConfig, ProviderResponseMemoryBudget, ProviderResponseMemoryBudgetError,
};
use sdkwork_clawrouter_router_service::ports::{
    InvocationDispatchError, InvocationDispatcher, InvocationDispatcherFuture,
};

const INVOCATION_UPSTREAM_BODY_LIMIT_BYTES: usize = 32 * 1024 * 1024;
const DEFAULT_DISPATCH_TIMEOUT_MS: u64 = 30_000;

type InvocationHttpBody = Full<Bytes>;
type InvocationHttpConnector = HttpsConnector<HttpConnector<OutboundDnsResolver>>;
type InvocationHttpClient = Client<InvocationHttpConnector, InvocationHttpBody>;

#[derive(Clone)]
pub struct InvocationHttpDispatcher {
    client: InvocationHttpClient,
    outbound_target_policy: OutboundTargetPolicy,
    response_max_bytes: NonZeroUsize,
    response_timeout: Duration,
    response_memory_budget: ProviderResponseMemoryBudget,
}

impl InvocationHttpDispatcher {
    pub fn new() -> Self {
        Self::with_outbound_target_policy(OutboundTargetPolicy::Production)
    }

    /// Creates an explicit development-only dispatcher for desktop and test
    /// fixtures that intentionally target a local HTTP provider.
    pub fn for_development() -> Self {
        Self::with_outbound_target_policy(OutboundTargetPolicy::Development)
    }

    pub fn with_outbound_target_policy(outbound_target_policy: OutboundTargetPolicy) -> Self {
        Self::with_outbound_target_policy_and_response_max_bytes(
            outbound_target_policy,
            default_response_max_bytes(),
        )
    }

    /// Creates a production dispatcher with an explicit non-streaming response budget.
    pub fn with_response_max_bytes(response_max_bytes: NonZeroUsize) -> Self {
        Self::with_outbound_target_policy_and_response_max_bytes(
            OutboundTargetPolicy::Production,
            response_max_bytes,
        )
    }

    pub fn with_outbound_target_policy_and_response_max_bytes(
        outbound_target_policy: OutboundTargetPolicy,
        response_max_bytes: NonZeroUsize,
    ) -> Self {
        Self::with_outbound_target_policy_and_provider_runtime(
            outbound_target_policy,
            response_max_bytes,
            Duration::from_millis(DEFAULT_DISPATCH_TIMEOUT_MS),
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    /// Creates a production dispatcher from the resolved provider relay runtime
    /// settings assembled by the gateway bootstrap.
    pub fn with_provider_runtime(
        response_max_bytes: NonZeroUsize,
        response_timeout: Duration,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self::with_outbound_target_policy_and_provider_runtime(
            OutboundTargetPolicy::Production,
            response_max_bytes,
            response_timeout,
            http_pool_config,
        )
    }

    fn with_outbound_target_policy_and_provider_runtime(
        outbound_target_policy: OutboundTargetPolicy,
        response_max_bytes: NonZeroUsize,
        response_timeout: Duration,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        let response_memory_budget = ProviderResponseMemoryBudget::with_default_limit();
        Self {
            client: build_invocation_http_client(outbound_target_policy, http_pool_config),
            outbound_target_policy,
            response_max_bytes,
            response_timeout,
            response_memory_budget,
        }
    }

    /// Creates a production dispatcher with an explicit process-wide memory
    /// budget. Invalid response-limit/budget combinations fail at bootstrap.
    pub fn with_provider_runtime_and_memory_budget(
        response_max_bytes: NonZeroUsize,
        response_memory_budget_bytes: NonZeroUsize,
        response_timeout: Duration,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Result<Self, String> {
        let response_memory_budget =
            ProviderResponseMemoryBudget::new(response_memory_budget_bytes)
                .map_err(|error| error.to_string())?;
        Self::with_provider_runtime_and_shared_memory_budget(
            response_max_bytes,
            response_memory_budget,
            response_timeout,
            http_pool_config,
        )
    }

    pub fn with_provider_runtime_and_shared_memory_budget(
        response_max_bytes: NonZeroUsize,
        response_memory_budget: ProviderResponseMemoryBudget,
        response_timeout: Duration,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Result<Self, String> {
        response_memory_budget
            .validate_response_limit(response_max_bytes.get() as u64)
            .map_err(|error| error.to_string())?;
        Ok(Self {
            client: build_invocation_http_client(
                OutboundTargetPolicy::Production,
                http_pool_config,
            ),
            outbound_target_policy: OutboundTargetPolicy::Production,
            response_max_bytes,
            response_timeout,
            response_memory_budget,
        })
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
            let provider_url = provider_request.url.as_deref().ok_or_else(|| {
                dispatch_error(
                    "provider_url_missing",
                    format!(
                        "invocation route {}:{} is missing provider URL",
                        account.supplier_code, account.account_id
                    ),
                    None,
                    false,
                )
            })?;
            let uri = validated_provider_uri(provider_url, self.outbound_target_policy)?;

            let request = build_upstream_request(provider_request, uri)?;
            let response = execute_with_optional_timeout(
                account,
                self.response_timeout,
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

            if declared_content_length_exceeds_limit(
                response.headers().get(header::CONTENT_LENGTH),
                self.response_max_bytes.get(),
            ) {
                return Err(provider_response_too_large_error(
                    status_code,
                    self.response_max_bytes.get(),
                ));
            }

            let memory_guard = self
                .response_memory_budget
                .try_reserve(self.response_max_bytes.get() as u64)
                .map_err(provider_response_memory_error)?;

            let body = collect_bounded_provider_response_body(
                account,
                status_code,
                response.into_body(),
                self.response_max_bytes.get(),
                self.response_timeout,
            )
            .await?;

            if body.is_empty() {
                return Ok(InvocationDispatchResponse::empty(status_code));
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
                return Ok(response.with_memory_guard(memory_guard));
            }

            Ok(
                InvocationDispatchResponse::bytes(status_code, body.to_vec(), content_type)
                    .with_memory_guard(memory_guard),
            )
        })
    }
}

fn default_response_max_bytes() -> NonZeroUsize {
    NonZeroUsize::new(INVOCATION_UPSTREAM_BODY_LIMIT_BYTES)
        .expect("the hard-coded invocation response limit must be nonzero")
}

async fn execute_with_optional_timeout<F, T>(
    account: &InvocationAccount,
    default_timeout: Duration,
    operation: &'static str,
    future: F,
) -> Result<T, InvocationDispatchError>
where
    F: std::future::Future<Output = T>,
{
    let timeout = account
        .timeout_ms
        .and_then(timeout_duration)
        .unwrap_or(default_timeout);
    tokio::time::timeout(timeout, future).await.map_err(|_| {
        dispatch_error(
            "provider_http_timeout",
            format!(
                "{operation} timed out after {} ms for invocation route {}:{}",
                timeout.as_millis(),
                account.supplier_code,
                account.account_id
            ),
            None,
            true,
        )
    })
}

async fn collect_bounded_provider_response_body<B>(
    account: &InvocationAccount,
    status_code: u16,
    body: B,
    limit: usize,
    default_timeout: Duration,
) -> Result<Bytes, InvocationDispatchError>
where
    B: hyper::body::Body<Data = Bytes> + Send + 'static,
    B::Error: Into<Box<dyn std::error::Error + Send + Sync>>,
{
    execute_with_optional_timeout(
        account,
        default_timeout,
        "provider response body",
        Limited::new(body, limit).collect(),
    )
    .await?
    .map_err(|error| {
        if error.downcast_ref::<LengthLimitError>().is_some() {
            provider_response_too_large_error(status_code, limit)
        } else {
            dispatch_error(
                "provider_http_body_failed",
                format!("failed to read provider response body: {error}"),
                Some(status_code),
                true,
            )
        }
    })
    .map(|collected| collected.to_bytes())
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

fn provider_response_too_large_error(status_code: u16, limit: usize) -> InvocationDispatchError {
    dispatch_error(
        "provider_response_too_large",
        format!("provider response body exceeds {limit} bytes"),
        Some(status_code),
        false,
    )
}

fn provider_response_memory_error(
    error: ProviderResponseMemoryBudgetError,
) -> InvocationDispatchError {
    if error.is_saturated() {
        dispatch_error(
            "provider_response_memory_saturated",
            error.to_string(),
            Some(503),
            true,
        )
    } else {
        dispatch_error(
            "provider_response_memory_config_invalid",
            error.to_string(),
            None,
            false,
        )
    }
}

fn timeout_duration(timeout_ms: u64) -> Option<Duration> {
    (timeout_ms > 0).then(|| Duration::from_millis(timeout_ms))
}

fn build_invocation_http_client(
    policy: OutboundTargetPolicy,
    pool_config: ProviderRelayHttpPoolConfig,
) -> InvocationHttpClient {
    let mut http_connector = HttpConnector::new_with_resolver(OutboundDnsResolver::new(policy));
    http_connector.set_connect_timeout(Some(pool_config.connect_timeout));
    http_connector.enforce_http(false);
    let connector = match policy {
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

fn validated_provider_uri(
    value: &str,
    policy: OutboundTargetPolicy,
) -> Result<Uri, InvocationDispatchError> {
    validate_outbound_url(value, policy).map_err(|_| {
        dispatch_error(
            "provider_target_not_allowed",
            "provider URL violates the outbound target policy",
            None,
            false,
        )
    })?;
    value.parse::<Uri>().map_err(|_| {
        dispatch_error(
            "invalid_provider_url",
            "provider URL is invalid",
            None,
            false,
        )
    })
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
                .find(|byte| !byte.is_ascii_whitespace());
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

#[cfg(test)]
mod tests {
    use super::*;

    fn account() -> InvocationAccount {
        InvocationAccount {
            supplier_code: "test-provider".to_owned(),
            account_id: 1,
            region_code: "global".to_owned(),
            credential_id: None,
            credential_rotation: None,
            base_url: None,
            secret_ref: None,
            auth_profile: Default::default(),
            timeout_ms: Some(DEFAULT_DISPATCH_TIMEOUT_MS),
            retry_policy: None,
            provider_model: None,
        }
    }

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
            Some(&HeaderValue::from_static("not-a-length")),
            4
        ));
        assert!(declared_content_length_exceeds_limit(
            Some(&HeaderValue::from_static(" 5 ")),
            4
        ));
    }

    #[test]
    fn provider_target_policy_is_fail_closed_in_production() {
        let error = validated_provider_uri(
            "http://127.0.0.1:8080/v1/chat/completions",
            OutboundTargetPolicy::Production,
        )
        .expect_err("production provider target must reject local HTTP");
        assert_eq!("provider_target_not_allowed", error.code);
        assert!(!error.retryable);

        assert!(validated_provider_uri(
            "https://api.openai.com/v1/chat/completions",
            OutboundTargetPolicy::Production,
        )
        .is_ok());
        assert!(validated_provider_uri(
            "http://127.0.0.1:8080/v1/chat/completions",
            OutboundTargetPolicy::Development,
        )
        .is_ok());
    }

    #[tokio::test]
    async fn bounded_provider_collection_rejects_an_oversized_frame() {
        let error = collect_bounded_provider_response_body(
            &account(),
            200,
            Full::new(Bytes::from_static(b"12345")),
            4,
            Duration::from_millis(DEFAULT_DISPATCH_TIMEOUT_MS),
        )
        .await
        .expect_err("a frame over the budget must not be collected");

        assert_eq!("provider_response_too_large", error.code);
        assert_eq!("provider response body exceeds 4 bytes", error.message);
        assert_eq!(Some(200), error.status_code);
        assert!(!error.retryable);
    }

    #[tokio::test]
    async fn configured_response_budget_is_used_for_provider_body_collection() {
        let dispatcher = InvocationHttpDispatcher::with_response_max_bytes(
            NonZeroUsize::new(4).expect("test response limit must be nonzero"),
        );

        let error = collect_bounded_provider_response_body(
            &account(),
            200,
            Full::new(Bytes::from_static(b"12345")),
            dispatcher.response_max_bytes.get(),
            dispatcher.response_timeout,
        )
        .await
        .expect_err("configured response budget must reject oversized body");

        assert_eq!("provider_response_too_large", error.code);
        assert_eq!("provider response body exceeds 4 bytes", error.message);
    }

    #[test]
    fn configured_provider_runtime_timeout_is_retained_by_the_dispatcher() {
        let timeout = Duration::from_millis(123);
        let dispatcher = InvocationHttpDispatcher::with_provider_runtime(
            NonZeroUsize::new(1024).expect("nonzero response budget"),
            timeout,
            ProviderRelayHttpPoolConfig::default(),
        );

        assert_eq!(timeout, dispatcher.response_timeout);
    }

    #[test]
    fn process_memory_budget_rejects_concurrent_reservations_at_capacity() {
        let budget = ProviderResponseMemoryBudget::new(
            NonZeroUsize::new(16).expect("nonzero process memory budget"),
        )
        .expect("test process memory budget must be valid");
        let response_limit = NonZeroUsize::new(4).expect("nonzero response limit");

        let first = budget
            .try_reserve(response_limit.get() as u64)
            .expect("first response must reserve the full test budget");
        let saturated = budget
            .try_reserve(response_limit.get() as u64)
            .expect_err("a second reservation must fail closed while capacity is held");
        assert!(saturated.is_saturated());

        drop(first);
        assert!(budget.try_reserve(response_limit.get() as u64).is_ok());
    }

    #[test]
    fn cloned_response_retains_the_same_memory_reservation() {
        let budget = ProviderResponseMemoryBudget::new(
            NonZeroUsize::new(16).expect("nonzero process memory budget"),
        )
        .expect("test process memory budget must be valid");
        let response_limit = NonZeroUsize::new(4).expect("nonzero response limit");
        let guard = budget
            .try_reserve(response_limit.get() as u64)
            .expect("first response must reserve capacity");
        let response =
            InvocationDispatchResponse::bytes(200, b"body".to_vec(), None).with_memory_guard(guard);
        let normalized_copy = response.clone();
        drop(response);

        assert!(budget.try_reserve(response_limit.get() as u64).is_err());
        drop(normalized_copy);
        assert!(budget.try_reserve(response_limit.get() as u64).is_ok());
    }

    #[test]
    fn explicit_runtime_rejects_response_limit_above_process_budget() {
        let error = InvocationHttpDispatcher::with_provider_runtime_and_memory_budget(
            NonZeroUsize::new(5).expect("nonzero response limit"),
            NonZeroUsize::new(16).expect("nonzero process budget"),
            Duration::from_secs(1),
            ProviderRelayHttpPoolConfig::default(),
        )
        .err()
        .expect("response memory amplification must fit the process budget");

        assert!(error.contains("requires a 20 byte memory reservation"));
    }
}
