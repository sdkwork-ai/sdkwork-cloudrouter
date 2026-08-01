use crate::gateway_api_key_auth::{
    authenticate_gateway_api_key, sanitize_authenticated_gateway_uri,
};
use crate::invocation_http::response_from_invocation_error;
use crate::openai_passthrough_routes::{
    apply_openai_method_passthrough_routes, apply_openai_passthrough_routes,
    apply_stored_chat_completion_passthrough_routes, reject_unsupported_openai_method,
    reject_unsupported_provider_route,
};
use crate::provider_passthrough_transport::{
    build_provider_passthrough_client, forward_provider_passthrough_to_target,
    validate_provider_passthrough_target, PassthroughClient, ProviderPassthroughTarget,
};
use crate::request_identity::generate_server_request_id;
use axum::body::Body;
use axum::extract::Request;
use axum::extract::State;
use axum::http::header::{HeaderName, HeaderValue, USER_AGENT};
use axum::http::HeaderMap;
use axum::http::{StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::MethodRouter;
use axum::{Json, Router};
use http_body_util::{BodyExt, LengthLimitError, Limited};
use sdkwork_claw_config::{
    ProviderAdapterConfig, ProviderPassthroughAuth, ProviderPassthroughAuthType,
    ProviderRelayConfig, RequestLimitsConfig,
};
use sdkwork_claw_http::QueryStringApiKeyPolicy;
use sdkwork_claw_provider_adapter_contract::{
    AdapterInvocationMetadata, AdapterInvocationRequest, AdapterInvocationResponse,
    AdapterInvocationShape, AdapterProviderContext, AdapterSecret, AdapterSubject,
    AdapterUsageLine,
};
use sdkwork_claw_provider_adapter_http::{
    AdapterInvokeResult, ProviderAdapterHttpClient, ProviderAdapterHttpError,
};
use sdkwork_claw_provider_adapter_registry::{
    ProviderAdapterLookup, ProviderAdapterRegistry, ProviderAdapterRouteConfig,
    ProviderInvocationMode,
};
use sdkwork_claw_security::OutboundTargetPolicy;
use sdkwork_clawrouter_router_service::api::normalize_user_agent_header;
use sdkwork_clawrouter_router_service::application::{
    find_builtin_ai_route, ApiKeySecretHasher, AuthenticatedApiKeyContext, InvocationError,
    InvocationErrorKind, PricingResolver, ResolveModelPriceQuery,
};
use sdkwork_clawrouter_router_service::domain::{
    ensure_canonical_model_catalog_key, provider_native_model_id, BillingMeter, DecimalValue,
    DomainError, DomainResult,
};
use sdkwork_clawrouter_router_service::infrastructure::provider::{
    ProviderRelayHttpPoolConfig, DEFAULT_PROVIDER_RESPONSE_TIMEOUT_MILLIS,
};
use sdkwork_clawrouter_router_service::ports::{
    GatewayUsageQuantity, GatewayUsageRecordCommand, GatewayUsageRecorder, PricingCatalog,
    ProviderSecretResolver,
};
use serde_json::json;
use serde_json::Value;
use std::sync::Arc;
use std::time::Duration;

type UsageRecorder = Arc<dyn GatewayUsageRecorder + Send + Sync>;

const ADAPTER_USAGE_TYPE_BASE: i64 = 10_000;
const TOKEN_BILLING_UNIT_SIZE_DECIMAL: &str = "1000000";
const USAGE_AMOUNT_DECIMAL_DIGITS: u32 = 12;
const MAX_ADAPTER_USAGE_LINES: usize = 64;
const MODALITY_TEXT: i64 = 1;
const MODALITY_IMAGE: i64 = 2;
const MODALITY_AUDIO: i64 = 3;
const MODALITY_MUSIC: i64 = 4;
const MODALITY_VIDEO: i64 = 5;
const MODALITY_EMBEDDING: i64 = 6;
const MODALITY_RERANK: i64 = 7;

fn default_provider_passthrough_response_timeout() -> Duration {
    Duration::from_millis(DEFAULT_PROVIDER_RESPONSE_TIMEOUT_MILLIS)
}

#[derive(Clone)]
struct ProviderPassthroughRuntime {
    client: PassthroughClient,
    outbound_target_policy: OutboundTargetPolicy,
    providers: Arc<Vec<ProviderPassthroughTarget>>,
    adapter: Option<ProviderNativeAdapterRuntime>,
    body_max_bytes: usize,
    response_timeout: Duration,
}

#[derive(Debug)]
enum ProviderPassthroughError {
    RequestBodyTooLarge { limit: usize },
    InvalidRequest(String),
    StreamingAccountingUnavailable,
    Relay(String),
}

impl From<String> for ProviderPassthroughError {
    fn from(message: String) -> Self {
        Self::Relay(message)
    }
}

#[derive(Clone)]
struct ProviderNativeAdapterRuntime {
    registry: Arc<ProviderAdapterRegistry>,
    client: ProviderAdapterHttpClient,
}

const PROVIDER_NATIVE_PASSTHROUGH_PROVIDERS: &[&str] = &[
    "openai",
    "google",
    "anthropic",
    "volcengine",
    "tencent-cloud",
    "tencent-hunyuan",
    "alicloud",
    "aliyun",
    "minimax",
    "suno",
    "elevenlabs",
    "midjourney",
    "kling",
    "vidu",
    "nano-banana",
];

pub fn provider_native_passthrough_providers() -> &'static [&'static str] {
    PROVIDER_NATIVE_PASSTHROUGH_PROVIDERS
}

pub fn gateway_passthrough_router() -> Router {
    apply_provider_native_passthrough_routes(
        openai_passthrough_placeholder_router(),
        MethodRouter::new().fallback(provider_passthrough_not_configured),
    )
}

fn apply_provider_native_passthrough_routes<S>(
    mut router: Router<S>,
    handler: MethodRouter<S>,
) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    for provider in PROVIDER_NATIVE_PASSTHROUGH_PROVIDERS {
        let vendor_path = format!("/{provider}/{{*path}}");
        let legacy_path = format!("/provider/{provider}/{{*path}}");
        router = router
            .route(&vendor_path, handler.clone())
            .route(&legacy_path, handler.clone());
    }
    router
}

pub fn router_with_provider_passthrough_config(config: ProviderRelayConfig) -> Router {
    provider_passthrough_router_with_runtime(ProviderPassthroughRuntime::from_config(config))
}

/// Creates a passthrough router for explicit desktop-development and local
/// fixture use. Production router construction always uses the strict policy.
pub fn router_with_provider_passthrough_config_for_development(
    config: ProviderRelayConfig,
) -> Router {
    provider_passthrough_router_with_runtime(
        ProviderPassthroughRuntime::from_config_for_development(config),
    )
}

pub fn router_with_provider_passthrough_and_adapter_config(
    config: ProviderRelayConfig,
    adapter_config: Option<ProviderAdapterConfig>,
) -> Router {
    provider_passthrough_router_with_runtime(ProviderPassthroughRuntime::from_config_with_adapter(
        config,
        adapter_config,
    ))
}

/// Creates a passthrough router with local adapter fixtures enabled. This is
/// intentionally separate from the strict production constructor above.
pub fn router_with_provider_passthrough_and_adapter_config_for_development(
    config: ProviderRelayConfig,
    adapter_config: Option<ProviderAdapterConfig>,
) -> Router {
    provider_passthrough_router_with_runtime(
        ProviderPassthroughRuntime::from_config_with_adapter_for_development(
            config,
            adapter_config,
        ),
    )
}

pub(crate) fn authenticated_gateway_passthrough_router_with_adapter_config_and_query_string_api_key_policy<
    C,
>(
    config: ProviderRelayConfig,
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    adapter_config: Option<ProviderAdapterConfig>,
    usage_recorder: Option<UsageRecorder>,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
    body_max_bytes: usize,
    response_timeout: Duration,
    http_pool_config: ProviderRelayHttpPoolConfig,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let runtime =
        ProviderPassthroughRuntime::from_config_with_adapter_and_body_max_bytes_and_transport(
            config,
            adapter_config,
            body_max_bytes,
            response_timeout,
            http_pool_config,
        );
    let state = AuthenticatedProviderPassthroughState {
        runtime,
        catalog,
        api_key_hasher,
        secret_resolver: None,
        usage_recorder,
        query_string_api_key_policy,
    };
    let openai_router = if state.runtime.has_openai_target() {
        authenticated_openai_passthrough_router::<C>(state.clone())
    } else {
        openai_passthrough_placeholder_router()
    };
    openai_router.merge(authenticated_provider_passthrough_router::<C>(state))
}

pub fn authenticated_provider_native_passthrough_router_with_adapter_config<C>(
    config: Option<ProviderRelayConfig>,
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    adapter_config: Option<ProviderAdapterConfig>,
    secret_resolver: Option<Arc<dyn ProviderSecretResolver + Send + Sync>>,
    usage_recorder: Option<UsageRecorder>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    authenticated_provider_native_passthrough_router_with_adapter_config_and_query_string_api_key_policy(
        config,
        catalog,
        api_key_hasher,
        adapter_config,
        secret_resolver,
        usage_recorder,
        QueryStringApiKeyPolicy::default(),
    )
}

pub(crate) fn authenticated_provider_native_passthrough_router_with_adapter_config_and_query_string_api_key_policy<
    C,
>(
    config: Option<ProviderRelayConfig>,
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    adapter_config: Option<ProviderAdapterConfig>,
    secret_resolver: Option<Arc<dyn ProviderSecretResolver + Send + Sync>>,
    usage_recorder: Option<UsageRecorder>,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    authenticated_provider_passthrough_router::<C>(AuthenticatedProviderPassthroughState {
        runtime: ProviderPassthroughRuntime::from_optional_config_with_adapter(
            config,
            adapter_config,
        ),
        catalog,
        api_key_hasher,
        secret_resolver,
        usage_recorder,
        query_string_api_key_policy,
    })
}

fn openai_passthrough_placeholder_router() -> Router<()> {
    let router = apply_openai_passthrough_routes(
        Router::new(),
        MethodRouter::new().fallback(openai_passthrough_not_configured),
    );
    let router = apply_openai_method_passthrough_routes(
        router,
        MethodRouter::new().fallback(openai_passthrough_not_configured),
    );
    apply_stored_chat_completion_passthrough_routes(
        router,
        MethodRouter::new().fallback(openai_passthrough_not_configured),
    )
}

fn authenticated_openai_passthrough_router<C>(
    state: AuthenticatedProviderPassthroughState<C>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    apply_openai_passthrough_routes(
        Router::new(),
        MethodRouter::new().fallback(authenticated_forward_openai_passthrough::<C>),
    )
    .merge(apply_stored_chat_completion_passthrough_routes(
        Router::new(),
        MethodRouter::new().fallback(authenticated_forward_openai_passthrough::<C>),
    ))
    .with_state(state)
}

fn authenticated_provider_passthrough_router<C>(
    state: AuthenticatedProviderPassthroughState<C>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    apply_provider_native_passthrough_routes(
        Router::new(),
        MethodRouter::new().fallback(authenticated_forward_provider_passthrough::<C>),
    )
    .with_state(state)
}

fn provider_passthrough_router_with_runtime(runtime: ProviderPassthroughRuntime) -> Router {
    apply_provider_native_passthrough_routes(
        Router::new(),
        MethodRouter::new().fallback(forward_provider_passthrough),
    )
    .with_state(runtime)
}

async fn openai_passthrough_not_configured(request: Request) -> Response {
    if let Some(response) = reject_unsupported_openai_method(&request) {
        return response;
    }
    passthrough_not_configured(
        "openai_passthrough_not_configured",
        "OpenAI-compatible passthrough route is declared but no upstream relay is configured.",
        request.uri().path(),
    )
}

async fn provider_passthrough_not_configured(request: Request) -> Response {
    if let Some(response) = reject_unsupported_provider_route(&request) {
        return response;
    }
    passthrough_not_configured(
        "provider_passthrough_not_configured",
        "Provider-native passthrough route is declared but no upstream relay is configured.",
        request.uri().path(),
    )
}

async fn forward_provider_passthrough(
    axum::extract::State(runtime): axum::extract::State<ProviderPassthroughRuntime>,
    request: Request,
) -> Response {
    if let Some(response) = reject_unsupported_provider_route(&request) {
        return response;
    }
    match runtime.forward(request, None).await {
        Ok(response) => response,
        Err(error) => passthrough_forward_failed("provider_passthrough_relay_failed", error),
    }
}

async fn authenticated_forward_provider_passthrough<C>(
    State(state): State<AuthenticatedProviderPassthroughState<C>>,
    headers: HeaderMap,
    uri: Uri,
    mut request: Request,
) -> Response
where
    C: PricingCatalog + Send + Sync + 'static,
{
    if let Some(response) = reject_unsupported_provider_route(&request) {
        return response;
    }
    let context = match authenticate_passthrough_api_key(&state, &headers, &uri) {
        Ok(context) => context,
        Err(response) => return response,
    };
    *request.uri_mut() = match sanitize_authenticated_gateway_uri(&uri) {
        Ok(uri) => uri,
        Err(response) => return response,
    };
    let result = state
        .runtime
        .forward_authenticated(
            state.catalog.as_ref(),
            request,
            &context,
            state.usage_recorder.as_ref(),
        )
        .await;
    match result {
        Ok(response) => response,
        Err(error) => passthrough_forward_failed("provider_passthrough_relay_failed", error),
    }
}

async fn authenticated_forward_openai_passthrough<C>(
    State(state): State<AuthenticatedProviderPassthroughState<C>>,
    headers: HeaderMap,
    uri: Uri,
    mut request: Request,
) -> Response
where
    C: PricingCatalog + Send + Sync + 'static,
{
    if let Some(response) = reject_unsupported_openai_method(&request) {
        return response;
    }
    if let Err(response) = authenticate_passthrough_api_key(&state, &headers, &uri) {
        return response;
    }
    *request.uri_mut() = match sanitize_authenticated_gateway_uri(&uri) {
        Ok(uri) => uri,
        Err(response) => return response,
    };
    match state.runtime.forward_openai(request).await {
        Ok(response) => response,
        Err(error) => passthrough_forward_failed("openai_passthrough_relay_failed", error),
    }
}

fn passthrough_not_configured(code: &'static str, message: &'static str, path: &str) -> Response {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "error": {
                "message": message,
                "type": "server_error",
                "param": null,
                "code": code,
                "path": path
            }
        })),
    )
        .into_response()
}

fn passthrough_relay_failed(_code: &'static str, message: String) -> Response {
    let error = InvocationError::new(InvocationErrorKind::ProviderPassthroughFailed, message);
    response_from_invocation_error(&error)
}

fn passthrough_forward_failed(code: &'static str, error: ProviderPassthroughError) -> Response {
    match error {
        ProviderPassthroughError::RequestBodyTooLarge { limit } => passthrough_client_error(
            StatusCode::PAYLOAD_TOO_LARGE,
            "payload_too_large",
            format!("provider passthrough request body exceeds {limit} bytes"),
        ),
        ProviderPassthroughError::InvalidRequest(message) => {
            passthrough_client_error(StatusCode::BAD_REQUEST, "invalid_request", message)
        }
        ProviderPassthroughError::StreamingAccountingUnavailable => passthrough_server_error(
            StatusCode::NOT_IMPLEMENTED,
            "provider_adapter_streaming_accounting_unavailable",
            "authenticated provider adapter streaming requires a terminal usage envelope",
        ),
        ProviderPassthroughError::Relay(message) => passthrough_relay_failed(code, message),
    }
}

fn passthrough_server_error(
    status: StatusCode,
    code: &'static str,
    message: &'static str,
) -> Response {
    (
        status,
        Json(json!({
            "error": {
                "message": message,
                "type": "server_error",
                "param": null,
                "code": code,
            }
        })),
    )
        .into_response()
}

fn passthrough_client_error(status: StatusCode, code: &'static str, message: String) -> Response {
    (
        status,
        Json(json!({
            "error": {
                "message": message,
                "type": "invalid_request_error",
                "param": null,
                "code": code,
            }
        })),
    )
        .into_response()
}

struct AuthenticatedProviderPassthroughState<C> {
    runtime: ProviderPassthroughRuntime,
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    secret_resolver: Option<Arc<dyn ProviderSecretResolver + Send + Sync>>,
    usage_recorder: Option<UsageRecorder>,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
}

impl<C> Clone for AuthenticatedProviderPassthroughState<C> {
    fn clone(&self) -> Self {
        Self {
            runtime: self.runtime.clone(),
            catalog: Arc::clone(&self.catalog),
            api_key_hasher: Arc::clone(&self.api_key_hasher),
            secret_resolver: self.secret_resolver.clone(),
            usage_recorder: self.usage_recorder.clone(),
            query_string_api_key_policy: self.query_string_api_key_policy,
        }
    }
}

fn authenticate_passthrough_api_key<C>(
    state: &AuthenticatedProviderPassthroughState<C>,
    headers: &HeaderMap,
    uri: &Uri,
) -> Result<AuthenticatedApiKeyContext, Response>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    authenticate_gateway_api_key(
        state.catalog.as_ref(),
        state.api_key_hasher.as_ref(),
        headers,
        uri,
        state.query_string_api_key_policy,
    )
}

impl ProviderPassthroughRuntime {
    fn from_config(config: ProviderRelayConfig) -> Self {
        Self::from_config_with_adapter(config, None)
    }

    fn from_config_for_development(config: ProviderRelayConfig) -> Self {
        Self::from_config_with_adapter_for_development(config, None)
    }

    fn from_config_with_adapter(
        config: ProviderRelayConfig,
        adapter_config: Option<ProviderAdapterConfig>,
    ) -> Self {
        Self::from_config_with_adapter_and_body_max_bytes(
            config,
            adapter_config,
            RequestLimitsConfig::DEFAULT_GATEWAY_INVOCATION_BODY_MAX_BYTES,
        )
    }

    fn from_config_with_adapter_and_body_max_bytes(
        config: ProviderRelayConfig,
        adapter_config: Option<ProviderAdapterConfig>,
        body_max_bytes: usize,
    ) -> Self {
        Self::from_config_with_adapter_and_body_max_bytes_and_transport(
            config,
            adapter_config,
            body_max_bytes,
            default_provider_passthrough_response_timeout(),
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    fn from_config_with_adapter_and_body_max_bytes_and_transport(
        config: ProviderRelayConfig,
        adapter_config: Option<ProviderAdapterConfig>,
        body_max_bytes: usize,
        response_timeout: Duration,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        Self::from_optional_config_with_adapter_and_outbound_target_policy_and_transport(
            Some(config),
            adapter_config,
            OutboundTargetPolicy::Production,
            body_max_bytes,
            response_timeout,
            http_pool_config,
        )
    }

    fn from_config_with_adapter_for_development(
        config: ProviderRelayConfig,
        adapter_config: Option<ProviderAdapterConfig>,
    ) -> Self {
        Self::from_optional_config_with_adapter_and_outbound_target_policy_and_transport(
            Some(config),
            adapter_config,
            OutboundTargetPolicy::Development,
            RequestLimitsConfig::DEFAULT_GATEWAY_INVOCATION_BODY_MAX_BYTES,
            default_provider_passthrough_response_timeout(),
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    fn from_optional_config_with_adapter(
        config: Option<ProviderRelayConfig>,
        adapter_config: Option<ProviderAdapterConfig>,
    ) -> Self {
        Self::from_optional_config_with_adapter_and_outbound_target_policy(
            config,
            adapter_config,
            OutboundTargetPolicy::Production,
            RequestLimitsConfig::DEFAULT_GATEWAY_INVOCATION_BODY_MAX_BYTES,
        )
    }

    fn from_optional_config_with_adapter_and_outbound_target_policy(
        config: Option<ProviderRelayConfig>,
        adapter_config: Option<ProviderAdapterConfig>,
        outbound_target_policy: OutboundTargetPolicy,
        body_max_bytes: usize,
    ) -> Self {
        Self::from_optional_config_with_adapter_and_outbound_target_policy_and_transport(
            config,
            adapter_config,
            outbound_target_policy,
            body_max_bytes,
            default_provider_passthrough_response_timeout(),
            ProviderRelayHttpPoolConfig::default(),
        )
    }

    fn from_optional_config_with_adapter_and_outbound_target_policy_and_transport(
        config: Option<ProviderRelayConfig>,
        adapter_config: Option<ProviderAdapterConfig>,
        outbound_target_policy: OutboundTargetPolicy,
        body_max_bytes: usize,
        response_timeout: Duration,
        http_pool_config: ProviderRelayHttpPoolConfig,
    ) -> Self {
        let openai_target = config
            .as_ref()
            .and_then(ProviderRelayConfig::openai_relay)
            .map(|relay| {
                ProviderPassthroughTarget::new(
                    "openai",
                    relay.base_url().trim_end_matches('/').to_owned(),
                    ProviderPassthroughAuth::bearer(relay.bearer_token())
                        .expect("OpenAI relay bearer token is validated by config parser"),
                    Vec::new(),
                )
            });
        Self {
            client: build_provider_passthrough_client(outbound_target_policy, http_pool_config),
            outbound_target_policy,
            providers: Arc::new(
                openai_target
                    .into_iter()
                    .chain(
                        config
                            .as_ref()
                            .into_iter()
                            .flat_map(ProviderRelayConfig::provider_passthrough_targets)
                            .map(|target| {
                                ProviderPassthroughTarget::new(
                                    target.provider(),
                                    target.base_url().trim_end_matches('/').to_owned(),
                                    target.auth().clone(),
                                    target.default_headers().to_vec(),
                                )
                            }),
                    )
                    .collect(),
            ),
            adapter: adapter_config
                .filter(|config| !config.routes().is_empty())
                .map(|config| ProviderNativeAdapterRuntime {
                    registry: Arc::new(ProviderAdapterRegistry::new(config.routes().to_vec())),
                    client: match outbound_target_policy {
                        OutboundTargetPolicy::Production => {
                            ProviderAdapterHttpClient::new(config.gateway_token().to_owned())
                        }
                        OutboundTargetPolicy::Development => {
                            ProviderAdapterHttpClient::for_development(
                                config.gateway_token().to_owned(),
                            )
                        }
                    },
                }),
            body_max_bytes,
            response_timeout,
        }
    }

    async fn read_request_body(
        &self,
        body: Body,
    ) -> Result<bytes::Bytes, ProviderPassthroughError> {
        Limited::new(body, self.body_max_bytes)
            .collect()
            .await
            .map_err(|error| {
                if error.downcast_ref::<LengthLimitError>().is_some() {
                    ProviderPassthroughError::RequestBodyTooLarge {
                        limit: self.body_max_bytes,
                    }
                } else {
                    ProviderPassthroughError::Relay(format!(
                        "failed to read provider passthrough request body: {error}"
                    ))
                }
            })
            .map(|collected| collected.to_bytes())
    }

    async fn forward(
        &self,
        request: Request,
        context: Option<&AuthenticatedApiKeyContext>,
    ) -> Result<Response, ProviderPassthroughError> {
        let target = self
            .target_for_path(request.uri().path())
            .ok_or_else(|| "provider passthrough target is not configured".to_owned())?;
        let standard_path = standard_path_from_passthrough_uri(request.uri())?;
        if let Some(adapter) = &self.adapter {
            let lookup = ProviderAdapterLookup {
                supplier_code: target.provider(),
                method: request.method().as_str(),
                standard_path: standard_path.as_str(),
                capability: None,
                endpoint_key: None,
            };
            if let ProviderInvocationMode::InternalHttpAdapter(route) =
                adapter.registry.resolve_standard_path(&lookup).mode
            {
                let (_, result, _) = self
                    .invoke_adapter(
                        request,
                        context,
                        target,
                        adapter,
                        route,
                        standard_path,
                        0,
                        "global",
                        None,
                    )
                    .await?;
                return adapter_invoke_result_response(result).map_err(Into::into);
            }
        }
        let upstream_uri = build_provider_passthrough_uri(target, request.uri())?;
        self.forward_to_target(request, target, upstream_uri).await
    }

    async fn forward_authenticated<C>(
        &self,
        catalog: &C,
        request: Request,
        context: &AuthenticatedApiKeyContext,
        usage_recorder: Option<&UsageRecorder>,
    ) -> Result<Response, ProviderPassthroughError>
    where
        C: PricingCatalog + Send + Sync + 'static,
    {
        let target = self
            .target_for_path(request.uri().path())
            .ok_or_else(|| "provider passthrough target is not configured".to_owned())?;
        let standard_path = standard_path_from_passthrough_uri(request.uri())?;
        if let Some(adapter) = &self.adapter {
            let lookup = ProviderAdapterLookup {
                supplier_code: target.provider(),
                method: request.method().as_str(),
                standard_path: standard_path.as_str(),
                capability: None,
                endpoint_key: None,
            };
            if let ProviderInvocationMode::InternalHttpAdapter(route) =
                adapter.registry.resolve_standard_path(&lookup).mode
            {
                ensure_authenticated_adapter_route_supported(&route)?;
                let (invocation, result, user_agent) = self
                    .invoke_adapter(
                        request,
                        Some(context),
                        target,
                        adapter,
                        route,
                        standard_path,
                        0,
                        "global",
                        None,
                    )
                    .await?;
                return match result {
                    AdapterInvokeResult::Buffered(response) => {
                        record_adapter_usage_lines(
                            catalog,
                            usage_recorder,
                            context,
                            &invocation,
                            &response,
                            user_agent.as_deref(),
                        )
                        .await?;
                        adapter_invocation_response(response).map_err(Into::into)
                    }
                    AdapterInvokeResult::Streaming {
                        status_code,
                        content_type,
                        stream_body,
                    } => adapter_streaming_response(status_code, content_type, stream_body)
                        .map_err(Into::into),
                };
            }
        }
        let upstream_uri = build_provider_passthrough_uri(target, request.uri())?;
        self.forward_to_target(request, target, upstream_uri).await
    }

    async fn forward_openai(&self, request: Request) -> Result<Response, ProviderPassthroughError> {
        let target = self
            .providers
            .iter()
            .find(|target| target.provider() == "openai")
            .ok_or_else(|| "OpenAI-compatible passthrough target is not configured".to_owned())?;
        let upstream_uri = build_openai_passthrough_uri(target, request.uri())?;
        self.forward_to_target(request, target, upstream_uri).await
    }

    async fn forward_to_target(
        &self,
        request: Request,
        target: &ProviderPassthroughTarget,
        upstream_uri: Uri,
    ) -> Result<Response, ProviderPassthroughError> {
        validate_provider_passthrough_target(&upstream_uri, self.outbound_target_policy)?;
        let (parts, body) = request.into_parts();
        let body = self.read_request_body(body).await?;
        forward_provider_passthrough_to_target(
            &self.client,
            self.outbound_target_policy,
            parts,
            body,
            target,
            upstream_uri,
            self.response_timeout,
        )
        .await
        .map_err(Into::into)
    }

    async fn invoke_adapter(
        &self,
        request: Request,
        context: Option<&AuthenticatedApiKeyContext>,
        target: &ProviderPassthroughTarget,
        adapter: &ProviderNativeAdapterRuntime,
        route: ProviderAdapterRouteConfig,
        standard_path: String,
        account_id: i64,
        region_code: &str,
        timeout_ms: Option<u64>,
    ) -> Result<
        (
            AdapterInvocationRequest,
            AdapterInvokeResult,
            Option<String>,
        ),
        ProviderPassthroughError,
    > {
        let (parts, body) = request.into_parts();
        let user_agent = request_header_value(&parts.headers, USER_AGENT.as_str())
            .and_then(|value| normalize_user_agent_header(value.as_str()));
        let body = self.read_request_body(body).await?;
        let request_body = provider_adapter_request_body(&body)?;
        let invocation = build_provider_native_adapter_invocation(
            &parts,
            target,
            &route,
            standard_path,
            context,
            request_body,
            account_id,
            region_code,
            timeout_ms,
        );
        let response = adapter
            .client
            .invoke(&route, invocation.clone())
            .await
            .map_err(provider_adapter_http_error)?;
        Ok((invocation, response, user_agent))
    }

    fn target_for_path(&self, path: &str) -> Option<&ProviderPassthroughTarget> {
        provider_from_passthrough_path(path).and_then(|provider| {
            self.providers
                .iter()
                .find(|target| target.provider() == provider)
        })
    }

    fn has_openai_target(&self) -> bool {
        self.providers
            .iter()
            .any(|target| target.provider() == "openai")
    }
}

fn ensure_authenticated_adapter_route_supported(
    route: &ProviderAdapterRouteConfig,
) -> Result<(), ProviderPassthroughError> {
    if matches!(
        route.invocation_shape,
        AdapterInvocationShape::SseStream | AdapterInvocationShape::ByteStream
    ) {
        return Err(ProviderPassthroughError::StreamingAccountingUnavailable);
    }
    Ok(())
}

async fn record_adapter_usage_lines<C>(
    catalog: &C,
    usage_recorder: Option<&UsageRecorder>,
    context: &AuthenticatedApiKeyContext,
    invocation: &AdapterInvocationRequest,
    response: &AdapterInvocationResponse,
    user_agent: Option<&str>,
) -> Result<(), String>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let Some(usage_recorder) = usage_recorder else {
        return Ok(());
    };
    if !(200..=299).contains(&response.status_code) || response.usage.usage_lines.is_empty() {
        return Ok(());
    }
    validate_adapter_usage_line_count(response.usage.usage_lines.len())?;
    let commands = response
        .usage
        .usage_lines
        .iter()
        .enumerate()
        .map(|(line_index, usage_line)| {
            adapter_usage_line_command(
                catalog, context, invocation, response, usage_line, line_index, user_agent,
            )
            .map_err(|error| {
                format!(
                    "provider adapter usage recording failed for meter {}: {error}",
                    usage_line.meter_code
                )
            })
        })
        .collect::<Result<Vec<_>, _>>()?;
    usage_recorder
        .record_gateway_usage_batch(commands)
        .await
        .map_err(|error| format!("provider adapter usage batch recording failed: {error}"))
}

fn validate_adapter_usage_line_count(count: usize) -> Result<(), String> {
    if count > MAX_ADAPTER_USAGE_LINES {
        return Err(format!(
            "provider adapter usage recording rejected {} lines; maximum is {}",
            count, MAX_ADAPTER_USAGE_LINES
        ));
    }
    Ok(())
}

fn adapter_usage_line_command<C>(
    catalog: &C,
    context: &AuthenticatedApiKeyContext,
    invocation: &AdapterInvocationRequest,
    response: &AdapterInvocationResponse,
    usage_line: &AdapterUsageLine,
    line_index: usize,
    user_agent: Option<&str>,
) -> DomainResult<GatewayUsageRecordCommand>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let meter_code = usage_line.meter_code.trim();
    if meter_code.is_empty() {
        return Err(DomainError::new(
            "adapter usage line meter_code is required",
        ));
    }
    let billing_meter = BillingMeter::from_code(meter_code);
    if billing_meter == BillingMeter::Unknown {
        return Err(DomainError::new(format!(
            "adapter usage line meter_code is not supported: {meter_code}"
        )));
    }

    let quantity = GatewayUsageQuantity::for_meter(
        billing_meter.clone(),
        usage_line.billable_quantity.as_str(),
    )?;
    let requested_model_catalog_key = adapter_requested_model_catalog_key(invocation, usage_line)?;
    let catalog_key = requested_model_catalog_key.clone();
    let provider_native_model = usage_line
        .provider_native_model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| provider_native_model_id(&invocation.provider.provider_model));
    let requested_model = provider_native_model.clone();
    let region_code = adapter_provider_region_code(invocation)?;
    let price = PricingResolver::new(catalog).resolve(ResolveModelPriceQuery {
        api_key_id: context.api_key_id,
        account_group_id: Some(context.group_id),
        model: catalog_key.clone(),
        billing_meter: billing_meter.clone(),
        supplier_code: Some(invocation.provider.supplier_code.clone()),
        account_id: Some(invocation.provider.account_id),
        region_code: Some(region_code.clone()),
    })?;
    let official_reference_amount = adapter_meter_amount(
        price.official_reference.unit_price.unit_price,
        quantity.billable_quantity.as_str(),
        &billing_meter,
    )?;
    let upstream_cost_amount = match price.procurement_cost.as_ref() {
        Some(procurement_cost) => adapter_meter_amount(
            procurement_cost.unit_price,
            quantity.billable_quantity.as_str(),
            &billing_meter,
        )?,
        None => DecimalValue::ZERO,
    };
    let customer_charge_amount = adapter_meter_amount(
        price.customer_charge.unit_price,
        quantity.billable_quantity.as_str(),
        &billing_meter,
    )?;
    let token_counts = adapter_token_counts(&billing_meter, quantity.billable_quantity.as_str())?;
    let pricing_snapshot = adapter_usage_pricing_snapshot(
        invocation,
        usage_line,
        line_index,
        &catalog_key,
        &requested_model_catalog_key,
        &requested_model,
        &provider_native_model,
        &billing_meter,
        &price,
    );

    Ok(GatewayUsageRecordCommand {
        request_id: invocation
            .invocation
            .request_id
            .clone()
            .unwrap_or_else(generate_server_request_id),
        trace_id: invocation.invocation.trace_id.clone(),
        tenant_id: context.tenant_id,
        organization_id: context.organization_id,
        user_id: context.user_id,
        api_key_id: context.api_key_id,
        api_key_name_snapshot: context.api_key_name_snapshot.clone(),
        account_group_id: context.group_id,
        upstream_account_group_snapshot: context.group_code.clone(),
        catalog_key,
        requested_model,
        requested_model_catalog_key,
        supplier_code: invocation.provider.supplier_code.clone(),
        account_id: invocation.provider.account_id,
        provider_model: provider_native_model.clone(),
        provider_native_model,
        region_code,
        request_path: invocation.invocation.standard_path.clone(),
        http_method: invocation.invocation.method.clone(),
        user_agent: user_agent.map(str::to_owned),
        http_status: response.status_code,
        streaming: invocation.invocation.stream,
        modality: adapter_modality_for_usage_line(invocation, &billing_meter),
        usage_type: adapter_usage_type_for_line(&billing_meter, line_index),
        billing_meter_code: billing_meter.code().to_owned(),
        billable_quantity: quantity.billable_quantity,
        prompt_tokens: token_counts.prompt_tokens,
        completion_tokens: token_counts.completion_tokens,
        cached_tokens: token_counts.cached_tokens,
        total_tokens: token_counts.total_tokens,
        request_count: quantity.request_count,
        result_count: quantity.result_count,
        item_count: quantity.item_count,
        character_count: quantity.character_count,
        image_count: quantity.image_count,
        audio_seconds: quantity.audio_seconds,
        video_seconds: quantity.video_seconds,
        latency_ms: None,
        ttft_ms: None,
        provider_error_code: None,
        error_type: None,
        error_message_masked: None,
        base_input_unit_price: price
            .customer_charge_before_sale_multiplier
            .to_fixed_string(6),
        base_output_unit_price: "0.000000".to_owned(),
        cache_read_unit_price: "0.000000".to_owned(),
        rate_multiplier: price.sale_multiplier.to_fixed_string(6),
        reference_multiplier: price.reference_multiplier.to_fixed_string(6),
        official_reference_amount: official_reference_amount
            .to_fixed_string(USAGE_AMOUNT_DECIMAL_DIGITS),
        customer_charge_amount: customer_charge_amount.to_fixed_string(USAGE_AMOUNT_DECIMAL_DIGITS),
        upstream_cost_amount: upstream_cost_amount.to_fixed_string(USAGE_AMOUNT_DECIMAL_DIGITS),
        currency: price.customer_charge.currency,
        pricing_plan_code: price.pricing_plan_code,
        pricing_snapshot,
    })
}

fn adapter_requested_model_catalog_key(
    invocation: &AdapterInvocationRequest,
    usage_line: &AdapterUsageLine,
) -> DomainResult<String> {
    if let Some(catalog_key) = usage_line
        .requested_model_catalog_key
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        ensure_canonical_model_catalog_key(catalog_key, "requestedModelCatalogKey")?;
        return Ok(catalog_key.to_owned());
    }
    let provider_model = invocation.provider.provider_model.trim();
    let catalog_key = canonical_provider_native_catalog_key(
        invocation.provider.supplier_code.as_str(),
        provider_model,
    );
    ensure_canonical_model_catalog_key(&catalog_key, "providerModel")?;
    Ok(catalog_key)
}

fn adapter_provider_region_code(invocation: &AdapterInvocationRequest) -> DomainResult<String> {
    let region_code = invocation.provider.region_code.trim();
    if region_code.is_empty() {
        return Err(DomainError::new(
            "adapter provider regionCode is required for region-scoped deployment pricing",
        ));
    }
    Ok(region_code.to_owned())
}

fn adapter_meter_amount(
    unit_price: DecimalValue,
    billable_quantity: &str,
    billing_meter: &BillingMeter,
) -> DomainResult<DecimalValue> {
    let amount = unit_price.checked_multiply(DecimalValue::parse(billable_quantity)?)?;
    if adapter_meter_uses_million_token_unit(billing_meter) {
        amount.checked_divide(DecimalValue::parse(TOKEN_BILLING_UNIT_SIZE_DECIMAL)?)
    } else {
        Ok(amount)
    }
}

fn adapter_meter_uses_million_token_unit(billing_meter: &BillingMeter) -> bool {
    matches!(
        billing_meter,
        BillingMeter::LlmInputToken
            | BillingMeter::LlmOutputToken
            | BillingMeter::LlmReasoningToken
            | BillingMeter::LlmCacheWriteToken
            | BillingMeter::LlmCacheReadToken
            | BillingMeter::EmbeddingInputToken
            | BillingMeter::AudioInputToken
            | BillingMeter::AudioOutputToken
            | BillingMeter::ImageInputToken
            | BillingMeter::ImageOutputToken
            | BillingMeter::VideoInputToken
            | BillingMeter::VideoOutputToken
    )
}

#[derive(Debug, Clone, Copy)]
struct AdapterTokenCounts {
    prompt_tokens: i64,
    completion_tokens: i64,
    cached_tokens: i64,
    total_tokens: i64,
}

fn adapter_token_counts(
    billing_meter: &BillingMeter,
    billable_quantity: &str,
) -> DomainResult<AdapterTokenCounts> {
    if !adapter_meter_uses_million_token_unit(billing_meter) {
        return Ok(AdapterTokenCounts {
            prompt_tokens: 0,
            completion_tokens: 0,
            cached_tokens: 0,
            total_tokens: 0,
        });
    }
    let tokens = billable_quantity.trim().parse::<i64>().map_err(|_| {
        DomainError::new(format!(
            "token usage line quantity must be an integer: {billable_quantity}"
        ))
    })?;
    match billing_meter {
        BillingMeter::LlmInputToken
        | BillingMeter::EmbeddingInputToken
        | BillingMeter::AudioInputToken
        | BillingMeter::ImageInputToken
        | BillingMeter::VideoInputToken => Ok(AdapterTokenCounts {
            prompt_tokens: tokens,
            completion_tokens: 0,
            cached_tokens: 0,
            total_tokens: tokens,
        }),
        BillingMeter::LlmCacheWriteToken | BillingMeter::LlmCacheReadToken => {
            Ok(AdapterTokenCounts {
                prompt_tokens: 0,
                completion_tokens: 0,
                cached_tokens: tokens,
                total_tokens: tokens,
            })
        }
        _ => Ok(AdapterTokenCounts {
            prompt_tokens: 0,
            completion_tokens: tokens,
            cached_tokens: 0,
            total_tokens: tokens,
        }),
    }
}

fn adapter_modality_for_usage_line(
    invocation: &AdapterInvocationRequest,
    billing_meter: &BillingMeter,
) -> i64 {
    match billing_meter {
        BillingMeter::ApiRequest
        | BillingMeter::ApiResult
        | BillingMeter::ApiItem
        | BillingMeter::ToolCall
        | BillingMeter::WebSearchCall
        | BillingMeter::FileSearchCall
        | BillingMeter::CodeInterpreterSession
        | BillingMeter::ContainerSession => adapter_modality_from_invocation(invocation)
            .unwrap_or_else(|| adapter_modality_for_meter(billing_meter)),
        _ => adapter_modality_for_meter(billing_meter),
    }
}

fn adapter_modality_from_invocation(invocation: &AdapterInvocationRequest) -> Option<i64> {
    let value = format!(
        "{} {}",
        invocation.invocation.endpoint_key, invocation.invocation.standard_path
    )
    .to_ascii_lowercase();
    if value.contains("embedding") || value.contains("embeddings") {
        return Some(MODALITY_EMBEDDING);
    }
    if value.contains("rerank") || value.contains("ranking") {
        return Some(MODALITY_RERANK);
    }
    if value.contains("video") || value.contains("vidu") || value.contains("kling") {
        return Some(MODALITY_VIDEO);
    }
    if value.contains("image") || value.contains("images") {
        return Some(MODALITY_IMAGE);
    }
    if value.contains("music") || value.contains("sfx") || value.contains("sound") {
        return Some(MODALITY_MUSIC);
    }
    if value.contains("audio")
        || value.contains("speech")
        || value.contains("voice")
        || value.contains("transcription")
    {
        return Some(MODALITY_AUDIO);
    }
    None
}

fn adapter_modality_for_meter(billing_meter: &BillingMeter) -> i64 {
    match billing_meter {
        BillingMeter::EmbeddingInputToken | BillingMeter::EmbeddingImage => MODALITY_EMBEDDING,
        BillingMeter::ImageInputToken
        | BillingMeter::ImageOutputToken
        | BillingMeter::ImageResult
        | BillingMeter::ImagePixel
        | BillingMeter::ImageMegapixel => MODALITY_IMAGE,
        BillingMeter::AudioInputToken
        | BillingMeter::AudioOutputToken
        | BillingMeter::AudioInputSecond
        | BillingMeter::AudioOutputSecond
        | BillingMeter::AudioInputMinute
        | BillingMeter::AudioOutputMinute
        | BillingMeter::TtsInputCharacter
        | BillingMeter::SpeechCharacter
        | BillingMeter::SttAudioMinute => MODALITY_AUDIO,
        BillingMeter::MusicOutputSecond | BillingMeter::SfxResult => MODALITY_MUSIC,
        BillingMeter::VideoInputToken
        | BillingMeter::VideoOutputToken
        | BillingMeter::VideoInputSecond
        | BillingMeter::VideoOutputSecond
        | BillingMeter::VideoResult => MODALITY_VIDEO,
        BillingMeter::RerankSearch | BillingMeter::RerankDocument => MODALITY_RERANK,
        _ => MODALITY_TEXT,
    }
}

fn adapter_usage_type_for_line(billing_meter: &BillingMeter, line_index: usize) -> i64 {
    ADAPTER_USAGE_TYPE_BASE + adapter_billing_meter_ordinal(billing_meter) * 100 + line_index as i64
}

fn adapter_billing_meter_ordinal(billing_meter: &BillingMeter) -> i64 {
    match billing_meter {
        BillingMeter::LlmInputToken => 1,
        BillingMeter::LlmOutputToken => 2,
        BillingMeter::LlmReasoningToken => 3,
        BillingMeter::LlmCacheWriteToken => 4,
        BillingMeter::LlmCacheReadToken => 5,
        BillingMeter::LlmCacheStorageTokenHour => 6,
        BillingMeter::EmbeddingInputToken => 7,
        BillingMeter::EmbeddingImage => 8,
        BillingMeter::ImageInputToken => 9,
        BillingMeter::ImageOutputToken => 10,
        BillingMeter::ImageResult => 11,
        BillingMeter::ImagePixel => 12,
        BillingMeter::ImageMegapixel => 13,
        BillingMeter::AudioInputToken => 14,
        BillingMeter::AudioOutputToken => 15,
        BillingMeter::AudioInputSecond => 16,
        BillingMeter::AudioOutputSecond => 17,
        BillingMeter::AudioInputMinute => 18,
        BillingMeter::AudioOutputMinute => 19,
        BillingMeter::TtsInputCharacter => 20,
        BillingMeter::SpeechCharacter => 21,
        BillingMeter::SttAudioMinute => 22,
        BillingMeter::VideoInputToken => 23,
        BillingMeter::VideoOutputToken => 24,
        BillingMeter::VideoInputSecond => 25,
        BillingMeter::VideoOutputSecond => 26,
        BillingMeter::VideoResult => 27,
        BillingMeter::MusicOutputSecond => 28,
        BillingMeter::SfxResult => 29,
        BillingMeter::RerankSearch => 30,
        BillingMeter::RerankDocument => 31,
        BillingMeter::ApiRequest => 32,
        BillingMeter::ApiResult => 33,
        BillingMeter::ApiItem => 34,
        BillingMeter::ToolCall => 35,
        BillingMeter::WebSearchCall => 36,
        BillingMeter::FileSearchCall => 37,
        BillingMeter::CodeInterpreterSession => 38,
        BillingMeter::ContainerSession => 39,
        BillingMeter::StorageGbDay => 40,
        BillingMeter::BandwidthGb => 41,
        BillingMeter::Unknown => 99,
    }
}

fn adapter_usage_pricing_snapshot(
    invocation: &AdapterInvocationRequest,
    usage_line: &AdapterUsageLine,
    line_index: usize,
    catalog_key: &str,
    requested_model_catalog_key: &str,
    requested_model: &str,
    provider_native_model: &str,
    billing_meter: &BillingMeter,
    price: &sdkwork_clawrouter_router_service::application::ResolvedModelPrice,
) -> String {
    json!({
        "source": "provider_adapter_usage_line",
        "lineIndex": line_index,
        "meter": {
            "code": billing_meter.code(),
            "billableUnit": usage_line.billable_unit.as_deref(),
            "estimated": usage_line.estimated
        },
        "model": {
            "catalogKey": catalog_key,
            "requestedCatalogKey": requested_model_catalog_key,
            "model": requested_model,
            "providerNativeModel": provider_native_model
        },
        "provider": {
            "code": invocation.provider.supplier_code.as_str(),
            "accountId": invocation.provider.account_id,
            "regionCode": invocation.provider.region_code.as_str()
        },
        "pricingPlan": {
            "code": price.pricing_plan_code.as_str()
        },
        "group": {
            "code": price.group_code.as_str()
        },
        "multipliers": {
            "sale": price.sale_multiplier.to_fixed_string(6),
            "reference": price.reference_multiplier.to_fixed_string(6),
            "accountContractCost": price
                .account_contract_cost_multiplier
                .map(|multiplier| multiplier.to_fixed_string(6)),
            "accountGroupCost": price
                .account_group_cost_multiplier
                .map(|multiplier| multiplier.to_fixed_string(6)),
            "procurementCost": price
                .procurement_cost_multiplier
                .map(|multiplier| multiplier.to_fixed_string(6))
        },
        "unitPrice": {
            "officialReference": price.official_reference.unit_price.to_fixed_string(6),
            "customerBeforeSaleMultiplier": price
                .customer_charge_before_sale_multiplier
                .to_fixed_string(6),
            "customerCharge": price.customer_charge.to_fixed_string(6),
            "rawUpstreamCost": price
                .raw_upstream_cost
                .as_ref()
                .map(|upstream| upstream.unit_price.to_fixed_string(6))
                .unwrap_or_else(|| "0.000000".to_owned()),
            "procurementCost": price
                .procurement_cost
                .as_ref()
                .map(|cost| cost.to_fixed_string(6))
                .unwrap_or_else(|| "0.000000".to_owned()),
            "currency": price.customer_charge.currency.as_str()
        },
        "adapter": {
            "invocationId": invocation.invocation.id.as_str(),
            "endpointKey": invocation.invocation.endpoint_key.as_str(),
            "standardPath": invocation.invocation.standard_path.as_str(),
            "usageSnapshot": usage_line.pricing_snapshot.as_ref()
        }
    })
    .to_string()
}

fn build_openai_passthrough_uri(
    target: &ProviderPassthroughTarget,
    original_uri: &Uri,
) -> Result<Uri, String> {
    let path = target.normalize_openai_compatible_path(original_uri.path());
    let path_and_query = match original_uri.query() {
        Some(query) => format!("{path}?{query}"),
        None => path,
    };
    target
        .build_uri(path_and_query)
        .map_err(|error| format!("invalid OpenAI-compatible passthrough upstream URI: {error}"))
}

fn build_provider_passthrough_uri(
    target: &ProviderPassthroughTarget,
    original_uri: &Uri,
) -> Result<Uri, String> {
    let (_, provider_path) = split_provider_passthrough_path(original_uri.path())
        .ok_or_else(|| "provider passthrough path is invalid".to_owned())?;
    let path_and_query = match original_uri.query() {
        Some(query) => format!("/{provider_path}?{query}"),
        None => format!("/{provider_path}"),
    };
    target.build_uri(path_and_query)
}

fn standard_path_from_passthrough_uri(original_uri: &Uri) -> Result<String, String> {
    let (provider, provider_path) = split_provider_passthrough_path(original_uri.path())
        .ok_or_else(|| "provider passthrough path is invalid".to_owned())?;
    if is_standard_path_namespace(provider) {
        Ok(format!("/{provider}/{provider_path}"))
    } else {
        Ok(format!("/{provider_path}"))
    }
}

fn provider_adapter_request_body(body: &[u8]) -> Result<Value, ProviderPassthroughError> {
    if body.is_empty() {
        return Ok(Value::Null);
    }
    serde_json::from_slice(body).map_err(|error| {
        ProviderPassthroughError::InvalidRequest(format!(
            "provider adapter route requires a JSON request body: {error}"
        ))
    })
}

fn build_provider_native_adapter_invocation(
    parts: &axum::http::request::Parts,
    target: &ProviderPassthroughTarget,
    route: &ProviderAdapterRouteConfig,
    standard_path: String,
    context: Option<&AuthenticatedApiKeyContext>,
    request_body: Value,
    account_id: i64,
    region_code: &str,
    timeout_ms: Option<u64>,
) -> AdapterInvocationRequest {
    let endpoint_key = route
        .endpoint_key
        .clone()
        .unwrap_or_else(|| endpoint_key_from_standard_path(target.provider(), &standard_path));
    let provider_model = provider_model_from_body(&request_body, target.provider());
    AdapterInvocationRequest {
        invocation: AdapterInvocationMetadata {
            id: adapter_invocation_id(target.provider(), parts.method.as_str(), &endpoint_key),
            endpoint_key,
            method: parts.method.as_str().to_ascii_uppercase(),
            standard_path,
            shape: route.invocation_shape.clone(),
            stream: adapter_invocation_shape_streams(&route.invocation_shape),
            request_id: Some(generate_server_request_id()),
            trace_id: request_header_value(&parts.headers, "x-trace-id")
                .or_else(|| request_header_value(&parts.headers, "traceparent")),
        },
        subject: adapter_subject(context),
        provider: AdapterProviderContext {
            supplier_code: target.provider().to_owned(),
            account_id,
            region_code: normalized_adapter_provider_region_code(region_code),
            provider_model,
            base_url: Some(target.base_url().to_owned()),
            auth_profile: provider_passthrough_auth_profile_json(target),
            timeout_ms,
        },
        secret: AdapterSecret::GatewayResolved(provider_passthrough_secret_json(target)),
        body: request_body,
    }
}

fn normalized_adapter_provider_region_code(region_code: &str) -> String {
    let region_code = region_code.trim();
    if region_code.is_empty() {
        "global".to_owned()
    } else {
        region_code.to_owned()
    }
}

fn adapter_subject(context: Option<&AuthenticatedApiKeyContext>) -> AdapterSubject {
    match context {
        Some(context) => AdapterSubject {
            tenant_id: context.tenant_id,
            organization_id: context.organization_id,
            user_id: context.user_id,
            api_key_id: context.api_key_id,
            group_id: context.group_id,
            group_code: context.group_code.clone(),
            pricing_plan_code: context.pricing_plan_code.clone(),
        },
        None => AdapterSubject {
            tenant_id: 0,
            organization_id: 0,
            user_id: 0,
            api_key_id: 0,
            group_id: 0,
            group_code: "provider-passthrough".to_owned(),
            pricing_plan_code: "gateway".to_owned(),
        },
    }
}

fn provider_passthrough_auth_profile_json(target: &ProviderPassthroughTarget) -> Value {
    json!({
        "type": provider_passthrough_auth_type(target.auth().auth_type()),
        "name": target.auth().name(),
        "defaultHeaders": target.default_headers().iter().map(|header| {
            json!({
                "name": header.name(),
                "value": header.value(),
            })
        }).collect::<Vec<_>>(),
    })
}

fn provider_passthrough_secret_json(target: &ProviderPassthroughTarget) -> Value {
    json!({
        "auth": {
            "type": provider_passthrough_auth_type(target.auth().auth_type()),
            "name": target.auth().name(),
            "value": target.auth().value(),
        },
        "defaultHeaders": target.default_headers().iter().map(|header| {
            json!({
                "name": header.name(),
                "value": header.value(),
            })
        }).collect::<Vec<_>>(),
    })
}

fn provider_passthrough_auth_type(auth_type: ProviderPassthroughAuthType) -> &'static str {
    match auth_type {
        ProviderPassthroughAuthType::Bearer => "bearer",
        ProviderPassthroughAuthType::Header => "header",
        ProviderPassthroughAuthType::Query => "query",
    }
}

fn adapter_invocation_shape_streams(shape: &AdapterInvocationShape) -> bool {
    matches!(
        shape,
        AdapterInvocationShape::SseStream | AdapterInvocationShape::ByteStream
    )
}

fn endpoint_key_from_standard_path(provider: &str, standard_path: &str) -> String {
    if let Some(api_code) = provider_native_api_code_from_standard_path(provider, standard_path) {
        return api_code;
    }

    let normalized_provider = normalize_endpoint_key_segment(provider);
    let normalized_suffix = standard_path
        .trim_matches('/')
        .chars()
        .map(|character| {
            if matches!(character, '/' | '-') {
                '.'
            } else {
                character
            }
        })
        .collect::<String>()
        .trim_matches('.')
        .to_owned();
    let normalized_key = if normalized_suffix.is_empty() {
        format!("{normalized_provider}.unknown")
    } else if normalized_provider.is_empty()
        || normalized_suffix.starts_with(&format!("{normalized_provider}."))
    {
        normalized_suffix
    } else {
        format!("{normalized_provider}.{normalized_suffix}")
    };
    provider_native_api_code_from_endpoint_key(normalized_key.as_str()).unwrap_or(normalized_key)
}

#[allow(dead_code)]
fn standard_api_code_for_provider_adapter_route(
    route: &ProviderAdapterRouteConfig,
) -> Option<String> {
    route
        .endpoint_key
        .as_deref()
        .and_then(provider_native_api_code_from_endpoint_key)
        .or_else(|| {
            provider_native_api_code_from_standard_path(
                route.supplier_code.as_str(),
                route.standard_path_pattern.as_str(),
            )
        })
}

fn provider_native_api_code_from_standard_path(
    provider: &str,
    standard_path: &str,
) -> Option<String> {
    let provider = normalize_endpoint_key_segment(provider);
    let path = normalize_provider_api_path(provider.as_str(), standard_path);
    let api_code = match provider.as_str() {
        "anthropic" if path == "/v1/claude-code/sessions" => "anthropic.claude_code",
        "google" | "gemini" if path == "/v1beta/live/sessions" => "gemini.live",
        "google" | "gemini" if gemini_model_action_matches(path.as_str(), "generatecontent") => {
            "gemini.generate_content"
        }
        "google" | "gemini"
            if gemini_model_action_matches(path.as_str(), "streamgeneratecontent") =>
        {
            "gemini.stream_generate_content"
        }
        "google" | "gemini" if gemini_model_action_matches(path.as_str(), "embedcontent") => {
            "gemini.embed_content"
        }
        "google" | "gemini" if gemini_model_action_matches(path.as_str(), "generateimages") => {
            if path.contains("/nano-banana:") {
                "gemini.nano_banana.image_generation"
            } else {
                "gemini.image_generation"
            }
        }
        "google" | "gemini" if gemini_model_action_matches(path.as_str(), "generatevideos") => {
            "gemini.video_generation"
        }
        "kling" if path == "/v1/videos/text2video" => "kling.text_to_video",
        "kling" if path == "/v1/videos/image2video" => "kling.image_to_video",
        "kling" if path == "/v1/images/generations" => "kling.image_generation",
        "kling" if task_query_path_matches(path.as_str()) => "kling.task_query",
        "jimeng" if path == "/v1/images/generations" => "jimeng.image_generation",
        "jimeng" if path == "/v1/videos/generations" => "jimeng.video_generation",
        "jimeng" if task_query_path_matches(path.as_str()) => "jimeng.task_query",
        "volcengine" if path == "/v1/images/generations" => "volcengine.image_generation",
        "volcengine" if path == "/v1/videos/generations" => "volcengine.video_generation",
        "volcengine" if task_query_path_matches(path.as_str()) => "volcengine.task_query",
        "minimax" if path == "/v1/music_generation" => "minimax.music_generation",
        "minimax" if path == "/v1/music/generations" => "minimax.music_generation",
        "minimax" if path == "/v1/music/generation" => "minimax.music_generation",
        "vidu" if path == "/ent/v2/reference2image" => "vidu.reference_to_image",
        "vidu" if path == "/ent/v2/start-end2video" => "vidu.start_end_to_video",
        "tencent.cloud" if path == "/vidu/ent/v2/reference2image" => "vidu.reference_to_image",
        "tencent.cloud" if path == "/vidu/ent/v2/start-end2video" => "vidu.start_end_to_video",
        _ => return None,
    };
    Some(api_code.to_owned())
}

fn provider_native_api_code_from_endpoint_key(endpoint_key: &str) -> Option<String> {
    find_builtin_ai_route(endpoint_key).map(|route| route.api_code.to_owned())
}

#[allow(dead_code)]
fn provider_native_model_from_standard_path(path: &str) -> Option<String> {
    let (_, provider_path) = split_provider_passthrough_path(path)?;
    provider_path
        .strip_prefix("v1beta/models/")
        .and_then(|suffix| suffix.split_once(':').map(|(model, _)| model))
        .or_else(|| {
            provider_path
                .strip_prefix("v1/models/")
                .and_then(|suffix| suffix.split_once(':').map(|(model, _)| model))
        })
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn canonical_provider_native_catalog_key(
    supplier_code: &str,
    provider_native_model: &str,
) -> String {
    let supplier_code = supplier_code.trim();
    let provider_native_model = provider_native_model.trim();
    let provider_prefix = provider_native_model
        .split('/')
        .map(str::trim)
        .find(|part| !part.is_empty());
    if provider_prefix == Some(supplier_code) {
        provider_native_model.to_owned()
    } else {
        format!("{supplier_code}/{provider_native_model}")
    }
}

fn gemini_model_action_matches(path: &str, action: &str) -> bool {
    path.starts_with("/v1beta/models/") && path.ends_with(&format!(":{action}"))
}

fn task_query_path_matches(path: &str) -> bool {
    path == "/v1/tasks/{task_id}"
        || path
            .strip_prefix("/v1/tasks/")
            .is_some_and(|task_id| !task_id.trim().is_empty())
}

fn normalize_standard_api_path(value: &str) -> String {
    let value = value.trim();
    let value = if value.starts_with('/') {
        value.to_owned()
    } else {
        format!("/{value}")
    };
    value.to_ascii_lowercase()
}

fn normalize_provider_api_path(provider: &str, standard_path: &str) -> String {
    let path = normalize_standard_api_path(standard_path);
    path.strip_prefix(&format!("/{provider}/"))
        .map(|suffix| format!("/{suffix}"))
        .unwrap_or(path)
}

fn normalize_endpoint_key_segment(value: &str) -> String {
    value
        .trim()
        .trim_matches('/')
        .to_ascii_lowercase()
        .chars()
        .map(|character| {
            if matches!(character, '/' | '-' | ':') {
                '.'
            } else {
                character
            }
        })
        .collect::<String>()
        .trim_matches('.')
        .to_owned()
}

fn provider_model_from_body(body: &Value, fallback: &str) -> String {
    body.get("model")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback)
        .to_owned()
}

fn adapter_invocation_id(provider: &str, method: &str, endpoint_key: &str) -> String {
    format!(
        "provider-native-{}-{}-{}",
        provider.trim(),
        method.trim().to_ascii_lowercase(),
        endpoint_key
            .trim()
            .chars()
            .map(|character| {
                if matches!(character, '/' | ' ' | ':') {
                    '.'
                } else {
                    character
                }
            })
            .collect::<String>()
    )
}

fn request_header_value(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn provider_adapter_http_error(error: ProviderAdapterHttpError) -> String {
    let status = error
        .status_code
        .map(|status_code| format!(" HTTP {status_code}"))
        .unwrap_or_default();
    format!(
        "provider adapter invocation failed{status}: {}",
        error.message
    )
}

fn adapter_invocation_response(response: AdapterInvocationResponse) -> Result<Response, String> {
    let status = StatusCode::from_u16(response.status_code)
        .map_err(|error| format!("provider adapter returned invalid status code: {error}"))?;
    let mut builder = Response::builder().status(status);
    let mut has_content_type = false;
    for (name, value) in response.headers {
        if !should_forward_adapter_response_header(name.as_str()) {
            continue;
        }
        let header_name = HeaderName::from_bytes(name.as_bytes()).map_err(|error| {
            format!("provider adapter returned invalid response header name {name}: {error}")
        })?;
        let header_value = HeaderValue::from_str(value.as_str()).map_err(|error| {
            format!("provider adapter returned invalid response header value for {name}: {error}")
        })?;
        if header_name == axum::http::header::CONTENT_TYPE {
            has_content_type = true;
        }
        builder = builder.header(header_name, header_value);
    }
    if !has_content_type {
        builder = builder.header(axum::http::header::CONTENT_TYPE, "application/json");
    }
    let body = serde_json::to_vec(&response.body)
        .map_err(|error| format!("failed to serialize provider adapter response body: {error}"))?;
    builder
        .body(Body::from(body))
        .map_err(|error| format!("failed to build provider adapter response: {error}"))
}

fn adapter_invoke_result_response(result: AdapterInvokeResult) -> Result<Response, String> {
    match result {
        AdapterInvokeResult::Buffered(response) => adapter_invocation_response(response),
        AdapterInvokeResult::Streaming {
            status_code,
            content_type,
            stream_body,
        } => adapter_streaming_response(status_code, content_type, stream_body),
    }
}

fn adapter_streaming_response(
    status_code: u16,
    content_type: Option<String>,
    stream_body: Body,
) -> Result<Response, String> {
    let status = StatusCode::from_u16(status_code)
        .map_err(|error| format!("provider adapter returned invalid status code: {error}"))?;
    let content_type = content_type
        .ok_or_else(|| "provider adapter streaming response is missing content type".to_owned())?;
    let content_type = HeaderValue::from_str(content_type.as_str()).map_err(|error| {
        format!("provider adapter returned invalid streaming content type: {error}")
    })?;
    Response::builder()
        .status(status)
        .header(axum::http::header::CONTENT_TYPE, content_type)
        // Keep upstream reads coupled to downstream body polling; collecting
        // here would turn a live adapter stream back into an in-memory buffer.
        .body(stream_body)
        .map_err(|error| format!("failed to build provider adapter streaming response: {error}"))
}

fn should_forward_adapter_response_header(name: &str) -> bool {
    !matches!(
        name.to_ascii_lowercase().as_str(),
        "connection"
            | "keep-alive"
            | "proxy-authenticate"
            | "proxy-authorization"
            | "te"
            | "trailer"
            | "transfer-encoding"
            | "upgrade"
            | "content-length"
    )
}

fn provider_from_passthrough_path(path: &str) -> Option<&str> {
    split_provider_passthrough_path(path).map(|(provider, _)| provider)
}

fn split_provider_passthrough_path(path: &str) -> Option<(&str, &str)> {
    let path = path
        .strip_prefix("/provider/")
        .or_else(|| path.strip_prefix('/'))?;
    let (provider, provider_path) = path.split_once('/')?;
    (!provider.is_empty() && !provider_path.is_empty()).then_some((provider, provider_path))
}

fn is_standard_path_namespace(value: &str) -> bool {
    matches!(
        value,
        "openai"
            | "v1"
            | "google"
            | "anthropic"
            | "volcengine"
            | "minimax"
            | "suno"
            | "elevenlabs"
            | "midjourney"
            | "kling"
            | "vidu"
            | "nano-banana"
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_clawrouter_router_service::domain::ModelVendor;
    use sdkwork_clawrouter_router_service::domain::{
        AiModel, GatewayApiKey, ModelPrice, ModelUpstreamRoute, ModelVendorDefinition, Money,
        PriceSide, PricingPlan, UpstreamAccountGroup, UpstreamAccountRoute,
    };
    use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;

    #[tokio::test]
    async fn provider_passthrough_runtime_enforces_the_injected_request_body_limit() {
        let runtime =
            ProviderPassthroughRuntime::from_optional_config_with_adapter_and_outbound_target_policy(
                None,
                None,
                OutboundTargetPolicy::Development,
                3,
            );

        let accepted = runtime
            .read_request_body(Body::from("abc"))
            .await
            .expect("the configured request-body boundary must be inclusive");
        assert_eq!(b"abc", accepted.as_ref());

        let error = runtime
            .read_request_body(Body::from("abcd"))
            .await
            .expect_err("the injected request-body limit must reject an oversized payload");
        assert!(matches!(
            error,
            ProviderPassthroughError::RequestBodyTooLarge { limit: 3 }
        ));
    }

    #[test]
    fn passthrough_request_body_limit_maps_to_payload_too_large() {
        let response = passthrough_forward_failed(
            "provider_passthrough_relay_failed",
            ProviderPassthroughError::RequestBodyTooLarge { limit: 3 },
        );

        assert_eq!(StatusCode::PAYLOAD_TOO_LARGE, response.status());
    }

    #[test]
    fn provider_adapter_json_validation_maps_to_bad_request() {
        let error = provider_adapter_request_body(b"not-json")
            .expect_err("adapter invocation body must be JSON");
        let response = passthrough_forward_failed("provider_passthrough_relay_failed", error);

        assert_eq!(StatusCode::BAD_REQUEST, response.status());
    }

    #[tokio::test]
    async fn authenticated_adapter_streaming_shapes_fail_closed_before_invocation() {
        let adapter_config = ProviderAdapterConfig::from_json(
            r#"{
                "routes": [
                    {
                        "supplierCode": "tencent-cloud",
                        "adapterKind": "internal_http",
                        "adapterBaseUrl": "https://adapter.example",
                        "endpointKey": "test.stream",
                        "method": "POST",
                        "standardPathPattern": "/v1/stream",
                        "adapterPathTemplate": "/providers/{supplier_code}{standard_path}",
                        "invocationShape": "sse_stream",
                        "status": "enabled",
                        "priority": 10
                    },
                    {
                        "supplierCode": "tencent-cloud",
                        "adapterKind": "internal_http",
                        "adapterBaseUrl": "https://adapter.example",
                        "endpointKey": "test.bytes",
                        "method": "GET",
                        "standardPathPattern": "/v1/bytes",
                        "adapterPathTemplate": "/providers/{supplier_code}{standard_path}",
                        "invocationShape": "byte_stream",
                        "status": "enabled",
                        "priority": 10
                    }
                ]
            }"#,
            Some("adapter-token".to_owned()),
        )
        .unwrap();

        assert_eq!(2, adapter_config.routes().len());
        for route in adapter_config.routes() {
            let error = ensure_authenticated_adapter_route_supported(route)
                .expect_err("authenticated adapter stream must fail before network dispatch");
            let response = passthrough_forward_failed("provider_passthrough_relay_failed", error);

            assert_eq!(StatusCode::NOT_IMPLEMENTED, response.status());
            let body = response.into_body().collect().await.unwrap().to_bytes();
            let body: Value = serde_json::from_slice(&body).unwrap();
            assert_eq!(
                "provider_adapter_streaming_accounting_unavailable",
                body["error"]["code"]
            );
        }
    }

    #[test]
    fn adapter_usage_line_count_has_a_hard_memory_boundary() {
        assert!(validate_adapter_usage_line_count(MAX_ADAPTER_USAGE_LINES).is_ok());
        let error = validate_adapter_usage_line_count(MAX_ADAPTER_USAGE_LINES + 1)
            .expect_err("usage-line count above the fixed boundary must be rejected");
        assert!(error.contains("maximum is 64"), "{error}");
    }

    #[test]
    fn adapter_meter_amount_charges_token_meters_per_million_and_duration_directly() {
        let token_amount = adapter_meter_amount(
            DecimalValue::parse("2.000000").unwrap(),
            "500000",
            &BillingMeter::LlmInputToken,
        )
        .unwrap();
        assert_eq!("1.000000000000", token_amount.to_fixed_string(12));

        let duration_amount = adapter_meter_amount(
            DecimalValue::parse("0.100000").unwrap(),
            "8.000000000000",
            &BillingMeter::VideoOutputSecond,
        )
        .unwrap();
        assert_eq!("0.800000000000", duration_amount.to_fixed_string(12));
    }

    #[test]
    fn adapter_token_counts_preserve_input_output_and_cache_dimensions() {
        let input = adapter_token_counts(&BillingMeter::LlmInputToken, "12").unwrap();
        assert_eq!(12, input.prompt_tokens);
        assert_eq!(0, input.completion_tokens);
        assert_eq!(0, input.cached_tokens);
        assert_eq!(12, input.total_tokens);

        let output = adapter_token_counts(&BillingMeter::LlmOutputToken, "7").unwrap();
        assert_eq!(0, output.prompt_tokens);
        assert_eq!(7, output.completion_tokens);
        assert_eq!(0, output.cached_tokens);
        assert_eq!(7, output.total_tokens);

        let cache = adapter_token_counts(&BillingMeter::LlmCacheReadToken, "5").unwrap();
        assert_eq!(0, cache.prompt_tokens);
        assert_eq!(0, cache.completion_tokens);
        assert_eq!(5, cache.cached_tokens);
        assert_eq!(5, cache.total_tokens);
    }

    #[test]
    fn adapter_generic_api_usage_infers_modality_from_endpoint() {
        let invocation =
            test_adapter_invocation("video.start_end2video", "/vidu/ent/v2/start-end2video");

        assert_eq!(
            MODALITY_VIDEO,
            adapter_modality_for_usage_line(&invocation, &BillingMeter::ApiRequest)
        );
    }

    #[test]
    fn provider_native_standard_path_maps_to_seeded_api_code() {
        assert_eq!(
            "kling.text_to_video",
            endpoint_key_from_standard_path("kling", "/kling/v1/videos/text2video")
        );
        assert_eq!(
            "gemini.nano_banana.image_generation",
            endpoint_key_from_standard_path("gemini", "/v1beta/models/nano-banana:generateImages")
        );
        assert_eq!(
            "volcengine.task_query",
            endpoint_key_from_standard_path("volcengine", "/v1/tasks/task-1")
        );
        assert_eq!(
            "vidu.start_end_to_video",
            endpoint_key_from_standard_path("tencent-cloud", "/vidu/ent/v2/start-end2video")
        );
        assert_eq!(
            "vidu.reference_to_image",
            endpoint_key_from_standard_path("vidu", "/vidu/ent/v2/reference2image")
        );
        assert_eq!(
            "minimax.music_generation",
            endpoint_key_from_standard_path("minimax", "/minimax/v1/music_generation")
        );
    }

    #[test]
    fn provider_adapter_standard_api_code_never_falls_back_to_private_endpoint_key() {
        let mut route = ProviderAdapterRouteConfig {
            supplier_code: "kling".to_owned(),
            adapter_kind: sdkwork_claw_provider_adapter_contract::AdapterKind::InternalHttp,
            adapter_base_url: "http://127.0.0.1:39110".to_owned(),
            capability: Some("video_generation".to_owned()),
            endpoint_key: Some("video.start_end2video".to_owned()),
            service_group: None,
            openapi_operation_id: None,
            s3_operation: None,
            iaas_operation: None,
            endpoint_styles: Vec::new(),
            runtime_state: sdkwork_claw_provider_adapter_contract::AdapterEndpointRuntimeState::RuntimeAvailable,
            method: "POST".to_owned(),
            invocation_shape: AdapterInvocationShape::AsyncTaskStart,
            standard_path_pattern: "/kling/v1/videos/text2video".to_owned(),
            adapter_path_template: "/providers{standard_path}".to_owned(),
            status: sdkwork_claw_provider_adapter_contract::AdapterRouteStatus::Enabled,
            priority: 10,
        };
        assert_eq!(
            Some("kling.text_to_video".to_owned()),
            standard_api_code_for_provider_adapter_route(&route)
        );

        route.supplier_code = "tencent-cloud".to_owned();
        route.standard_path_pattern = "/vidu/ent/v2/start-end2video".to_owned();
        assert_eq!(
            Some("vidu.start_end_to_video".to_owned()),
            standard_api_code_for_provider_adapter_route(&route)
        );

        route.standard_path_pattern = "/vidu/ent/v2/reference2image".to_owned();
        assert_eq!(
            Some("vidu.reference_to_image".to_owned()),
            standard_api_code_for_provider_adapter_route(&route)
        );

        route.standard_path_pattern = "/custom/video/start-end2video".to_owned();
        assert_eq!(None, standard_api_code_for_provider_adapter_route(&route));
    }

    #[test]
    fn adapter_usage_line_resolves_pricing_with_canonical_model_key() {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.add_vendor(ModelVendorDefinition::new(
            "tencent-cloud",
            ModelVendor::Custom,
            "Tencent Cloud",
        ));
        catalog.add_model(AiModel::new(
            "vidu2.0",
            "Vidu 2.0",
            "tencent-cloud",
            vec!["video"],
        ));
        catalog.add_model_upstream_route(
            ModelUpstreamRoute::new_for_catalog_key(
                "tencent-cloud/vidu2.0",
                "vidu2.0",
                "tencent-cloud",
                9301,
                "vidu2.0",
            )
            .with_upstream_endpoint(Some("https://example.invalid/vidu"), Some("vault://test")),
        );
        catalog.add_upstream_account_route(
            UpstreamAccountRoute::new("tencent-cloud", 9301)
                .with_account_group_binding(10, 10, 100),
        );
        catalog.add_plan(PricingPlan::new(
            "standard",
            PriceSide::OfficialReference,
            DecimalValue::parse("1.000000").unwrap(),
            Money::usd("0.000000").unwrap(),
        ));
        catalog.add_upstream_account_group(UpstreamAccountGroup::new(
            10,
            "standard-group",
            "standard",
            DecimalValue::parse("1.000000").unwrap(),
            DecimalValue::parse("1.000000").unwrap(),
        ));
        catalog.add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash-test"));
        catalog.add_price(ModelPrice::new_for_catalog_key(
            "tencent-cloud/vidu2.0",
            "vidu2.0",
            PriceSide::OfficialReference,
            BillingMeter::ApiRequest,
            Money::usd("0.020000").unwrap(),
        ));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "tencent-cloud/vidu2.0",
                "vidu2.0",
                PriceSide::UpstreamCost,
                BillingMeter::ApiRequest,
                Money::usd("0.010000").unwrap(),
            )
            .for_upstream_account("tencent-cloud", 9301),
        );
        let context = AuthenticatedApiKeyContext {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            api_key_name_snapshot: "Test key".to_owned(),
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        };
        let invocation =
            test_adapter_invocation("video.start_end2video", "/vidu/ent/v2/start-end2video");
        let response = AdapterInvocationResponse::json_task(
            202,
            json!({"id": "adapter-task-usage-1", "status": "queued"}),
        );
        let usage_line = AdapterUsageLine::new("api_request", "1")
            .with_request_count(1)
            .with_provider_native_model("vidu2.0");

        let command = adapter_usage_line_command(
            &catalog,
            &context,
            &invocation,
            &response,
            &usage_line,
            0,
            Some("Mozilla/5.0"),
        )
        .unwrap();

        assert_eq!("tencent-cloud/vidu2.0", command.catalog_key);
        assert_eq!("tencent-cloud/vidu2.0", command.requested_model_catalog_key);
        assert_eq!("vidu2.0", command.requested_model);
        assert_eq!("vidu2.0", command.provider_native_model);
        assert_eq!("0.020000000000", command.official_reference_amount);
        assert_eq!("0.010000000000", command.upstream_cost_amount);
        assert!(command
            .pricing_snapshot
            .contains(r#""catalogKey":"tencent-cloud/vidu2.0""#));
        assert!(command
            .pricing_snapshot
            .contains(r#""requestedCatalogKey":"tencent-cloud/vidu2.0""#));
    }

    #[test]
    fn adapter_usage_line_uses_invocation_provider_region_for_pricing_and_usage() {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.add_vendor(ModelVendorDefinition::new(
            "tencent-cloud",
            ModelVendor::Custom,
            "Tencent Cloud",
        ));
        catalog.add_model(AiModel::new(
            "vidu2.0",
            "Vidu 2.0",
            "tencent-cloud",
            vec!["video"],
        ));
        catalog.add_model_upstream_route(
            ModelUpstreamRoute::new_for_catalog_key(
                "tencent-cloud/vidu2.0",
                "vidu2.0",
                "tencent-cloud",
                9301,
                "vidu2.0",
            )
            .with_region_code("global"),
        );
        catalog.add_model_upstream_route(
            ModelUpstreamRoute::new_for_catalog_key(
                "tencent-cloud/vidu2.0",
                "vidu2.0",
                "tencent-cloud",
                9301,
                "vidu2.0",
            )
            .with_region_code("cn"),
        );
        catalog.add_upstream_account_route(
            UpstreamAccountRoute::new("tencent-cloud", 9301)
                .with_region_code("global")
                .with_account_group_binding(10, 10, 100),
        );
        catalog.add_upstream_account_route(
            UpstreamAccountRoute::new("tencent-cloud", 9301)
                .with_region_code("cn")
                .with_account_group_binding(10, 10, 100),
        );
        catalog.add_plan(PricingPlan::new(
            "standard",
            PriceSide::OfficialReference,
            DecimalValue::parse("1.000000").unwrap(),
            Money::cny("0.000000").unwrap(),
        ));
        catalog.add_upstream_account_group(UpstreamAccountGroup::new(
            10,
            "standard-group",
            "standard",
            DecimalValue::parse("1.000000").unwrap(),
            DecimalValue::parse("1.000000").unwrap(),
        ));
        catalog.add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash-test"));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "tencent-cloud/vidu2.0",
                "vidu2.0",
                PriceSide::OfficialReference,
                BillingMeter::ApiRequest,
                Money::usd("0.020000").unwrap(),
            )
            .with_region_code("global"),
        );
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "tencent-cloud/vidu2.0",
                "vidu2.0",
                PriceSide::OfficialReference,
                BillingMeter::ApiRequest,
                Money::cny("0.140000").unwrap(),
            )
            .with_region_code("cn"),
        );
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "tencent-cloud/vidu2.0",
                "vidu2.0",
                PriceSide::UpstreamCost,
                BillingMeter::ApiRequest,
                Money::usd("0.010000").unwrap(),
            )
            .with_region_code("global")
            .for_upstream_account("tencent-cloud", 9301),
        );
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "tencent-cloud/vidu2.0",
                "vidu2.0",
                PriceSide::UpstreamCost,
                BillingMeter::ApiRequest,
                Money::cny("0.080000").unwrap(),
            )
            .with_region_code("cn")
            .for_upstream_account("tencent-cloud", 9301),
        );
        let context = test_api_key_context();
        let mut invocation =
            test_adapter_invocation("video.start_end2video", "/vidu/ent/v2/start-end2video");
        invocation.provider.region_code = "cn".to_owned();
        let response = AdapterInvocationResponse::json_task(
            202,
            json!({"id": "adapter-task-cn-usage-1", "status": "queued"}),
        );
        let usage_line = AdapterUsageLine::new("api_request", "1")
            .with_request_count(1)
            .with_provider_native_model("vidu2.0");

        let command = adapter_usage_line_command(
            &catalog,
            &context,
            &invocation,
            &response,
            &usage_line,
            0,
            Some("Mozilla/5.0"),
        )
        .unwrap();

        assert_eq!("cn", command.region_code);
        assert_eq!("CNY", command.currency);
        assert_eq!("0.140000000000", command.official_reference_amount);
        assert_eq!("0.080000000000", command.upstream_cost_amount);
        assert!(command.pricing_snapshot.contains(r#""regionCode":"cn""#));
    }

    #[test]
    fn adapter_usage_line_rejects_regional_requested_catalog_key() {
        let catalog = InMemoryPricingCatalog::default();
        let context = test_api_key_context();
        let invocation =
            test_adapter_invocation("video.start_end2video", "/vidu/ent/v2/start-end2video");
        let response = AdapterInvocationResponse::json_task(
            202,
            json!({"id": "adapter-task-usage-1", "status": "queued"}),
        );
        let usage_line = AdapterUsageLine::new("api_request", "1")
            .with_request_count(1)
            .with_provider_native_model("vidu2.0")
            .with_requested_model_catalog_key("tencent-cloud/global/vidu2.0");

        let error = adapter_usage_line_command(
            &catalog,
            &context,
            &invocation,
            &response,
            &usage_line,
            0,
            Some("Mozilla/5.0"),
        )
        .expect_err("regional requested catalog keys must be rejected instead of normalized");

        assert!(
            error
                .to_string()
                .contains("requestedModelCatalogKey must use vendorCode/modelId"),
            "{error}"
        );
    }

    #[test]
    fn adapter_usage_line_preserves_openrouter_nested_provider_model_identity() {
        let mut catalog = InMemoryPricingCatalog::default();
        catalog.add_vendor(ModelVendorDefinition::new(
            "openrouter",
            ModelVendor::Custom,
            "OpenRouter",
        ));
        catalog.add_model(AiModel::new(
            "anthropic/claude-3-opus",
            "Claude 3 Opus",
            "openrouter",
            vec!["text"],
        ));
        catalog.add_model_upstream_route(
            ModelUpstreamRoute::new_for_catalog_key(
                "openrouter/anthropic/claude-3-opus",
                "anthropic/claude-3-opus",
                "openrouter",
                9302,
                "anthropic/claude-3-opus",
            )
            .with_upstream_endpoint(
                Some("https://openrouter.example/api/v1"),
                Some("vault://openrouter/test"),
            ),
        );
        catalog.add_upstream_account_route(
            UpstreamAccountRoute::new("openrouter", 9302).with_account_group_binding(10, 10, 100),
        );
        catalog.add_plan(PricingPlan::new(
            "standard",
            PriceSide::OfficialReference,
            DecimalValue::parse("1.000000").unwrap(),
            Money::usd("0.000000").unwrap(),
        ));
        catalog.add_upstream_account_group(UpstreamAccountGroup::new(
            10,
            "standard-group",
            "standard",
            DecimalValue::parse("1.000000").unwrap(),
            DecimalValue::parse("1.000000").unwrap(),
        ));
        catalog.add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash-test"));
        catalog.add_price(ModelPrice::new_for_catalog_key(
            "openrouter/anthropic/claude-3-opus",
            "anthropic/claude-3-opus",
            PriceSide::OfficialReference,
            BillingMeter::ApiRequest,
            Money::usd("0.020000").unwrap(),
        ));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openrouter/anthropic/claude-3-opus",
                "anthropic/claude-3-opus",
                PriceSide::UpstreamCost,
                BillingMeter::ApiRequest,
                Money::usd("0.010000").unwrap(),
            )
            .for_upstream_account("openrouter", 9302),
        );
        let context = test_api_key_context();
        let mut invocation =
            test_adapter_invocation("openrouter.chat", "/openrouter/v1/chat/completions");
        invocation.provider.supplier_code = "openrouter".to_owned();
        invocation.provider.account_id = 9302;
        invocation.provider.provider_model = "anthropic/claude-3-opus".to_owned();
        let response = AdapterInvocationResponse::json_task(
            200,
            json!({"id": "adapter-openrouter-usage-1", "status": "ok"}),
        );
        let usage_line = AdapterUsageLine::new("api_request", "1").with_request_count(1);

        let command = adapter_usage_line_command(
            &catalog,
            &context,
            &invocation,
            &response,
            &usage_line,
            0,
            None,
        )
        .unwrap();

        assert_eq!("openrouter/anthropic/claude-3-opus", command.catalog_key);
        assert_eq!(
            "openrouter/anthropic/claude-3-opus",
            command.requested_model_catalog_key
        );
        assert_eq!("anthropic/claude-3-opus", command.provider_native_model);
    }

    #[test]
    fn adapter_usage_line_rejects_slash_padded_provider_model_catalog_key() {
        let catalog = InMemoryPricingCatalog::default();
        let context = test_api_key_context();
        let mut invocation =
            test_adapter_invocation("openrouter.chat", "/openrouter/v1/chat/completions");
        invocation.provider.supplier_code = "openrouter".to_owned();
        invocation.provider.provider_model = "openrouter//anthropic/claude-3-opus".to_owned();
        let response = AdapterInvocationResponse::json_task(
            200,
            json!({"id": "adapter-openrouter-usage-2", "status": "ok"}),
        );
        let usage_line = AdapterUsageLine::new("api_request", "1").with_request_count(1);

        let error = adapter_usage_line_command(
            &catalog,
            &context,
            &invocation,
            &response,
            &usage_line,
            0,
            None,
        )
        .expect_err("slash-padded provider model identities must not be normalized");

        assert!(
            error
                .to_string()
                .contains("providerModel must use vendorCode/modelId"),
            "{error}"
        );
    }

    fn test_api_key_context() -> AuthenticatedApiKeyContext {
        AuthenticatedApiKeyContext {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            api_key_name_snapshot: "Test key".to_owned(),
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        }
    }

    fn test_adapter_invocation(
        endpoint_key: &str,
        standard_path: &str,
    ) -> AdapterInvocationRequest {
        AdapterInvocationRequest {
            invocation: AdapterInvocationMetadata {
                id: "test-invocation".to_owned(),
                endpoint_key: endpoint_key.to_owned(),
                method: "POST".to_owned(),
                standard_path: standard_path.to_owned(),
                shape: AdapterInvocationShape::SyncJson,
                stream: false,
                request_id: Some("req-test".to_owned()),
                trace_id: Some("trace-test".to_owned()),
            },
            subject: AdapterSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
                api_key_id: 100,
                group_id: 10,
                group_code: "standard-group".to_owned(),
                pricing_plan_code: "standard".to_owned(),
            },
            provider: AdapterProviderContext {
                supplier_code: "tencent-cloud".to_owned(),
                account_id: 9301,
                region_code: "global".to_owned(),
                provider_model: "vidu2.0".to_owned(),
                base_url: None,
                auth_profile: json!({"type": "bearer"}),
                timeout_ms: None,
            },
            secret: AdapterSecret::None,
            body: Value::Null,
        }
    }
}
