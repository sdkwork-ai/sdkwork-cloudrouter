use std::sync::Arc;

use axum::Router;
use sdkwork_api_cloud_gateway_config::{
    DependencyApiSurfaceConfig, DependencyRuntimeMode, GatewayMode, GatewayRuntimeConfig,
    APPBASE_APP_API_PREFIX, APPBASE_APP_API_SERVICE_ID, APPBASE_BACKEND_API_PREFIX,
    APPBASE_BACKEND_API_SERVICE_ID,
};
use sdkwork_claw_config::{
    ApiKeySecurityConfig, AppSessionConfig, DatabaseConfig, DatabaseEngine, DeploymentMode,
    DeploymentRuntime, PaymentWebhookConfig, ProviderAdapterConfig,
    ProviderAdapterManifestDiscoveryConfig, ProviderRelayConfig, ProviderSecretMapConfig,
    RequestLimitsConfig, RuntimeConfigProfile, RuntimeTomlConfig, StartupInstallMode,
    TrustedSubjectConfig,
};
use sdkwork_claw_http::QueryStringApiKeyPolicy;
use sdkwork_claw_provider_adapter_contract::AdapterRouteStatus;
use sdkwork_claw_provider_adapter_http::ProviderAdapterHttpClient;
use sdkwork_claw_provider_adapter_registry::{ProviderAdapterRegistry, ProviderAdapterRouteConfig};
use sdkwork_clawrouter_database_host::connect_claw_router_database;
use sdkwork_clawrouter_router_service::api::{
    OpenAiInvocationPluginRef, OpenAiRuntimeFailureStrategy, OpenAiRuntimeRouteConfig,
};
use sdkwork_clawrouter_router_service::application::{
    resolve_usage_settlement_worker_config, ApiKeySecretCodec, ApiKeySecretHasher,
    GatewayAccountingRetryHealth, GatewayAccountingRetryWorker,
    GatewayAccountingRetryWorkerConfig, RetryingGatewayUsageRecorder, RuntimeCacheManager,
    RuntimeStreamBus, TenantInflightConfig, UsageSettlementWorker, UsageSettlementWorkerConfig,
};
use sdkwork_clawrouter_router_service::domain::{
    ProviderRetryPolicy, DEFAULT_PROVIDER_CIRCUIT_BREAKER_RECOVERY_WINDOW_SECONDS,
    DEFAULT_PROVIDER_RETRY_ATTEMPTS, DEFAULT_RETRYABLE_PROVIDER_STATUS_CODES,
};
use sdkwork_clawrouter_router_service::infrastructure::crypto::{
    HmacSha256ApiKeySecretHasher, RingAeadApiKeySecretCodec,
};
use sdkwork_clawrouter_router_service::infrastructure::provider::{
    AdapterAwareChatCompletionRelay, AdapterAwareChatCompletionStreamRelay,
    AdapterAwareEmbeddingsRelay, AdapterAwareResponsesRelay, OpenAiCompatibleChatCompletionRelay,
    OpenAiCompatibleChatCompletionStreamRelay, OpenAiCompatibleEmbeddingsRelay,
    OpenAiCompatibleResponsesRelay, ProviderRelayHttpPoolConfig,
    RefreshableProviderSecretMapResolver, SecretRefOpenAiCompatibleChatCompletionRelay,
    SecretRefOpenAiCompatibleChatCompletionStreamRelay, SecretRefOpenAiCompatibleEmbeddingsRelay,
    SecretRefOpenAiCompatibleResponsesRelay, UpstreamProviderEndpoint,
    DEFAULT_PROVIDER_RESPONSE_MAX_BYTES, DEFAULT_PROVIDER_RESPONSE_TIMEOUT_MILLIS,
    DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT_MILLIS,
};
use sdkwork_clawrouter_router_service::infrastructure::{
    RedisGatewayAccountingRetryQueue, SqliteGatewayAccountingRetryQueue,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::catalog::{
    RefreshableSqlPricingCatalog, SqlPricingCatalogSnapshotSummary,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    DatabaseInstallError, DatabaseInstaller,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::postgres::{
    PostgresCatalogLoadError, PostgresGatewayUsageRecorder, PostgresPricingCatalogLoader,
    PostgresUsageSettlementStore,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::{
    SqlCatalogLoadError, SqliteGatewayUsageRecorder, SqlitePricingCatalogLoader,
    SqliteUsageSettlementStore,
};
use sdkwork_clawrouter_router_service::ports::{
    ChatCompletionRelay, ChatCompletionStreamRelay, EmbeddingsRelay,
    GatewayAccountingRecordContext, GatewayAccountingRetryQueue, GatewayRequestTraceCommand,
    GatewayTraceAttribution, GatewayUsageRecordCommand, GatewayUsageRecordFuture,
    GatewayUsageRecorder, PricingCatalog, ProviderHealthProbe, ProviderSecretResolver,
    ResponsesRelay, StickyRouteStore, UsageSettlementStore,
};
use sqlx::sqlite::SqlitePool;
use sqlx::PgPool;
use tokio::sync::Notify;
use tokio::time::{sleep, Duration};

use crate::edge_server::EdgeInProcessUpstreams;
use crate::invocation_router::invocation_router_with_full_pipeline_and_provider_adapter_config;
use crate::invocation_sticky_store::InvocationStickyObjectRouteStore;
use crate::router;
use crate::router_with_database_status_and_passthrough_placeholder;
use crate::InvocationHttpDispatcher;

type ApiKeyHasher = Arc<dyn ApiKeySecretHasher + Send + Sync>;
type ApiKeyCodec = Arc<dyn ApiKeySecretCodec + Send + Sync>;
type ChatRelay = Arc<dyn ChatCompletionRelay + Send + Sync>;
type ChatStreamRelay = Arc<dyn ChatCompletionStreamRelay + Send + Sync>;
type EmbeddingRelay = Arc<dyn EmbeddingsRelay + Send + Sync>;
type ResponseRelay = Arc<dyn ResponsesRelay + Send + Sync>;
type UsageRecorder = Arc<dyn GatewayUsageRecorder + Send + Sync>;
type AccountingRetryQueue = Arc<dyn GatewayAccountingRetryQueue + Send + Sync>;
type SettlementStore = Arc<dyn UsageSettlementStore + Send + Sync>;

const CLAW_ROUTER_APP_API_SERVICE_ID: &str = "sdkwork-clawrouter-app-api";
const CLAW_ROUTER_BACKEND_API_SERVICE_ID: &str = "sdkwork-clawrouter-backend-api";
const CLAW_ROUTER_GATEWAY_INSTANCE_ID_ENV: &str = "SDKWORK_CLAW_ROUTER_GATEWAY_INSTANCE_ID";
const CLAW_ROUTER_GATEWAY_INSTANCE_CODE_ENV: &str = "SDKWORK_CLAW_ROUTER_GATEWAY_INSTANCE_CODE";
const CLAW_ROUTER_GATEWAY_NODE_NAME_ENV: &str = "SDKWORK_CLAW_ROUTER_GATEWAY_NODE_NAME";
const CLAW_ROUTER_REGION_CODE_ENV: &str = "SDKWORK_CLAW_ROUTER_REGION_CODE";

fn gateway_trace_attribution() -> GatewayTraceAttribution {
    let instance_code = first_runtime_identity(
        &[
            CLAW_ROUTER_GATEWAY_INSTANCE_CODE_ENV,
            "HOSTNAME",
            "COMPUTERNAME",
        ],
        128,
    );
    let node_name = first_runtime_identity(
        &[
            CLAW_ROUTER_GATEWAY_NODE_NAME_ENV,
            "K8S_NODE_NAME",
            "NODE_NAME",
        ],
        128,
    )
    .or_else(|| instance_code.clone());
    let attribution = GatewayTraceAttribution {
        gateway_instance_id: positive_runtime_i64(CLAW_ROUTER_GATEWAY_INSTANCE_ID_ENV),
        gateway_instance_code_snapshot: instance_code,
        gateway_region_code_snapshot: first_runtime_identity(&[CLAW_ROUTER_REGION_CODE_ENV], 64),
        gateway_node_name_snapshot: node_name,
    };
    if attribution.gateway_instance_code_snapshot.is_none() {
        static WARNED: std::sync::OnceLock<()> = std::sync::OnceLock::new();
        if WARNED.set(()).is_ok() {
            tracing::warn!(
                instance_code_env = CLAW_ROUTER_GATEWAY_INSTANCE_CODE_ENV,
                instance_id_env = CLAW_ROUTER_GATEWAY_INSTANCE_ID_ENV,
                node_name_env = CLAW_ROUTER_GATEWAY_NODE_NAME_ENV,
                region_code_env = CLAW_ROUTER_REGION_CODE_ENV,
                "gateway runtime identity is unavailable; new traces will keep nullable gateway attribution fields"
            );
        }
    }
    attribution
}

fn first_runtime_identity(keys: &[&str], max_characters: usize) -> Option<String> {
    keys.iter().find_map(|key| {
        let value = std::env::var(key).ok()?;
        bounded_runtime_identity(&value, max_characters)
    })
}

fn bounded_runtime_identity(value: &str, max_characters: usize) -> Option<String> {
    let value = value.trim();
    if value.is_empty() {
        return None;
    }
    Some(value.chars().take(max_characters).collect())
}

fn positive_runtime_i64(key: &str) -> Option<i64> {
    let value = std::env::var(key).ok()?;
    let value = value.trim().parse::<i64>().ok()?;
    (value > 0).then_some(value)
}

fn router_with_invocation_runtime_routes<C>(
    base_router: Router,
    catalog: Arc<C>,
    api_key_hasher: ApiKeyHasher,
    provider_secret_resolver: Option<Arc<RefreshableProviderSecretMapResolver>>,
    sticky_store: Option<Arc<dyn StickyRouteStore>>,
    usage_recorder: Option<UsageRecorder>,
    provider_adapter_config: Option<ProviderAdapterConfig>,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
    runtime_toml: Option<&RuntimeTomlConfig>,
    tenant_inflight_config: Option<TenantInflightConfig>,
    estimated_instance_count: u32,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let secret_resolver = provider_secret_resolver.map(|resolver| {
        let resolver: Arc<dyn ProviderSecretResolver + Send + Sync> = resolver;
        resolver
    });
    let redis_config = sdkwork_claw_config::RedisConfig::from_env_or_runtime_toml(runtime_toml)
        .ok()
        .flatten();
    let body_limit_bytes =
        sdkwork_claw_config::RequestLimitsConfig::from_env_or_runtime_toml(runtime_toml)
            .map(|config| config.gateway_invocation_body_max_bytes())
            .unwrap_or(
                sdkwork_claw_config::RequestLimitsConfig::DEFAULT_GATEWAY_INVOCATION_BODY_MAX_BYTES,
            );
    base_router.merge(
        crate::invocation_router::invocation_router_with_full_pipeline_provider_adapter_tenant_inflight_and_query_string_api_key_policy(
            catalog,
            api_key_hasher,
            Arc::new(InvocationHttpDispatcher::new()),
            secret_resolver,
            sticky_store,
            usage_recorder,
            provider_adapter_config,
            Some(crate::invocation_router::invocation_policy_guard_from_runtime_toml_with_instance_count(
                runtime_toml,
                estimated_instance_count,
            )),
            tenant_inflight_config,
            redis_config.as_ref(),
            body_limit_bytes,
            query_string_api_key_policy,
        ),
    )
}

fn merge_relay_authenticated_openai_passthrough<C>(
    router: Router,
    catalog: Arc<C>,
    api_key_hasher: ApiKeyHasher,
    provider_passthrough_config: Option<ProviderRelayConfig>,
    provider_adapter_config: Option<ProviderAdapterConfig>,
    usage_recorder: Option<UsageRecorder>,
    secret_resolver_configured: bool,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    if secret_resolver_configured {
        return router;
    }
    let Some(config) = provider_passthrough_config else {
        return router;
    };
    router.merge(
        crate::passthrough::authenticated_gateway_passthrough_router_with_adapter_config_and_query_string_api_key_policy(
            config,
            catalog,
            api_key_hasher,
            provider_adapter_config,
            usage_recorder,
            query_string_api_key_policy,
        ),
    )
}

fn router_with_database_runtime_routes<C>(
    base_router: Router,
    catalog: Arc<C>,
    api_key_hasher: ApiKeyHasher,
    provider_secret_resolver: Option<Arc<RefreshableProviderSecretMapResolver>>,
    invocation_sticky_store: Option<Arc<dyn StickyRouteStore>>,
    usage_recorder: Option<UsageRecorder>,
    provider_passthrough_config: Option<ProviderRelayConfig>,
    provider_adapter_config: Option<ProviderAdapterConfig>,
    provider_runtime_config: ProviderRelayRuntimeConfig,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<Router, GatewayRouterError>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let secret_resolver_configured = provider_secret_resolver.is_some();
    let router = if secret_resolver_configured {
        router_with_invocation_runtime_routes(
            base_router,
            Arc::clone(&catalog),
            Arc::clone(&api_key_hasher),
            provider_secret_resolver,
            invocation_sticky_store,
            usage_recorder.clone(),
            provider_adapter_config.clone(),
            query_string_api_key_policy,
            runtime_toml,
            Some(provider_runtime_config.tenant_inflight_config),
            provider_runtime_config.estimated_instance_count,
        )
    } else {
        let relays = build_openai_runtime_relays(
            provider_passthrough_config.clone(),
            None,
            provider_runtime_config.clone(),
            false,
        )?;
        let relays = apply_provider_adapter_config(relays, provider_adapter_config.clone(), None)?;
        let router = router_with_openai_runtime_routes(
            base_router,
            Arc::clone(&catalog),
            Arc::clone(&api_key_hasher),
            relays,
            usage_recorder.clone(),
            Vec::new(),
            provider_runtime_config.failure_strategy,
            provider_runtime_config.default_retry_policy.clone(),
            provider_passthrough_config.clone(),
            provider_adapter_config.clone(),
            None,
            false,
            invocation_sticky_store.clone(),
            false,
        );
        router_with_invocation_runtime_routes(
            router,
            Arc::clone(&catalog),
            Arc::clone(&api_key_hasher),
            None,
            invocation_sticky_store,
            usage_recorder.clone(),
            provider_adapter_config.clone(),
            query_string_api_key_policy,
            runtime_toml,
            Some(provider_runtime_config.tenant_inflight_config),
            provider_runtime_config.estimated_instance_count,
        )
    };
    Ok(merge_relay_authenticated_openai_passthrough(
        router,
        catalog,
        api_key_hasher,
        provider_passthrough_config,
        provider_adapter_config,
        usage_recorder,
        secret_resolver_configured,
        query_string_api_key_policy,
    ))
}

#[derive(Clone)]
struct NotifyingGatewayUsageRecorder {
    inner: UsageRecorder,
    usage_settlement_wakeup: Arc<Notify>,
}

impl NotifyingGatewayUsageRecorder {
    fn new(inner: UsageRecorder, usage_settlement_wakeup: Arc<Notify>) -> Self {
        Self {
            inner,
            usage_settlement_wakeup,
        }
    }
}

impl GatewayUsageRecorder for NotifyingGatewayUsageRecorder {
    fn record_gateway_trace<'a>(
        &'a self,
        command: GatewayRequestTraceCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        self.inner.record_gateway_trace(command)
    }

    fn record_gateway_usage<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            self.inner.record_gateway_usage(command).await?;
            self.usage_settlement_wakeup.notify_one();
            Ok(())
        })
    }

    fn record_gateway_trace_with_context<'a>(
        &'a self,
        command: GatewayRequestTraceCommand,
        context: GatewayAccountingRecordContext,
    ) -> GatewayUsageRecordFuture<'a> {
        self.inner
            .record_gateway_trace_with_context(command, context)
    }

    fn record_gateway_usage_with_context<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
        context: GatewayAccountingRecordContext,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            self.inner
                .record_gateway_usage_with_context(command, context)
                .await?;
            self.usage_settlement_wakeup.notify_one();
            Ok(())
        })
    }
}

/// Default catalog refresh interval. Raised from 5s to 15s to reduce steady-state
/// database load: a single `load_snapshot` reads 16+ catalog tables and the
/// pointer-swap `RefreshableSqlPricingCatalog` keeps serving the previous
/// snapshot until the new one is ready, so sub-5s refresh adds no freshness
/// benefit while multiplying read traffic. `SDKWORK_CLAW_PROVIDER_CATALOG_REFRESH_INTERVAL_MILLIS`
/// still overrides this default at runtime.
const DEFAULT_OPENAI_RUNTIME_CATALOG_REFRESH_INTERVAL_MILLIS: u64 = 15_000;
const CATALOG_REFRESH_FALLBACK_TICKS: u64 = 12;

use sdkwork_database_sqlx::DatabasePool;

/// Histogram for catalog refresh duration, labelled by backend (`sqlite`/`postgres`).
///
/// M-1: surfaces slow refreshes that keep the previous snapshot pinned for too
/// long and multiply database load. Alert on p95 > refresh interval.
fn catalog_refresh_duration_seconds() -> prometheus::HistogramVec {
    static METRIC: std::sync::OnceLock<prometheus::HistogramVec> = std::sync::OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::HistogramVec::new(
                prometheus::HistogramOpts::new(
                    "catalog_refresh_duration_seconds",
                    "Duration of a single catalog snapshot refresh, by backend.",
                )
                .namespace("clawrouter"),
                &["backend"],
            )
            .expect("catalog_refresh_duration_seconds histogram");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

/// Counter for catalog refresh failures, labelled by backend (`sqlite`/`postgres`).
///
/// M-1/M-6: a rising failure rate means the gateway is serving a stale pricing
/// snapshot. Alert on any increase.
fn catalog_refresh_failures_total() -> prometheus::IntCounterVec {
    static METRIC: std::sync::OnceLock<prometheus::IntCounterVec> = std::sync::OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = prometheus::IntCounterVec::new(
                prometheus::Opts::new(
                    "catalog_refresh_failures_total",
                    "Total catalog snapshot refresh failures, by backend.",
                )
                .namespace("clawrouter"),
                &["backend"],
            )
            .expect("catalog_refresh_failures_total counter");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

#[derive(Clone)]
struct AllInOneRuntimeContext {
    database_config: DatabaseConfig,
    database_pool: DatabasePool,
    database_installer: Arc<DatabaseInstaller>,
    catalog: Arc<RefreshableSqlPricingCatalog>,
    api_key_security_config: ApiKeySecurityConfig,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_adapter_config: Option<ProviderAdapterConfig>,
    provider_secret_resolver: Option<Arc<RefreshableProviderSecretMapResolver>>,
    trusted_subject_config: TrustedSubjectConfig,
    app_session_config: AppSessionConfig,
    payment_webhook_config: PaymentWebhookConfig,
    provider_runtime_config: ProviderRelayRuntimeConfig,
    provider_health_probe: Arc<dyn ProviderHealthProbe + Send + Sync>,
    cache_manager: RuntimeCacheManager,
    request_limits_config: RequestLimitsConfig,
    models_catalog_root: Option<String>,
    deployment_mode: DeploymentMode,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
    app_runtime_gateway_client:
        Arc<dyn sdkwork_clawrouter_router_service::ports::AppRuntimeGatewayClient + Send + Sync>,
    app_runtime_stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
    model_ranking_refresh_worker_config:
        sdkwork_clawrouter_router_service::application::ModelRankingRefreshWorkerConfig,
    usage_settlement_wakeup: Option<Arc<Notify>>,
}

#[derive(Default)]
struct OpenAiRuntimeRelays {
    chat: Option<ChatRelay>,
    chat_stream: Option<ChatStreamRelay>,
    embeddings: Option<EmbeddingRelay>,
    responses: Option<ResponseRelay>,
}

pub fn router_with_product_catalog_and_api_key_hasher<C>(
    catalog: Arc<C>,
    api_key_hasher: ApiKeyHasher,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    router_with_openai_runtime_routes(
        router(),
        catalog,
        api_key_hasher,
        OpenAiRuntimeRelays::default(),
        None,
        Vec::new(),
        OpenAiRuntimeFailureStrategy::default(),
        ProviderRetryPolicy::default(),
        None,
        None,
        None,
        false,
        None,
        true,
    )
}

pub fn router_with_product_catalog_api_key_hasher_and_chat_completion_relay<C>(
    catalog: Arc<C>,
    api_key_hasher: ApiKeyHasher,
    chat_relay: ChatRelay,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    router_with_openai_runtime_routes(
        router(),
        catalog,
        api_key_hasher,
        OpenAiRuntimeRelays {
            chat: Some(chat_relay),
            chat_stream: None,
            embeddings: None,
            responses: None,
        },
        None,
        Vec::new(),
        OpenAiRuntimeFailureStrategy::default(),
        ProviderRetryPolicy::default(),
        None,
        None,
        None,
        false,
        None,
        true,
    )
}

pub fn router_with_product_catalog_api_key_hasher_and_chat_completion_streaming_relay<C>(
    catalog: Arc<C>,
    api_key_hasher: ApiKeyHasher,
    chat_stream_relay: ChatStreamRelay,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    router_with_openai_runtime_routes(
        router(),
        catalog,
        api_key_hasher,
        OpenAiRuntimeRelays {
            chat: None,
            chat_stream: Some(chat_stream_relay),
            embeddings: None,
            responses: None,
        },
        None,
        Vec::new(),
        OpenAiRuntimeFailureStrategy::default(),
        ProviderRetryPolicy::default(),
        None,
        None,
        None,
        false,
        None,
        true,
    )
}

pub fn router_with_product_catalog_api_key_hasher_and_embeddings_relay<C>(
    catalog: Arc<C>,
    api_key_hasher: ApiKeyHasher,
    embeddings_relay: EmbeddingRelay,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    router_with_openai_runtime_routes(
        router(),
        catalog,
        api_key_hasher,
        OpenAiRuntimeRelays {
            chat: None,
            chat_stream: None,
            embeddings: Some(embeddings_relay),
            responses: None,
        },
        None,
        Vec::new(),
        OpenAiRuntimeFailureStrategy::default(),
        ProviderRetryPolicy::default(),
        None,
        None,
        None,
        false,
        None,
        true,
    )
}

pub fn router_with_product_catalog_api_key_hasher_and_responses_relay<C>(
    catalog: Arc<C>,
    api_key_hasher: ApiKeyHasher,
    responses_relay: ResponseRelay,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    router_with_openai_runtime_routes(
        router(),
        catalog,
        api_key_hasher,
        OpenAiRuntimeRelays {
            chat: None,
            chat_stream: None,
            embeddings: None,
            responses: Some(responses_relay),
        },
        None,
        Vec::new(),
        OpenAiRuntimeFailureStrategy::default(),
        ProviderRetryPolicy::default(),
        None,
        None,
        None,
        false,
        None,
        true,
    )
}

fn router_with_openai_runtime_routes<C>(
    base_router: Router,
    catalog: Arc<C>,
    api_key_hasher: ApiKeyHasher,
    relays: OpenAiRuntimeRelays,
    usage_recorder: Option<UsageRecorder>,
    invocation_plugins: Vec<OpenAiInvocationPluginRef>,
    failure_strategy: OpenAiRuntimeFailureStrategy,
    default_retry_policy: ProviderRetryPolicy,
    _provider_passthrough_config: Option<ProviderRelayConfig>,
    _provider_adapter_config: Option<ProviderAdapterConfig>,
    _provider_secret_resolver: Option<Arc<RefreshableProviderSecretMapResolver>>,
    _prefer_secret_ref_openai_runtime: bool,
    _sticky_store: Option<Arc<dyn StickyRouteStore>>,
    include_openai_models_router: bool,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let chat_router = match (relays.chat, relays.chat_stream) {
        (Some(relay), Some(stream_relay)) => {
            if let Some(usage_recorder) = usage_recorder.clone() {
                sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relays_usage_recorder_plugins_and_runtime_config(
                    Arc::clone(&catalog),
                    Arc::clone(&api_key_hasher),
                    relay,
                    stream_relay,
                    usage_recorder,
                    invocation_plugins.clone(),
                    OpenAiRuntimeRouteConfig::new(default_retry_policy.clone(), failure_strategy),
                )
            } else {
                sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relays_and_failure_strategy(
                    Arc::clone(&catalog),
                    Arc::clone(&api_key_hasher),
                    relay,
                    stream_relay,
                    failure_strategy,
                )
            }
        }
        (Some(relay), None) => {
            if let Some(usage_recorder) = usage_recorder.clone() {
                sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_usage_recorder_plugins_and_runtime_config(
                    Arc::clone(&catalog),
                    Arc::clone(&api_key_hasher),
                    relay,
                    usage_recorder,
                    invocation_plugins.clone(),
                    OpenAiRuntimeRouteConfig::new(default_retry_policy.clone(), failure_strategy),
                )
            } else {
                sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_plugins_and_failure_strategy(
                    Arc::clone(&catalog),
                    Arc::clone(&api_key_hasher),
                    relay,
                    invocation_plugins.clone(),
                    failure_strategy,
                )
            }
        }
        (None, Some(stream_relay)) => {
            sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_streaming_relay_and_failure_strategy(
                Arc::clone(&catalog),
                Arc::clone(&api_key_hasher),
                stream_relay,
                failure_strategy,
            )
        }
        (None, None) => sdkwork_clawrouter_router_service::api::openai_chat_completions_router(
            Arc::clone(&catalog),
            Arc::clone(&api_key_hasher),
        ),
    };
    let responses_failure_strategy = OpenAiRuntimeFailureStrategy::FailClosed;
    let responses_router = match relays.responses {
        Some(relay) => {
            if let Some(usage_recorder) = usage_recorder.clone() {
                sdkwork_clawrouter_router_service::api::openai_responses_router_with_relay_usage_recorder_plugins_and_runtime_config(
                    Arc::clone(&catalog),
                    Arc::clone(&api_key_hasher),
                    relay,
                    usage_recorder,
                    invocation_plugins.clone(),
                    OpenAiRuntimeRouteConfig::new(
                        default_retry_policy.clone(),
                        responses_failure_strategy,
                    ),
                )
            } else {
                sdkwork_clawrouter_router_service::api::openai_responses_router_with_relay_plugins_and_failure_strategy(
                    Arc::clone(&catalog),
                    Arc::clone(&api_key_hasher),
                    relay,
                    invocation_plugins.clone(),
                    responses_failure_strategy,
                )
            }
        }
        None => sdkwork_clawrouter_router_service::api::openai_responses_router(
            Arc::clone(&catalog),
            Arc::clone(&api_key_hasher),
        ),
    };
    let embeddings_router = match relays.embeddings {
        Some(relay) => {
            if let Some(usage_recorder) = usage_recorder.clone() {
                sdkwork_clawrouter_router_service::api::openai_embeddings_router_with_relay_usage_recorder_plugins_and_runtime_config(
                    Arc::clone(&catalog),
                    Arc::clone(&api_key_hasher),
                    relay,
                    usage_recorder,
                    invocation_plugins.clone(),
                    OpenAiRuntimeRouteConfig::new(default_retry_policy.clone(), failure_strategy),
                )
            } else {
                sdkwork_clawrouter_router_service::api::openai_embeddings_router_with_relay_plugins_and_failure_strategy(
                    Arc::clone(&catalog),
                    Arc::clone(&api_key_hasher),
                    relay,
                    invocation_plugins.clone(),
                    failure_strategy,
                )
            }
        }
        None => sdkwork_clawrouter_router_service::api::openai_embeddings_router(
            Arc::clone(&catalog),
            Arc::clone(&api_key_hasher),
        ),
    };

    let router = if include_openai_models_router {
        base_router.merge(
            sdkwork_clawrouter_router_service::api::openai_models_router(
                Arc::clone(&catalog),
                Arc::clone(&api_key_hasher),
            ),
        )
    } else {
        base_router
    };

    router
        .merge(embeddings_router)
        .merge(responses_router)
        .merge(chat_router)
}

pub async fn router_with_database_and_api_key_config(
    config: DatabaseConfig,
    api_key_config: Option<ApiKeySecurityConfig>,
) -> Result<Router, GatewayRouterError> {
    router_with_database_api_key_and_provider_relay_config(config, api_key_config, None).await
}

pub async fn router_with_database_api_key_and_provider_relay_config(
    config: DatabaseConfig,
    api_key_config: Option<ApiKeySecurityConfig>,
    provider_relay_config: Option<ProviderRelayConfig>,
) -> Result<Router, GatewayRouterError> {
    router_with_database_api_key_and_provider_configs(
        config,
        api_key_config,
        provider_relay_config,
        None,
    )
    .await
}

pub async fn router_with_database_api_key_and_provider_configs(
    config: DatabaseConfig,
    api_key_config: Option<ApiKeySecurityConfig>,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
) -> Result<Router, GatewayRouterError> {
    router_with_database_api_key_provider_configs_and_usage_settlement_worker_config(
        config,
        api_key_config,
        provider_relay_config,
        provider_secret_map_config,
        resolve_usage_settlement_worker_config(None),
    )
    .await
}

pub async fn router_with_database_api_key_provider_configs_and_adapter_config(
    config: DatabaseConfig,
    api_key_config: Option<ApiKeySecurityConfig>,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
    provider_adapter_config: Option<ProviderAdapterConfig>,
) -> Result<Router, GatewayRouterError> {
    router_with_database_api_key_provider_configs_usage_settlement_worker_config_startup_install_mode_and_runtime_toml(
        config,
        api_key_config,
        provider_relay_config,
        provider_secret_map_config,
        resolve_usage_settlement_worker_config(None),
        StartupInstallMode::Ensure,
        None,
        provider_adapter_config,
        QueryStringApiKeyPolicy::default(),
    )
    .await
}

pub async fn router_with_database_api_key_provider_configs_adapter_config_and_startup_install_mode(
    config: DatabaseConfig,
    api_key_config: Option<ApiKeySecurityConfig>,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
    provider_adapter_config: Option<ProviderAdapterConfig>,
    startup_install_mode: StartupInstallMode,
) -> Result<Router, GatewayRouterError> {
    router_with_database_api_key_provider_configs_usage_settlement_worker_config_startup_install_mode_and_runtime_toml(
        config,
        api_key_config,
        provider_relay_config,
        provider_secret_map_config,
        resolve_usage_settlement_worker_config(None),
        startup_install_mode,
        None,
        provider_adapter_config,
        QueryStringApiKeyPolicy::default(),
    )
    .await
}

pub async fn router_with_database_api_key_provider_configs_and_usage_settlement_worker_config(
    config: DatabaseConfig,
    api_key_config: Option<ApiKeySecurityConfig>,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
    usage_settlement_worker_config: UsageSettlementWorkerConfig,
) -> Result<Router, GatewayRouterError> {
    router_with_database_api_key_provider_configs_usage_settlement_worker_config_and_startup_install_mode(
        config,
        api_key_config,
        provider_relay_config,
        provider_secret_map_config,
        usage_settlement_worker_config,
        StartupInstallMode::Ensure,
    )
    .await
}

pub async fn router_with_database_api_key_provider_configs_usage_settlement_worker_config_and_startup_install_mode(
    config: DatabaseConfig,
    api_key_config: Option<ApiKeySecurityConfig>,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
    usage_settlement_worker_config: UsageSettlementWorkerConfig,
    startup_install_mode: StartupInstallMode,
) -> Result<Router, GatewayRouterError> {
    router_with_database_api_key_provider_configs_usage_settlement_worker_config_startup_install_mode_and_runtime_toml(
        config,
        api_key_config,
        provider_relay_config,
        provider_secret_map_config,
        usage_settlement_worker_config,
        startup_install_mode,
        None,
        None,
        QueryStringApiKeyPolicy::default(),
    )
    .await
}

pub async fn router_with_database_api_key_provider_configs_usage_settlement_worker_config_startup_install_mode_and_query_string_api_key_policy(
    config: DatabaseConfig,
    api_key_config: Option<ApiKeySecurityConfig>,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
    usage_settlement_worker_config: UsageSettlementWorkerConfig,
    startup_install_mode: StartupInstallMode,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
) -> Result<Router, GatewayRouterError> {
    router_with_database_api_key_provider_configs_usage_settlement_worker_config_startup_install_mode_and_runtime_toml(
        config,
        api_key_config,
        provider_relay_config,
        provider_secret_map_config,
        usage_settlement_worker_config,
        startup_install_mode,
        None,
        None,
        query_string_api_key_policy,
    )
    .await
}

async fn router_with_database_api_key_provider_configs_usage_settlement_worker_config_startup_install_mode_and_runtime_toml(
    config: DatabaseConfig,
    api_key_config: Option<ApiKeySecurityConfig>,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
    usage_settlement_worker_config: UsageSettlementWorkerConfig,
    startup_install_mode: StartupInstallMode,
    runtime_toml: Option<&RuntimeTomlConfig>,
    provider_adapter_config_override: Option<ProviderAdapterConfig>,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
) -> Result<Router, GatewayRouterError> {
    let deployment_mode = DeploymentMode::from_env_or_runtime_toml(runtime_toml)
        .map_err(GatewayRouterError::Config)?;
    router_with_database_api_key_provider_configs_usage_settlement_worker_config_startup_install_mode_runtime_toml_and_deployment_mode(
        config,
        api_key_config,
        provider_relay_config,
        provider_secret_map_config,
        usage_settlement_worker_config,
        startup_install_mode,
        runtime_toml,
        provider_adapter_config_override,
        deployment_mode,
        query_string_api_key_policy,
    )
    .await
}

async fn router_with_database_api_key_provider_configs_usage_settlement_worker_config_startup_install_mode_runtime_toml_and_deployment_mode(
    config: DatabaseConfig,
    api_key_config: Option<ApiKeySecurityConfig>,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
    usage_settlement_worker_config: UsageSettlementWorkerConfig,
    startup_install_mode: StartupInstallMode,
    runtime_toml: Option<&RuntimeTomlConfig>,
    provider_adapter_config_override: Option<ProviderAdapterConfig>,
    deployment_mode: DeploymentMode,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
) -> Result<Router, GatewayRouterError> {
    let api_key_security_config = require_api_key_security_config(api_key_config)?;
    let api_key_hasher = build_api_key_hasher(&api_key_security_config)?;
    let api_key_secret_codec = api_key_secret_codec_from_config(&api_key_security_config)?;
    let provider_passthrough_config = provider_relay_config.clone();
    let provider_runtime = provider_relay_runtime_config_from_env_or_toml(runtime_toml)
        .map_err(GatewayRouterError::Config)?;
    let provider_adapter_config = match provider_adapter_config_override {
        Some(config) if !config.routes().is_empty() => Some(config),
        Some(_) => None,
        None => provider_adapter_config_from_env_or_runtime_toml(runtime_toml)
            .await
            .map_err(GatewayRouterError::Config)?,
    };
    match config.engine {
        DatabaseEngine::Sqlite => {
            let database_pool =
                sdkwork_clawrouter_router_service::infrastructure::sql::pool::connect_standard_database_pool(
                    &config,
                )
                .await
                .map_err(gateway_sqlite_pool_error)?;
            prepare_claw_router_database_lifecycle(database_pool.clone()).await?;
            let pool = database_pool.as_sqlite().cloned().ok_or_else(|| {
                GatewayRouterError::Config("expected SQLite database pool".to_owned())
            })?;
            if startup_install_mode.should_ensure() {
                DatabaseInstaller::for_sqlite(pool.clone())
                    .with_env_options()?
                    .ensure_bootstrap_data()
                    .await?;
            }
            let snapshot = SqlitePricingCatalogLoader::with_api_key_secret_codec(
                pool.clone(),
                api_key_secret_codec.clone(),
            )
            .with_circuit_breaker_recovery_window_seconds(
                provider_runtime.circuit_breaker_recovery_window_seconds,
            )
            .load_snapshot()
            .await?;
            log_gateway_runtime_catalog_snapshot_summary("sqlite", "startup", snapshot.summary());
            let provider_secret_resolver = openai_runtime_relay_secret_resolver(
                provider_secret_map_config.clone(),
                snapshot.managed_provider_secrets(),
            );
            let catalog = Arc::new(RefreshableSqlPricingCatalog::new(snapshot));
            let usage_settlement_wakeup =
                maybe_spawn_sqlite_usage_settlement_worker(&pool, usage_settlement_worker_config)
                    .await?;
            let primary_usage_recorder = wrap_usage_recorder_with_settlement_wakeup(
                Arc::new(SqliteGatewayUsageRecorder::new_with_attribution(
                    pool.clone(),
                    gateway_trace_attribution(),
                )),
                usage_settlement_wakeup,
            );
            let (usage_recorder, accounting_retry_health) =
                wrap_usage_recorder_with_durable_accounting_retry(
                    primary_usage_recorder,
                    gateway_trace_attribution(),
                    runtime_toml,
                )
                .await?;
            spawn_sqlite_catalog_refresh_worker(
                &pool,
                Arc::clone(&catalog),
                provider_secret_resolver.clone(),
                api_key_secret_codec.clone(),
                provider_runtime.catalog_refresh_interval,
                provider_runtime.circuit_breaker_recovery_window_seconds,
            );
            let invocation_sticky: Option<Arc<dyn StickyRouteStore>> = Some(Arc::new(
                InvocationStickyObjectRouteStore::sqlite(pool.clone()),
            ));
            let readiness_check =
                sdkwork_clawrouter_router_service::infrastructure::sql::pool::sqlite_runtime_readiness_check(
                    pool.clone(),
                    runtime_toml,
                    usage_settlement_worker_config,
                );
            let readiness_check =
                combine_accounting_retry_readiness(readiness_check, accounting_retry_health);
            router_with_database_runtime_routes(
                router_with_database_status_and_passthrough_placeholder(
                    Some(&config),
                    provider_secret_resolver.is_none() && provider_passthrough_config.is_none(),
                    readiness_check,
                    Some(deployment_mode),
                ),
                catalog,
                api_key_hasher,
                provider_secret_resolver.clone(),
                invocation_sticky,
                Some(usage_recorder),
                provider_passthrough_config,
                provider_adapter_config.clone(),
                provider_runtime,
                query_string_api_key_policy,
                runtime_toml,
            )
        }
        DatabaseEngine::Postgres => {
            let database_pool =
                sdkwork_clawrouter_router_service::infrastructure::sql::pool::connect_standard_database_pool(
                    &config,
                )
                .await
                .map_err(|error| {
                    GatewayRouterError::Postgres(PostgresCatalogLoadError::Database(
                        sqlx::Error::Configuration(error.to_string().into()),
                    ))
                })?;
            prepare_claw_router_database_lifecycle(database_pool.clone()).await?;
            let pool = database_pool.as_postgres().cloned().ok_or_else(|| {
                GatewayRouterError::Config("expected PostgreSQL database pool".to_owned())
            })?;
            if startup_install_mode.should_ensure() {
                DatabaseInstaller::for_postgres(pool.clone())
                    .with_env_options()?
                    .ensure_bootstrap_data()
                    .await?;
            }
            let snapshot = PostgresPricingCatalogLoader::with_api_key_secret_codec(
                pool.clone(),
                api_key_secret_codec.clone(),
            )
            .with_circuit_breaker_recovery_window_seconds(
                provider_runtime.circuit_breaker_recovery_window_seconds,
            )
            .load_snapshot()
            .await?;
            log_gateway_runtime_catalog_snapshot_summary("postgres", "startup", snapshot.summary());
            let provider_secret_resolver = openai_runtime_relay_secret_resolver(
                provider_secret_map_config.clone(),
                snapshot.managed_provider_secrets(),
            );
            let catalog = Arc::new(RefreshableSqlPricingCatalog::new(snapshot));
            let usage_settlement_wakeup =
                maybe_spawn_postgres_usage_settlement_worker(&pool, usage_settlement_worker_config)
                    .await?;
            let primary_usage_recorder = wrap_usage_recorder_with_settlement_wakeup(
                Arc::new(PostgresGatewayUsageRecorder::new_with_attribution(
                    pool.clone(),
                    gateway_trace_attribution(),
                )),
                usage_settlement_wakeup,
            );
            let (usage_recorder, accounting_retry_health) =
                wrap_usage_recorder_with_durable_accounting_retry(
                    primary_usage_recorder,
                    gateway_trace_attribution(),
                    runtime_toml,
                )
                .await?;
            spawn_postgres_catalog_refresh_worker(
                &pool,
                Arc::clone(&catalog),
                provider_secret_resolver.clone(),
                api_key_secret_codec.clone(),
                provider_runtime.catalog_refresh_interval,
                provider_runtime.circuit_breaker_recovery_window_seconds,
            );
            let invocation_sticky: Option<Arc<dyn StickyRouteStore>> = Some(Arc::new(
                InvocationStickyObjectRouteStore::postgres(pool.clone()),
            ));
            let readiness_check =
                sdkwork_clawrouter_router_service::infrastructure::sql::pool::postgres_runtime_readiness_check(
                    pool.clone(),
                    runtime_toml,
                    usage_settlement_worker_config,
                );
            let readiness_check =
                combine_accounting_retry_readiness(readiness_check, accounting_retry_health);
            router_with_database_runtime_routes(
                router_with_database_status_and_passthrough_placeholder(
                    Some(&config),
                    provider_secret_resolver.is_none() && provider_passthrough_config.is_none(),
                    readiness_check,
                    Some(deployment_mode),
                ),
                catalog,
                api_key_hasher,
                provider_secret_resolver.clone(),
                invocation_sticky,
                Some(usage_recorder),
                provider_passthrough_config,
                provider_adapter_config.clone(),
                provider_runtime,
                query_string_api_key_policy,
                runtime_toml,
            )
        }
    }
}

pub async fn router_with_optional_database_config(
    config: Option<DatabaseConfig>,
    api_key_config: Option<ApiKeySecurityConfig>,
) -> Result<Router, GatewayRouterError> {
    router_with_optional_database_api_key_and_provider_relay_config(config, api_key_config, None)
        .await
}

pub async fn router_with_optional_database_api_key_and_provider_relay_config(
    config: Option<DatabaseConfig>,
    api_key_config: Option<ApiKeySecurityConfig>,
    provider_relay_config: Option<ProviderRelayConfig>,
) -> Result<Router, GatewayRouterError> {
    router_with_optional_database_api_key_and_provider_configs(
        config,
        api_key_config,
        provider_relay_config,
        None,
    )
    .await
}

pub async fn router_with_optional_database_api_key_and_provider_configs(
    config: Option<DatabaseConfig>,
    api_key_config: Option<ApiKeySecurityConfig>,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
) -> Result<Router, GatewayRouterError> {
    match config {
        Some(config) => {
            router_with_database_api_key_and_provider_configs(
                config,
                api_key_config,
                provider_relay_config,
                provider_secret_map_config,
            )
            .await
        }
        None => Ok(router()),
    }
}

fn router_without_database(deployment_mode: DeploymentMode) -> Router {
    router_with_database_status_and_passthrough_placeholder(None, true, None, Some(deployment_mode))
}

pub async fn router_from_env() -> Result<Router, GatewayRouterError> {
    let runtime_toml =
        RuntimeTomlConfig::from_env_config_file().map_err(GatewayRouterError::Config)?;
    let query_string_api_key_policy = QueryStringApiKeyPolicy::from_configured_runtime(
        DeploymentRuntime::resolve_configured(runtime_toml.as_ref())
            .map_err(GatewayRouterError::Config)?,
    );
    let config = database_config_from_env_for_startup(runtime_toml.as_ref())?;
    let api_key_config = ApiKeySecurityConfig::from_env_or_runtime_toml(runtime_toml.as_ref())
        .map_err(GatewayRouterError::Config)?;
    let provider_relay_config =
        ProviderRelayConfig::from_env_or_runtime_toml(runtime_toml.as_ref())
            .map_err(GatewayRouterError::Config)?;
    let provider_secret_map_config =
        ProviderSecretMapConfig::from_env_or_runtime_toml(runtime_toml.as_ref())
            .map_err(GatewayRouterError::Config)?;
    let usage_settlement_worker_config =
        resolve_usage_settlement_worker_config(runtime_toml.as_ref());
    let startup_install_mode = StartupInstallMode::from_env_or_runtime_toml(runtime_toml.as_ref())
        .map_err(GatewayRouterError::Config)?;
    sdkwork_claw_config::ensure_production_startup_install_policy(
        runtime_toml.as_ref(),
        startup_install_mode,
    )
    .map_err(GatewayRouterError::Config)?;
    let deployment_mode = DeploymentMode::from_env_or_runtime_toml(runtime_toml.as_ref())
        .map_err(GatewayRouterError::Config)?;
    sdkwork_claw_config::ensure_server_production_redis_config(
        deployment_mode,
        runtime_toml.as_ref(),
    )
    .map_err(GatewayRouterError::Config)?;
    match config {
        Some(config) => {
            router_with_database_api_key_provider_configs_usage_settlement_worker_config_startup_install_mode_runtime_toml_and_deployment_mode(
                config,
                api_key_config,
                provider_relay_config,
                provider_secret_map_config,
                usage_settlement_worker_config,
                startup_install_mode,
                runtime_toml.as_ref(),
                None,
                deployment_mode,
                query_string_api_key_policy,
            )
            .await
        }
        None => Ok(router_without_database(deployment_mode)),
    }
}

async fn finalize_all_in_one_route_surfaces(
    database_config: &DatabaseConfig,
    database_pool: &DatabasePool,
    backend_router: Router,
    app_router: Router,
) -> (Router, Router) {
    let postgres_pool = database_pool
        .as_postgres()
        .cloned()
        .map(std::sync::Arc::new);
    (
        sdkwork_routes_clawrouter_backend_api::maybe_wrap_router_with_web_framework_and_iam_pool(
            backend_router,
            database_config,
            postgres_pool.clone(),
        )
        .await,
        sdkwork_routes_clawrouter_app_api::maybe_wrap_router_with_web_framework_and_iam_pool(
            app_router,
            database_config,
            postgres_pool,
        )
        .await,
    )
}

pub async fn all_in_one_in_process_upstreams_from_env() -> anyhow::Result<EdgeInProcessUpstreams> {
    let context = all_in_one_runtime_context_from_env().await?;
    let gateway_router = build_gateway_router_from_all_in_one_context(&context).await?;
    let (backend_router, app_router) = match &context.database_pool {
        DatabasePool::Sqlite(pool, _) => {
            let backend_router =
                sdkwork_routes_clawrouter_backend_api::router_with_sqlite_shared_runtime(
                    context.database_config.clone(),
                    pool.clone(),
                    Arc::clone(&context.catalog),
                    context.api_key_security_config.clone(),
                    context.trusted_subject_config.clone(),
                    context.app_session_config.clone(),
                    Arc::clone(&context.provider_health_probe),
                    context.deployment_mode,
                    context.cache_manager.clone(),
                    Arc::clone(&context.database_installer),
                    context.request_limits_config.clone(),
                    context.models_catalog_root.clone(),
                )
                .map_err(anyhow::Error::new)?;
            let app_router = sdkwork_routes_clawrouter_app_api::router_with_sqlite_shared_runtime(
                context.database_config.clone(),
                pool.clone(),
                Arc::clone(&context.catalog),
                context.api_key_security_config.clone(),
                context.trusted_subject_config.clone(),
                context.app_session_config.clone(),
                context.payment_webhook_config.clone(),
                Arc::clone(&context.provider_health_probe),
                context.deployment_mode,
                context.request_limits_config.clone(),
                Arc::clone(&context.app_runtime_gateway_client),
                Arc::clone(&context.app_runtime_stream_bus),
                context.model_ranking_refresh_worker_config.clone(),
            )
            .await
            .map_err(anyhow::Error::new)?;
            finalize_all_in_one_route_surfaces(
                &context.database_config,
                &context.database_pool,
                backend_router,
                app_router,
            )
            .await
        }
        DatabasePool::Postgres(pool, _) => {
            let backend_router =
                sdkwork_routes_clawrouter_backend_api::router_with_postgres_shared_runtime(
                    context.database_config.clone(),
                    pool.clone(),
                    Arc::clone(&context.catalog),
                    context.api_key_security_config.clone(),
                    context.trusted_subject_config.clone(),
                    context.app_session_config.clone(),
                    Arc::clone(&context.provider_health_probe),
                    context.deployment_mode,
                    context.cache_manager.clone(),
                    Arc::clone(&context.database_installer),
                    context.request_limits_config.clone(),
                    context.models_catalog_root.clone(),
                )
                .map_err(anyhow::Error::new)?;
            let app_router =
                sdkwork_routes_clawrouter_app_api::router_with_postgres_shared_runtime(
                    context.database_config.clone(),
                    pool.clone(),
                    Arc::clone(&context.catalog),
                    context.api_key_security_config.clone(),
                    context.trusted_subject_config.clone(),
                    context.app_session_config.clone(),
                    context.payment_webhook_config.clone(),
                    Arc::clone(&context.provider_health_probe),
                    context.deployment_mode,
                    context.request_limits_config.clone(),
                    Arc::clone(&context.app_runtime_gateway_client),
                    Arc::clone(&context.app_runtime_stream_bus),
                    context.model_ranking_refresh_worker_config.clone(),
                )
                .await
                .map_err(anyhow::Error::new)?;
            finalize_all_in_one_route_surfaces(
                &context.database_config,
                &context.database_pool,
                backend_router,
                app_router,
            )
            .await
        }
    };
    let sdkwork_api_cloud_gateway_router =
        build_embedded_sdkwork_api_cloud_gateway_router(backend_router.clone(), app_router.clone())
            .await?;
    Ok(
        EdgeInProcessUpstreams::new(gateway_router, backend_router, app_router)
            .with_sdkwork_api_cloud_gateway_router(sdkwork_api_cloud_gateway_router),
    )
}

async fn build_embedded_sdkwork_api_cloud_gateway_router(
    backend_router: Router,
    app_router: Router,
) -> Result<Router, GatewayRouterError> {
    let mut config = GatewayRuntimeConfig::default();
    config.mode = GatewayMode::Embedded;
    config.upstreams.clear();
    config.readiness.check_upstreams = false;
    config
        .dependency_surfaces
        .extend(claw_router_gateway_dependency_surfaces());
    sdkwork_api_cloud_gateway::build_sdkwork_api_cloud_gateway_router_with_embedded_routers(
        config,
        [
            (
                APPBASE_APP_API_SERVICE_ID.to_owned(),
                crate::iam_embedded::build_claw_embedded_iam_app_api_router().await?,
            ),
            (
                APPBASE_BACKEND_API_SERVICE_ID.to_owned(),
                crate::iam_embedded::build_claw_embedded_iam_backend_api_router().await?,
            ),
            (
                CLAW_ROUTER_BACKEND_API_SERVICE_ID.to_owned(),
                backend_router,
            ),
            (CLAW_ROUTER_APP_API_SERVICE_ID.to_owned(), app_router),
        ],
    )
    .map_err(|error| {
        GatewayRouterError::Config(format!(
            "failed to build embedded SDKWork API Gateway router: {error}"
        ))
    })
}

fn claw_router_product_iam_api_keys_dependency_surface() -> DependencyApiSurfaceConfig {
    DependencyApiSurfaceConfig {
        service_id: CLAW_ROUTER_APP_API_SERVICE_ID.to_owned(),
        workspace: "sdkwork-clawrouter".to_owned(),
        sdk_family: sdkwork_routes_clawrouter_app_api::manifest::SDK_FAMILY.to_owned(),
        api_authority: sdkwork_routes_clawrouter_app_api::manifest::API_AUTHORITY.to_owned(),
        surface: "app".to_owned(),
        api_prefix: "/app/v3/api/iam/api_keys".to_owned(),
        runtime_mode: DependencyRuntimeMode::Embedded,
        same_origin_allowed: true,
        executable_export: Some(
            "sdkwork_routes_clawrouter_app_api::build_sdkwork_claw_router_app_api_router"
                .to_owned(),
        ),
        cargo_feature: None,
        cargo_dependency: Some("sdkwork-routes-clawrouter-app-api".to_owned()),
        coverage: "clawrouter-product-iam-api-keys-route-crate".to_owned(),
        required_base_url_key: None,
    }
}

fn claw_router_appbase_app_dependency_surface() -> DependencyApiSurfaceConfig {
    DependencyApiSurfaceConfig {
        service_id: APPBASE_APP_API_SERVICE_ID.to_owned(),
        workspace: "sdkwork-appbase".to_owned(),
        sdk_family: "sdkwork-iam-app-sdk".to_owned(),
        api_authority: "sdkwork-iam-app-api".to_owned(),
        surface: "app".to_owned(),
        api_prefix: APPBASE_APP_API_PREFIX.to_owned(),
        runtime_mode: DependencyRuntimeMode::Embedded,
        same_origin_allowed: true,
        executable_export: Some(
            "sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router".to_owned(),
        ),
        cargo_feature: Some("foundation-appbase".to_owned()),
        cargo_dependency: Some("sdkwork-routes-iam-app-api".to_owned()),
        coverage: "appbase-iam-app-routes".to_owned(),
        required_base_url_key: None,
    }
}

fn claw_router_gateway_dependency_surfaces() -> [DependencyApiSurfaceConfig; 5] {
    [
        claw_router_product_iam_api_keys_dependency_surface(),
        claw_router_appbase_app_dependency_surface(),
        claw_router_appbase_backend_dependency_surface(),
        DependencyApiSurfaceConfig {
            service_id: CLAW_ROUTER_BACKEND_API_SERVICE_ID.to_owned(),
            workspace: "sdkwork-clawrouter".to_owned(),
            sdk_family: sdkwork_routes_clawrouter_backend_api::manifest::SDK_FAMILY.to_owned(),
            api_authority: sdkwork_routes_clawrouter_backend_api::manifest::API_AUTHORITY.to_owned(),
            surface: "backend".to_owned(),
            api_prefix: sdkwork_routes_clawrouter_backend_api::paths::ROUTE_PREFIX.to_owned(),
            runtime_mode: DependencyRuntimeMode::Embedded,
            same_origin_allowed: true,
            executable_export: Some(
                "sdkwork_routes_clawrouter_backend_api::build_sdkwork_claw_router_backend_api_router"
                    .to_owned(),
            ),
            cargo_feature: None,
            cargo_dependency: Some("sdkwork-routes-clawrouter-backend-api".to_owned()),
            coverage: "sdkwork-clawrouter-backend-api-route-crate".to_owned(),
            required_base_url_key: None,
        },
        DependencyApiSurfaceConfig {
            service_id: CLAW_ROUTER_APP_API_SERVICE_ID.to_owned(),
            workspace: "sdkwork-clawrouter".to_owned(),
            sdk_family: sdkwork_routes_clawrouter_app_api::manifest::SDK_FAMILY.to_owned(),
            api_authority: sdkwork_routes_clawrouter_app_api::manifest::API_AUTHORITY.to_owned(),
            surface: "app".to_owned(),
            api_prefix: sdkwork_routes_clawrouter_app_api::paths::ROUTE_PREFIX.to_owned(),
            runtime_mode: DependencyRuntimeMode::Embedded,
            same_origin_allowed: true,
            executable_export: Some(
                "sdkwork_routes_clawrouter_app_api::build_sdkwork_claw_router_app_api_router".to_owned(),
            ),
            cargo_feature: None,
            cargo_dependency: Some("sdkwork-routes-clawrouter-app-api".to_owned()),
            coverage: "sdkwork-clawrouter-app-api-route-crate".to_owned(),
            required_base_url_key: None,
        },
    ]
}

fn claw_router_appbase_backend_dependency_surface() -> DependencyApiSurfaceConfig {
    DependencyApiSurfaceConfig {
        service_id: APPBASE_BACKEND_API_SERVICE_ID.to_owned(),
        workspace: "sdkwork-appbase".to_owned(),
        sdk_family: "sdkwork-iam-backend-sdk".to_owned(),
        api_authority: "sdkwork-iam-backend-api".to_owned(),
        surface: "backend".to_owned(),
        api_prefix: APPBASE_BACKEND_API_PREFIX.to_owned(),
        runtime_mode: DependencyRuntimeMode::Embedded,
        same_origin_allowed: true,
        executable_export: Some(
            "sdkwork_routes_iam_backend_api::build_sdkwork_iam_backend_api_router".to_owned(),
        ),
        cargo_feature: Some("foundation-appbase".to_owned()),
        cargo_dependency: Some("sdkwork-routes-iam-backend-api".to_owned()),
        coverage: "appbase-iam-backend-routes".to_owned(),
        required_base_url_key: None,
    }
}

async fn all_in_one_runtime_context_from_env() -> anyhow::Result<AllInOneRuntimeContext> {
    let runtime_toml = RuntimeTomlConfig::from_env_config_file().map_err(anyhow::Error::msg)?;
    let runtime_toml_ref = runtime_toml.as_ref();
    let query_string_api_key_policy = QueryStringApiKeyPolicy::from_configured_runtime(
        DeploymentRuntime::resolve_configured(runtime_toml_ref).map_err(anyhow::Error::msg)?,
    );
    let profile = RuntimeConfigProfile::from_env_or_runtime_toml(runtime_toml_ref)
        .unwrap_or(RuntimeConfigProfile::Server);
    let database_config = DatabaseConfig::from_env_or_runtime_toml_or_initialize(runtime_toml_ref)
        .map_err(anyhow::Error::msg)?
        .ok_or_else(|| {
            anyhow::Error::msg(format!(
                "SDKWORK_CLAW_DATABASE_URL is required for all-in-one startup.\n{}",
                DatabaseConfig::startup_help_text(profile)
            ))
        })?;
    let api_key_security_config = require_api_key_security_config(
        ApiKeySecurityConfig::from_env_or_runtime_toml(runtime_toml_ref)
            .map_err(GatewayRouterError::Config)?,
    )
    .map_err(anyhow::Error::new)?;
    let trusted_subject_config = TrustedSubjectConfig::from_env_or_runtime_toml(runtime_toml_ref)
        .map_err(anyhow::Error::msg)?
        .ok_or_else(|| {
            anyhow::Error::msg(format!(
                "{} is required when all-in-one runtime is enabled",
                TrustedSubjectConfig::ENV_TRUSTED_SUBJECT_SECRET
            ))
        })?;
    let app_session_config = AppSessionConfig::from_env_or_runtime_toml(runtime_toml_ref)
        .map_err(anyhow::Error::msg)?
        .ok_or_else(|| {
            anyhow::Error::msg(format!(
                "{} is required when all-in-one runtime is enabled",
                AppSessionConfig::ENV_APP_SESSION_SECRET
            ))
        })?;
    let payment_webhook_config = PaymentWebhookConfig::from_env_or_runtime_toml(runtime_toml_ref)
        .map_err(anyhow::Error::msg)?
        .ok_or_else(|| {
            anyhow::Error::msg(format!(
                "{} is required when all-in-one runtime is enabled",
                PaymentWebhookConfig::ENV_PAYMENT_WEBHOOK_SECRET
            ))
        })?;
    let provider_relay_config = ProviderRelayConfig::from_env_or_runtime_toml(runtime_toml_ref)
        .map_err(anyhow::Error::msg)?;
    let provider_secret_map_config =
        ProviderSecretMapConfig::from_env_or_runtime_toml(runtime_toml_ref)
            .map_err(anyhow::Error::msg)?;
    let startup_install_mode = StartupInstallMode::from_env_or_runtime_toml(runtime_toml_ref)
        .map_err(anyhow::Error::msg)?;
    sdkwork_claw_config::ensure_production_startup_install_policy(
        runtime_toml_ref,
        startup_install_mode,
    )
    .map_err(anyhow::Error::msg)?;
    let usage_settlement_worker_config = resolve_usage_settlement_worker_config(runtime_toml_ref);
    let provider_runtime = provider_relay_runtime_config_from_env_or_toml(runtime_toml_ref)
        .map_err(anyhow::Error::msg)?;
    let provider_adapter_config =
        provider_adapter_config_from_env_or_runtime_toml(runtime_toml_ref)
            .await
            .map_err(anyhow::Error::msg)?;
    let deployment_mode =
        DeploymentMode::from_env_or_runtime_toml(runtime_toml_ref).map_err(anyhow::Error::msg)?;
    let provider_health_probe =
        sdkwork_routes_clawrouter_backend_api::shared_provider_health_probe_from_runtime_toml(
            provider_secret_map_config.clone(),
            runtime_toml_ref,
        )
        .map_err(anyhow::Error::new)?;
    let cache_manager =
        sdkwork_routes_clawrouter_backend_api::shared_cache_manager_from_runtime_toml(
            runtime_toml_ref,
        )
        .map_err(anyhow::Error::new)?;
    let request_limits_config = RequestLimitsConfig::from_env_or_runtime_toml(runtime_toml_ref)
        .map_err(anyhow::Error::msg)?;
    let models_catalog_root =
        sdkwork_routes_clawrouter_backend_api::shared_models_catalog_root_from_runtime_toml(
            runtime_toml_ref,
        );
    let app_runtime_gateway_client =
        sdkwork_routes_clawrouter_app_api::shared_runtime_gateway_client_from_runtime_toml(
            runtime_toml_ref,
        )
        .map_err(anyhow::Error::msg)?;
    let app_runtime_stream_bus =
        sdkwork_routes_clawrouter_app_api::shared_runtime_stream_bus_from_runtime_toml(
            runtime_toml_ref,
            deployment_mode,
        )
        .await
        .map_err(anyhow::Error::new)?;
    let model_ranking_refresh_worker_config =
        sdkwork_routes_clawrouter_app_api::shared_model_ranking_refresh_worker_config_from_toml(
            runtime_toml_ref,
        )
        .map_err(anyhow::Error::msg)?;
    let app_catalog_refresh_interval =
        sdkwork_routes_clawrouter_app_api::shared_runtime_catalog_refresh_interval_from_toml(
            runtime_toml_ref,
        )
        .map_err(anyhow::Error::msg)?;
    let shared_catalog_refresh_interval = provider_runtime
        .catalog_refresh_interval
        .min(app_catalog_refresh_interval);
    let api_key_secret_codec =
        api_key_secret_codec_from_config(&api_key_security_config).map_err(anyhow::Error::new)?;

    match database_config.engine {
        DatabaseEngine::Sqlite => {
            let sqlite_pool_max_connections =
                sdkwork_clawrouter_router_service::infrastructure::sql::pool::effective_sqlite_runtime_pool_max_connections(
                    &database_config.url,
                    database_config.max_connections,
                );
            if sqlite_pool_max_connections > database_config.max_connections {
                tracing::warn!(
                    configured_max_connections = database_config.max_connections,
                    effective_max_connections = sqlite_pool_max_connections,
                    "SQLite runtime database pool max_connections was raised to protect all-in-one background tasks"
                );
            }
            let database_pool =
                sdkwork_clawrouter_router_service::infrastructure::sql::pool::connect_claw_sqlite_runtime_database_pool(
                    &database_config,
                )
                .await
                .map_err(|error| anyhow::Error::new(gateway_sqlite_pool_error(error)))?;
            prepare_claw_router_database_lifecycle(database_pool.clone())
                .await
                .map_err(anyhow::Error::new)?;
            let pool = database_pool.as_sqlite().cloned().ok_or_else(|| {
                anyhow::Error::new(GatewayRouterError::Sqlite(SqlCatalogLoadError::Database(
                    sqlx::Error::Configuration("expected sqlite database pool".into()),
                )))
            })?;
            let database_installer = Arc::new(
                DatabaseInstaller::for_sqlite(pool.clone())
                    .with_env_options()
                    .map_err(anyhow::Error::new)?,
            );
            if startup_install_mode.should_ensure() {
                database_installer
                    .ensure_bootstrap_data()
                    .await
                    .map_err(anyhow::Error::new)?;
            }
            let snapshot = SqlitePricingCatalogLoader::with_api_key_secret_codec(
                pool.clone(),
                api_key_secret_codec.clone(),
            )
            .with_circuit_breaker_recovery_window_seconds(
                provider_runtime.circuit_breaker_recovery_window_seconds,
            )
            .load_snapshot()
            .await
            .map_err(anyhow::Error::new)?;
            log_gateway_runtime_catalog_snapshot_summary("sqlite", "startup", snapshot.summary());
            let provider_secret_resolver = openai_runtime_relay_secret_resolver(
                provider_secret_map_config.clone(),
                snapshot.managed_provider_secrets(),
            );
            let catalog = Arc::new(RefreshableSqlPricingCatalog::new(snapshot));
            let usage_settlement_wakeup =
                maybe_spawn_sqlite_usage_settlement_worker(&pool, usage_settlement_worker_config)
                    .await
                    .map_err(anyhow::Error::new)?;
            spawn_sqlite_catalog_refresh_worker(
                &pool,
                Arc::clone(&catalog),
                provider_secret_resolver.clone(),
                api_key_secret_codec,
                shared_catalog_refresh_interval,
                provider_runtime.circuit_breaker_recovery_window_seconds,
            );
            Ok(AllInOneRuntimeContext {
                database_config,
                database_pool,
                database_installer,
                catalog,
                api_key_security_config,
                provider_relay_config,
                provider_adapter_config,
                provider_secret_resolver,
                trusted_subject_config,
                app_session_config,
                payment_webhook_config,
                provider_runtime_config: provider_runtime,
                provider_health_probe,
                cache_manager,
                request_limits_config,
                models_catalog_root,
                deployment_mode,
                query_string_api_key_policy,
                app_runtime_gateway_client,
                app_runtime_stream_bus,
                model_ranking_refresh_worker_config,
                usage_settlement_wakeup,
            })
        }
        DatabaseEngine::Postgres => {
            let database_pool =
                sdkwork_clawrouter_router_service::infrastructure::sql::pool::connect_standard_database_pool(
                    &database_config,
                )
                .await
                .map_err(|error| {
                    anyhow::Error::new(GatewayRouterError::Postgres(
                        PostgresCatalogLoadError::Database(sqlx::Error::Configuration(
                            error.to_string().into(),
                        )),
                    ))
                })?;
            prepare_claw_router_database_lifecycle(database_pool.clone())
                .await
                .map_err(anyhow::Error::new)?;
            let pool = database_pool.as_postgres().cloned().ok_or_else(|| {
                anyhow::Error::new(GatewayRouterError::Postgres(
                    PostgresCatalogLoadError::Database(sqlx::Error::Configuration(
                        "expected postgres database pool".into(),
                    )),
                ))
            })?;
            let database_installer = Arc::new(
                DatabaseInstaller::for_postgres(pool.clone())
                    .with_env_options()
                    .map_err(anyhow::Error::new)?,
            );
            if startup_install_mode.should_ensure() {
                database_installer
                    .ensure_bootstrap_data()
                    .await
                    .map_err(anyhow::Error::new)?;
            }
            let snapshot = PostgresPricingCatalogLoader::with_api_key_secret_codec(
                pool.clone(),
                api_key_secret_codec.clone(),
            )
            .with_circuit_breaker_recovery_window_seconds(
                provider_runtime.circuit_breaker_recovery_window_seconds,
            )
            .load_snapshot()
            .await
            .map_err(anyhow::Error::new)?;
            log_gateway_runtime_catalog_snapshot_summary("postgres", "startup", snapshot.summary());
            let provider_secret_resolver = openai_runtime_relay_secret_resolver(
                provider_secret_map_config.clone(),
                snapshot.managed_provider_secrets(),
            );
            let catalog = Arc::new(RefreshableSqlPricingCatalog::new(snapshot));
            let usage_settlement_wakeup =
                maybe_spawn_postgres_usage_settlement_worker(&pool, usage_settlement_worker_config)
                    .await
                    .map_err(anyhow::Error::new)?;
            spawn_postgres_catalog_refresh_worker(
                &pool,
                Arc::clone(&catalog),
                provider_secret_resolver.clone(),
                api_key_secret_codec,
                shared_catalog_refresh_interval,
                provider_runtime.circuit_breaker_recovery_window_seconds,
            );
            Ok(AllInOneRuntimeContext {
                database_config,
                database_pool,
                database_installer,
                catalog,
                api_key_security_config,
                provider_relay_config,
                provider_adapter_config,
                provider_secret_resolver,
                trusted_subject_config,
                app_session_config,
                payment_webhook_config,
                provider_runtime_config: provider_runtime,
                provider_health_probe,
                cache_manager,
                request_limits_config,
                models_catalog_root,
                deployment_mode,
                query_string_api_key_policy,
                app_runtime_gateway_client,
                app_runtime_stream_bus,
                model_ranking_refresh_worker_config,
                usage_settlement_wakeup,
            })
        }
    }
}

async fn build_gateway_router_from_all_in_one_context(
    context: &AllInOneRuntimeContext,
) -> anyhow::Result<Router> {
    let api_key_hasher =
        build_api_key_hasher(&context.api_key_security_config).map_err(anyhow::Error::new)?;
    let usage_recorder: UsageRecorder = match &context.database_pool {
        DatabasePool::Sqlite(pool, _) => {
            Arc::new(SqliteGatewayUsageRecorder::new_with_attribution(
                pool.clone(),
                gateway_trace_attribution(),
            ))
        }
        DatabasePool::Postgres(pool, _) => {
            Arc::new(PostgresGatewayUsageRecorder::new_with_attribution(
                pool.clone(),
                gateway_trace_attribution(),
            ))
        }
    };
    let primary_usage_recorder = wrap_usage_recorder_with_settlement_wakeup(
        usage_recorder,
        context.usage_settlement_wakeup.clone(),
    );

    let runtime_toml = RuntimeTomlConfig::from_env_config_file().map_err(anyhow::Error::msg)?;
    let (usage_recorder, accounting_retry_health) =
        wrap_usage_recorder_with_durable_accounting_retry(
            primary_usage_recorder,
            gateway_trace_attribution(),
            runtime_toml.as_ref(),
        )
        .await
        .map_err(anyhow::Error::new)?;
    let settlement_config = resolve_usage_settlement_worker_config(runtime_toml.as_ref());
    let readiness_check =
        sdkwork_clawrouter_router_service::infrastructure::sql::pool::runtime_readiness_check(
            context.database_pool.clone(),
            runtime_toml.as_ref(),
            settlement_config,
        );
    let readiness_check =
        combine_accounting_retry_readiness(readiness_check, accounting_retry_health);

    router_with_database_runtime_routes(
        router_with_database_status_and_passthrough_placeholder(
            Some(&context.database_config),
            true,
            readiness_check,
            Some(context.deployment_mode),
        ),
        Arc::clone(&context.catalog),
        api_key_hasher,
        context.provider_secret_resolver.clone(),
        Some(sticky_store_from_shared_database_pool(
            &context.database_pool,
        )),
        Some(usage_recorder),
        context.provider_relay_config.clone(),
        context.provider_adapter_config.clone(),
        context.provider_runtime_config.clone(),
        context.query_string_api_key_policy,
        runtime_toml.as_ref(),
    )
    .map_err(anyhow::Error::new)
}

fn gateway_sqlite_pool_error(error: impl std::fmt::Display) -> GatewayRouterError {
    GatewayRouterError::Sqlite(SqlCatalogLoadError::Database(sqlx::Error::Configuration(
        error.to_string().into(),
    )))
}

async fn prepare_claw_router_database_lifecycle(
    pool: DatabasePool,
) -> Result<(), GatewayRouterError> {
    connect_claw_router_database(pool).map_err(|error| {
        GatewayRouterError::Installer(DatabaseInstallError::InvalidState(error))
    })?;
    Ok(())
}

fn sticky_store_from_shared_database_pool(pool: &DatabasePool) -> Arc<dyn StickyRouteStore> {
    match pool {
        DatabasePool::Sqlite(pool, _) => {
            Arc::new(InvocationStickyObjectRouteStore::sqlite(pool.clone()))
        }
        DatabasePool::Postgres(pool, _) => {
            Arc::new(InvocationStickyObjectRouteStore::postgres(pool.clone()))
        }
    }
}

fn database_config_from_env_for_startup(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<Option<DatabaseConfig>, GatewayRouterError> {
    let profile = RuntimeConfigProfile::from_env_or_runtime_toml(runtime_toml)
        .map_err(GatewayRouterError::Config)?;
    if profile == RuntimeConfigProfile::Server {
        return DatabaseConfig::from_env_or_runtime_toml_or_initialize(runtime_toml)
            .map_err(GatewayRouterError::Config);
    }

    let config = DatabaseConfig::from_env().map_err(GatewayRouterError::Config)?;
    let location = DatabaseConfig::runtime_config_location_from_env(profile);
    if let Some(config) = &config {
        config
            .validate_for_runtime_profile_at(profile, &location)
            .map_err(GatewayRouterError::Config)?;
        return Ok(Some(config.clone()));
    }
    Ok(None)
}

async fn maybe_spawn_sqlite_usage_settlement_worker(
    pool: &SqlitePool,
    config: UsageSettlementWorkerConfig,
) -> Result<Option<Arc<Notify>>, GatewayRouterError> {
    let config = config.normalized();
    if !config.enabled {
        return Ok(None);
    }
    if !sdkwork_clawrouter_router_service::infrastructure::sql::pool::sqlite_usage_settlement_schema_ready(pool)
        .await
        .map_err(|error| GatewayRouterError::Sqlite(SqlCatalogLoadError::Database(error)))?
    {
        tracing::warn!(
            "usage settlement worker is enabled but SQLite settlement schema is incomplete"
        );
        return Ok(None);
    }
    let store: SettlementStore = Arc::new(SqliteUsageSettlementStore::new(pool.clone()));
    let usage_settlement_wakeup = Arc::new(Notify::new());
    spawn_usage_settlement_worker(store, config, Some(Arc::clone(&usage_settlement_wakeup)));
    Ok(Some(usage_settlement_wakeup))
}

async fn maybe_spawn_postgres_usage_settlement_worker(
    pool: &PgPool,
    config: UsageSettlementWorkerConfig,
) -> Result<Option<Arc<Notify>>, GatewayRouterError> {
    let config = config.normalized();
    if !config.enabled {
        return Ok(None);
    }
    if !sdkwork_clawrouter_router_service::infrastructure::sql::pool::postgres_usage_settlement_schema_ready(pool)
        .await
        .map_err(|error| GatewayRouterError::Postgres(PostgresCatalogLoadError::Database(error)))?
    {
        tracing::warn!(
            "usage settlement worker is enabled but Postgres settlement schema is incomplete"
        );
        return Ok(None);
    }
    let store: SettlementStore = Arc::new(PostgresUsageSettlementStore::new(pool.clone()));
    let usage_settlement_wakeup = Arc::new(Notify::new());
    spawn_usage_settlement_worker(store, config, Some(Arc::clone(&usage_settlement_wakeup)));
    Ok(Some(usage_settlement_wakeup))
}

fn wrap_usage_recorder_with_settlement_wakeup(
    usage_recorder: UsageRecorder,
    usage_settlement_wakeup: Option<Arc<Notify>>,
) -> UsageRecorder {
    match usage_settlement_wakeup {
        Some(usage_settlement_wakeup) => Arc::new(NotifyingGatewayUsageRecorder::new(
            usage_recorder,
            usage_settlement_wakeup,
        )),
        None => usage_recorder,
    }
}

async fn wrap_usage_recorder_with_durable_accounting_retry(
    primary: UsageRecorder,
    attribution: GatewayTraceAttribution,
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<(UsageRecorder, GatewayAccountingRetryHealth), GatewayRouterError> {
    let retry_queue: AccountingRetryQueue =
        if let Some(redis_config) = sdkwork_claw_config::RedisConfig::from_env_or_runtime_toml(
            runtime_toml,
        )
        .map_err(GatewayRouterError::Config)?
        {
            Arc::new(
                RedisGatewayAccountingRetryQueue::new(
                    redis_config.url(),
                    redis_config.key_prefix().unwrap_or("clawrouter"),
                )
                .map_err(|error| GatewayRouterError::Config(error.to_string()))?,
            )
        } else {
            let profile = RuntimeConfigProfile::from_env_or_runtime_toml(runtime_toml)
                .map_err(GatewayRouterError::Config)?;
            let location = DatabaseConfig::runtime_config_location_from_env(profile);
            std::fs::create_dir_all(&location.data_directory).map_err(|error| {
                GatewayRouterError::Config(format!(
                    "create durable accounting retry data directory {} failed: {error}",
                    location.data_directory.display()
                ))
            })?;
            let queue_path = location
                .data_directory
                .join("gateway-accounting-retry.sqlite3");
            Arc::new(
                SqliteGatewayAccountingRetryQueue::connect(&queue_path)
                    .await
                    .map_err(|error| GatewayRouterError::Config(error.to_string()))?,
            )
        };

    let health = GatewayAccountingRetryHealth::default();
    let primary_for_worker = Arc::clone(&primary);
    let queue_for_worker = Arc::clone(&retry_queue);
    let consumer_id = attribution
        .gateway_instance_code_snapshot
        .clone()
        .unwrap_or_else(|| "clawrouter-gateway".to_owned());
    spawn_gateway_accounting_retry_worker(
        primary_for_worker,
        queue_for_worker,
        health.clone(),
        format!("{consumer_id}-{}", std::process::id()),
    );
    let recorder: UsageRecorder = Arc::new(RetryingGatewayUsageRecorder::new_with_attribution(
        primary,
        retry_queue,
        health.clone(),
        attribution,
    ));
    Ok((recorder, health))
}

fn spawn_gateway_accounting_retry_worker(
    primary: UsageRecorder,
    retry_queue: AccountingRetryQueue,
    health: GatewayAccountingRetryHealth,
    consumer_id: String,
) {
    let worker = Arc::new(GatewayAccountingRetryWorker::new(
        primary,
        retry_queue,
        health,
        consumer_id,
        GatewayAccountingRetryWorkerConfig::default(),
    ));
    let poll_interval = worker.config().poll_interval;
    let mut shutdown_rx = sdkwork_claw_http::subscribe_shutdown_signal();
    tokio::spawn(async move {
        loop {
            let result = tokio::select! {
                _ = shutdown_rx.recv() => break,
                result = worker.run_once() => result,
            };
            match result {
                Ok(0) => {}
                Ok(processed) => {
                    tracing::debug!(processed, "gateway accounting retry worker processed deliveries");
                }
                Err(error) => {
                    tracing::warn!(error = %error, "gateway accounting retry worker run failed");
                }
            }
            tokio::select! {
                _ = shutdown_rx.recv() => break,
                _ = tokio::time::sleep(poll_interval) => {}
            }
        }
    });
}

fn combine_accounting_retry_readiness(
    database_readiness: Option<sdkwork_claw_http::ReadinessCheckFn>,
    health: GatewayAccountingRetryHealth,
) -> Option<sdkwork_claw_http::ReadinessCheckFn> {
    let mut checks = Vec::new();
    if let Some(check) = database_readiness {
        checks.push(check);
    }
    checks.push(health.readiness_check());
    sdkwork_claw_http::combine_readiness_checks(checks)
}

fn spawn_usage_settlement_worker(
    store: SettlementStore,
    config: UsageSettlementWorkerConfig,
    usage_settlement_wakeup: Option<Arc<Notify>>,
) -> tokio::task::JoinHandle<()> {
    let worker = UsageSettlementWorker::new(store, config);
    let interval = Duration::from_millis(worker.config().interval_millis);
    let mut shutdown_rx = sdkwork_claw_http::subscribe_shutdown_signal();
    tokio::spawn(async move {
        loop {
            if let Err(error) = worker.run_once().await {
                tracing::warn!(error = %error, "usage settlement worker run failed");
            }
            if shutdown_rx.try_recv().is_ok() {
                break;
            }
            if let Some(usage_settlement_wakeup) = usage_settlement_wakeup.as_ref() {
                tokio::select! {
                    _ = shutdown_rx.recv() => break,
                    _ = usage_settlement_wakeup.notified() => {}
                    _ = sleep(interval) => {}
                }
            } else {
                tokio::select! {
                    _ = shutdown_rx.recv() => break,
                    _ = sleep(interval) => {}
                }
            }
        }
        tracing::info!("usage settlement worker stopped");
    })
}

fn spawn_sqlite_catalog_refresh_worker(
    pool: &SqlitePool,
    catalog: Arc<RefreshableSqlPricingCatalog>,
    provider_secret_resolver: Option<Arc<RefreshableProviderSecretMapResolver>>,
    api_key_secret_codec: Arc<dyn ApiKeySecretCodec + Send + Sync>,
    interval: Duration,
    circuit_breaker_recovery_window_seconds: u64,
) -> tokio::task::JoinHandle<()> {
    let pool = pool.clone();
    let mut shutdown_rx = sdkwork_claw_http::subscribe_shutdown_signal();
    tokio::spawn(async move {
        let mut refresh_state = CatalogRefreshDecisionState::default();
        loop {
            tokio::select! {
                _ = shutdown_rx.recv() => break,
                _ = sleep(interval) => {}
            }
            let loader = SqlitePricingCatalogLoader::with_api_key_secret_codec(
                pool.clone(),
                api_key_secret_codec.clone(),
            )
            .with_circuit_breaker_recovery_window_seconds(circuit_breaker_recovery_window_seconds);
            let observed_version = match loader.load_routing_config_version().await {
                Ok(version) => Some(version),
                Err(error) => {
                    tracing::warn!(
                        error = %error,
                        "SQLite OpenAI runtime catalog version probe failed; attempting full refresh"
                    );
                    None
                }
            };
            if !catalog_refresh_snapshot_due(refresh_state, observed_version) {
                refresh_state = refresh_state.after_catalog_refresh_skip(observed_version);
                continue;
            }
            let refresh_started_at = std::time::Instant::now();
            match loader.load_snapshot().await {
                Ok(snapshot) => {
                    let summary = snapshot.summary();
                    if let Some(resolver) = provider_secret_resolver.as_ref() {
                        resolver.replace_managed_secrets(snapshot.managed_provider_secrets());
                    }
                    catalog.replace_snapshot(snapshot);
                    log_gateway_runtime_catalog_snapshot_summary("sqlite", "refresh", summary);
                    refresh_state = refresh_state.after_catalog_refresh_success(observed_version);
                }
                Err(error) => {
                    catalog_refresh_failures_total()
                        .with_label_values(&["sqlite"])
                        .inc();
                    tracing::warn!(
                        error = %error,
                        "SQLite OpenAI runtime catalog refresh failed; keeping previous snapshot"
                    );
                }
            }
            catalog_refresh_duration_seconds()
                .with_label_values(&["sqlite"])
                .observe(refresh_started_at.elapsed().as_secs_f64());
        }
        tracing::info!("sqlite catalog refresh worker stopped");
    })
}

fn spawn_postgres_catalog_refresh_worker(
    pool: &PgPool,
    catalog: Arc<RefreshableSqlPricingCatalog>,
    provider_secret_resolver: Option<Arc<RefreshableProviderSecretMapResolver>>,
    api_key_secret_codec: Arc<dyn ApiKeySecretCodec + Send + Sync>,
    interval: Duration,
    circuit_breaker_recovery_window_seconds: u64,
) -> tokio::task::JoinHandle<()> {
    let pool = pool.clone();
    let mut shutdown_rx = sdkwork_claw_http::subscribe_shutdown_signal();
    tokio::spawn(async move {
        let mut refresh_state = CatalogRefreshDecisionState::default();
        loop {
            tokio::select! {
                _ = shutdown_rx.recv() => break,
                _ = sleep(interval) => {}
            }
            let loader = PostgresPricingCatalogLoader::with_api_key_secret_codec(
                pool.clone(),
                api_key_secret_codec.clone(),
            )
            .with_circuit_breaker_recovery_window_seconds(circuit_breaker_recovery_window_seconds);
            let observed_version = match loader.load_routing_config_version().await {
                Ok(version) => Some(version),
                Err(error) => {
                    tracing::warn!(
                        error = %error,
                        "Postgres OpenAI runtime catalog version probe failed; attempting full refresh"
                    );
                    None
                }
            };
            if !catalog_refresh_snapshot_due(refresh_state, observed_version) {
                refresh_state = refresh_state.after_catalog_refresh_skip(observed_version);
                continue;
            }
            let refresh_started_at = std::time::Instant::now();
            match loader.load_snapshot().await {
                Ok(snapshot) => {
                    let summary = snapshot.summary();
                    if let Some(resolver) = provider_secret_resolver.as_ref() {
                        resolver.replace_managed_secrets(snapshot.managed_provider_secrets());
                    }
                    catalog.replace_snapshot(snapshot);
                    log_gateway_runtime_catalog_snapshot_summary("postgres", "refresh", summary);
                    refresh_state = refresh_state.after_catalog_refresh_success(observed_version);
                }
                Err(error) => {
                    catalog_refresh_failures_total()
                        .with_label_values(&["postgres"])
                        .inc();
                    tracing::warn!(
                        error = %error,
                        "Postgres OpenAI runtime catalog refresh failed; keeping previous snapshot"
                    );
                }
            }
            catalog_refresh_duration_seconds()
                .with_label_values(&["postgres"])
                .observe(refresh_started_at.elapsed().as_secs_f64());
        }
        tracing::info!("postgres catalog refresh worker stopped");
    })
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
struct CatalogRefreshDecisionState {
    last_seen_version: Option<i64>,
    ticks_since_full_refresh: u64,
}

impl CatalogRefreshDecisionState {
    fn after_catalog_refresh_success(self, observed_version: Option<i64>) -> Self {
        Self {
            last_seen_version: observed_version.or(self.last_seen_version),
            ticks_since_full_refresh: 0,
        }
    }

    fn after_catalog_refresh_skip(self, observed_version: Option<i64>) -> Self {
        Self {
            last_seen_version: observed_version.or(self.last_seen_version),
            ticks_since_full_refresh: self.ticks_since_full_refresh.saturating_add(1),
        }
    }
}

fn catalog_refresh_snapshot_due(
    state: CatalogRefreshDecisionState,
    observed_version: Option<i64>,
) -> bool {
    match observed_version {
        None => true,
        Some(version) if state.last_seen_version != Some(version) => true,
        Some(_) => {
            state.ticks_since_full_refresh.saturating_add(1) >= CATALOG_REFRESH_FALLBACK_TICKS
        }
    }
}

fn log_gateway_runtime_catalog_snapshot_summary(
    engine: &'static str,
    phase: &'static str,
    summary: SqlPricingCatalogSnapshotSummary,
) {
    if phase == "refresh" {
        tracing::debug!(
            service = "sdkwork-clawrouter-cloud-gateway",
            catalog_engine = engine,
            catalog_phase = phase,
            vendors = summary.vendors,
            models = summary.models,
            provider_routes = summary.provider_routes,
            callable_provider_routes = summary.callable_provider_routes,
            provider_channel_routes = summary.provider_channel_routes,
            callable_provider_channel_routes = summary.callable_provider_channel_routes,
            provider_channel_group_bindings = summary.provider_channel_group_bindings,
            routing_policies = summary.routing_policies,
            routing_rules = summary.routing_rules,
            pricing_plans = summary.pricing_plans,
            channel_groups = summary.channel_groups,
            api_keys = summary.api_keys,
            prices = summary.prices,
            managed_provider_secrets = summary.managed_provider_secrets,
            "gateway runtime catalog snapshot loaded"
        );
    } else {
        tracing::info!(
            service = "sdkwork-clawrouter-cloud-gateway",
            catalog_engine = engine,
            catalog_phase = phase,
            vendors = summary.vendors,
            models = summary.models,
            provider_routes = summary.provider_routes,
            callable_provider_routes = summary.callable_provider_routes,
            provider_channel_routes = summary.provider_channel_routes,
            callable_provider_channel_routes = summary.callable_provider_channel_routes,
            provider_channel_group_bindings = summary.provider_channel_group_bindings,
            routing_policies = summary.routing_policies,
            routing_rules = summary.routing_rules,
            pricing_plans = summary.pricing_plans,
            channel_groups = summary.channel_groups,
            api_keys = summary.api_keys,
            prices = summary.prices,
            managed_provider_secrets = summary.managed_provider_secrets,
            "gateway runtime catalog snapshot loaded"
        );
    }
}

fn parse_positive_u64_config(
    name: &str,
    config_value: Option<u64>,
    default: u64,
) -> Result<u64, String> {
    let parsed = sdkwork_claw_config::runtime::config_u64(name, config_value)?.unwrap_or(default);
    if parsed == 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(parsed)
}

fn parse_non_negative_u64_config(
    name: &str,
    config_value: Option<u64>,
    default: u64,
) -> Result<u64, String> {
    Ok(sdkwork_claw_config::runtime::config_u64(name, config_value)?.unwrap_or(default))
}

fn parse_positive_usize_config(
    name: &str,
    config_value: Option<usize>,
    default: usize,
) -> Result<usize, String> {
    let parsed = match sdkwork_claw_config::runtime::env_optional(name) {
        Some(value) => value
            .parse::<usize>()
            .map_err(|_| format!("{name} must be a positive integer"))?,
        None => config_value.unwrap_or(default),
    };
    if parsed == 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(parsed)
}

fn parse_retryable_status_codes_config(
    name: &str,
    config_value: Option<&[u16]>,
    default: &[u16],
) -> Result<Vec<u16>, String> {
    let Some(value) = sdkwork_claw_config::runtime::env_optional(name) else {
        return Ok(config_value
            .filter(|values| !values.is_empty())
            .unwrap_or(default)
            .to_vec());
    };
    let status_codes = value
        .split(',')
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| {
            value
                .parse::<u16>()
                .map_err(|_| format!("{name} must contain comma-separated HTTP status codes"))
        })
        .collect::<Result<Vec<_>, _>>()?;
    if status_codes.is_empty() {
        return Err(format!("{name} must contain at least one HTTP status code"));
    }
    Ok(status_codes)
}

fn build_api_key_hasher(config: &ApiKeySecurityConfig) -> Result<ApiKeyHasher, GatewayRouterError> {
    let hasher = HmacSha256ApiKeySecretHasher::new(config.pepper_secret())
        .map_err(|error| GatewayRouterError::Config(error.to_string()))?;
    Ok(Arc::new(hasher))
}

fn api_key_secret_codec_from_config(
    config: &ApiKeySecurityConfig,
) -> Result<ApiKeyCodec, GatewayRouterError> {
    Ok(Arc::new(
        RingAeadApiKeySecretCodec::new(config.pepper_secret())
            .map_err(|error| GatewayRouterError::Config(error.to_string()))?,
    ))
}

fn require_api_key_security_config(
    config: Option<ApiKeySecurityConfig>,
) -> Result<ApiKeySecurityConfig, GatewayRouterError> {
    config.ok_or_else(|| {
        GatewayRouterError::Config(
            "SDKWORK_CLAW_API_KEY_PEPPER is required for OpenAI runtime routes".to_owned(),
        )
    })
}

fn openai_runtime_relay_secret_resolver(
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
    managed_provider_secrets: std::collections::BTreeMap<String, String>,
) -> Option<Arc<RefreshableProviderSecretMapResolver>> {
    let external_secrets = provider_secret_map_config
        .map(ProviderSecretMapConfig::into_secret_map)
        .unwrap_or_default();
    if external_secrets.is_empty() && managed_provider_secrets.is_empty() {
        return None;
    }
    Some(Arc::new(RefreshableProviderSecretMapResolver::from_maps(
        external_secrets,
        managed_provider_secrets,
    )))
}

fn build_openai_runtime_relays(
    config: Option<ProviderRelayConfig>,
    provider_secret_resolver: Option<Arc<RefreshableProviderSecretMapResolver>>,
    provider_runtime: ProviderRelayRuntimeConfig,
    prefer_secret_ref_relays: bool,
) -> Result<OpenAiRuntimeRelays, GatewayRouterError> {
    if prefer_secret_ref_relays {
        if let Some(resolver) = provider_secret_resolver {
            return Ok(secret_ref_openai_runtime_relays(resolver, provider_runtime));
        }
    }

    if let Some(openai_relay) = config.as_ref().and_then(ProviderRelayConfig::openai_relay) {
        let endpoint = UpstreamProviderEndpoint::new(
            openai_relay.base_url().to_owned(),
            openai_relay.bearer_token().to_owned(),
        )
        .map_err(|error| GatewayRouterError::Config(error.to_string()))?;
        return Ok(OpenAiRuntimeRelays {
            chat: Some(Arc::new(
                OpenAiCompatibleChatCompletionRelay::with_full_runtime(
                    endpoint.clone(),
                    provider_runtime.response_timeout,
                    provider_runtime.stream_response_timeout,
                    provider_runtime.response_max_bytes,
                    provider_runtime.default_retry_policy.clone(),
                    provider_runtime.http_pool_config,
                ),
            )),
            chat_stream: Some(Arc::new(
                OpenAiCompatibleChatCompletionStreamRelay::with_full_runtime(
                    endpoint.clone(),
                    provider_runtime.response_timeout,
                    provider_runtime.stream_response_timeout,
                    provider_runtime.response_max_bytes,
                    provider_runtime.default_retry_policy.clone(),
                    provider_runtime.http_pool_config,
                ),
            )),
            embeddings: Some(Arc::new(
                OpenAiCompatibleEmbeddingsRelay::with_full_runtime(
                    endpoint.clone(),
                    provider_runtime.response_timeout,
                    provider_runtime.stream_response_timeout,
                    provider_runtime.response_max_bytes,
                    provider_runtime.default_retry_policy.clone(),
                    provider_runtime.http_pool_config,
                ),
            )),
            responses: Some(Arc::new(OpenAiCompatibleResponsesRelay::with_full_runtime(
                endpoint,
                provider_runtime.response_timeout,
                provider_runtime.stream_response_timeout,
                provider_runtime.response_max_bytes,
                provider_runtime.default_retry_policy,
                provider_runtime.http_pool_config,
            ))),
        });
    }

    if let Some(resolver) = provider_secret_resolver {
        return Ok(secret_ref_openai_runtime_relays(resolver, provider_runtime));
    }

    Ok(OpenAiRuntimeRelays::default())
}

fn secret_ref_openai_runtime_relays(
    resolver: Arc<RefreshableProviderSecretMapResolver>,
    provider_runtime: ProviderRelayRuntimeConfig,
) -> OpenAiRuntimeRelays {
    OpenAiRuntimeRelays {
        chat: Some(Arc::new(
            SecretRefOpenAiCompatibleChatCompletionRelay::with_full_runtime(
                resolver.clone(),
                provider_runtime.response_timeout,
                provider_runtime.stream_response_timeout,
                provider_runtime.response_max_bytes,
                provider_runtime.default_retry_policy.clone(),
                provider_runtime.http_pool_config,
            ),
        )),
        chat_stream: Some(Arc::new(
            SecretRefOpenAiCompatibleChatCompletionStreamRelay::with_full_runtime(
                resolver.clone(),
                provider_runtime.response_timeout,
                provider_runtime.stream_response_timeout,
                provider_runtime.response_max_bytes,
                provider_runtime.default_retry_policy.clone(),
                provider_runtime.http_pool_config,
            ),
        )),
        embeddings: Some(Arc::new(
            SecretRefOpenAiCompatibleEmbeddingsRelay::with_full_runtime(
                resolver.clone(),
                provider_runtime.response_timeout,
                provider_runtime.stream_response_timeout,
                provider_runtime.response_max_bytes,
                provider_runtime.default_retry_policy.clone(),
                provider_runtime.http_pool_config,
            ),
        )),
        responses: Some(Arc::new(
            SecretRefOpenAiCompatibleResponsesRelay::with_full_runtime(
                resolver,
                provider_runtime.response_timeout,
                provider_runtime.stream_response_timeout,
                provider_runtime.response_max_bytes,
                provider_runtime.default_retry_policy,
                provider_runtime.http_pool_config,
            ),
        )),
    }
}

fn apply_provider_adapter_config(
    mut relays: OpenAiRuntimeRelays,
    provider_adapter_config: Option<ProviderAdapterConfig>,
    provider_secret_resolver: Option<Arc<dyn ProviderSecretResolver + Send + Sync>>,
) -> Result<OpenAiRuntimeRelays, GatewayRouterError> {
    let Some(provider_adapter_config) = provider_adapter_config else {
        return Ok(relays);
    };
    if provider_adapter_config.routes().is_empty() {
        return Ok(relays);
    }
    let registry = Arc::new(ProviderAdapterRegistry::new(
        provider_adapter_config.routes().to_vec(),
    ));
    let adapter_client =
        ProviderAdapterHttpClient::new(provider_adapter_config.gateway_token().to_owned());
    let routes = provider_adapter_config.routes();

    if has_chat_adapter_route(routes) {
        let Some(chat_relay) = relays.chat.take() else {
            return Err(GatewayRouterError::Config(
                "provider adapter routes for openai.chat_completions require a configured chat completion relay for direct HTTP fallback"
                    .to_owned(),
            ));
        };
        let adapter_relay = AdapterAwareChatCompletionRelay::new(
            chat_relay,
            Arc::clone(&registry),
            adapter_client.clone(),
        );
        let adapter_relay = if let Some(resolver) = provider_secret_resolver.clone() {
            adapter_relay.with_secret_resolver(resolver)
        } else {
            adapter_relay
        };
        relays.chat = Some(Arc::new(adapter_relay));
        if let Some(chat_stream_relay) = relays.chat_stream.take() {
            let adapter_stream_relay = AdapterAwareChatCompletionStreamRelay::new(
                chat_stream_relay,
                Arc::clone(&registry),
                adapter_client.clone(),
            );
            let adapter_stream_relay = if let Some(resolver) = provider_secret_resolver.clone() {
                adapter_stream_relay.with_secret_resolver(resolver)
            } else {
                adapter_stream_relay
            };
            relays.chat_stream = Some(Arc::new(adapter_stream_relay));
        }
    }
    if has_responses_adapter_route(routes) {
        let Some(responses_relay) = relays.responses.take() else {
            return Err(GatewayRouterError::Config(
                "provider adapter routes for openai.responses require a configured responses relay for direct HTTP fallback"
                    .to_owned(),
            ));
        };
        let adapter_relay = AdapterAwareResponsesRelay::new(
            responses_relay,
            Arc::clone(&registry),
            adapter_client.clone(),
        );
        let adapter_relay = if let Some(resolver) = provider_secret_resolver.clone() {
            adapter_relay.with_secret_resolver(resolver)
        } else {
            adapter_relay
        };
        relays.responses = Some(Arc::new(adapter_relay));
    }
    if has_embeddings_adapter_route(routes) {
        let Some(embeddings_relay) = relays.embeddings.take() else {
            return Err(GatewayRouterError::Config(
                "provider adapter routes for openai.embeddings require a configured embeddings relay for direct HTTP fallback"
                    .to_owned(),
            ));
        };
        let adapter_relay =
            AdapterAwareEmbeddingsRelay::new(embeddings_relay, registry, adapter_client);
        let adapter_relay = if let Some(resolver) = provider_secret_resolver {
            adapter_relay.with_secret_resolver(resolver)
        } else {
            adapter_relay
        };
        relays.embeddings = Some(Arc::new(adapter_relay));
    }
    Ok(relays)
}

async fn provider_adapter_config_from_env_or_runtime_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<Option<ProviderAdapterConfig>, String> {
    let local_config = ProviderAdapterConfig::from_env_or_runtime_toml(runtime_toml)?;
    if local_config.is_some() {
        return Ok(local_config);
    }

    let Some(discovery_config) =
        ProviderAdapterManifestDiscoveryConfig::from_env_or_runtime_toml(runtime_toml)?
    else {
        return Ok(None);
    };
    let client = ProviderAdapterHttpClient::new(discovery_config.gateway_token().to_owned());
    let manifest = client
        .fetch_manifest(discovery_config.adapter_base_url())
        .await
        .map_err(|error| {
            format!(
                "provider adapter manifest discovery failed: {}",
                error.message
            )
        })?;
    let adapter_config = ProviderAdapterConfig::from_manifest(
        discovery_config.adapter_base_url(),
        &manifest,
        Some(discovery_config.gateway_token().to_owned()),
    )?;
    if adapter_config.routes().is_empty() {
        Ok(None)
    } else {
        Ok(Some(adapter_config))
    }
}

fn has_chat_adapter_route(routes: &[ProviderAdapterRouteConfig]) -> bool {
    routes.iter().any(|route| {
        adapter_route_matches_endpoint(
            route,
            "openai.chat_completions",
            "chat",
            "/v1/chat/completions",
        )
    })
}

fn has_responses_adapter_route(routes: &[ProviderAdapterRouteConfig]) -> bool {
    routes.iter().any(|route| {
        adapter_route_matches_endpoint(route, "openai.responses", "responses", "/v1/responses")
    })
}

fn has_embeddings_adapter_route(routes: &[ProviderAdapterRouteConfig]) -> bool {
    routes.iter().any(|route| {
        adapter_route_matches_endpoint(route, "openai.embeddings", "embeddings", "/v1/embeddings")
    })
}

fn adapter_route_matches_endpoint(
    route: &ProviderAdapterRouteConfig,
    endpoint_key: &str,
    capability: &str,
    standard_path: &str,
) -> bool {
    route.status == AdapterRouteStatus::Enabled
        && (route
            .endpoint_key
            .as_deref()
            .is_some_and(|value| value.trim().eq_ignore_ascii_case(endpoint_key))
            || route
                .capability
                .as_deref()
                .is_some_and(|value| value.trim().eq_ignore_ascii_case(capability))
            || adapter_path_pattern_matches(route.standard_path_pattern.as_str(), standard_path))
}

fn adapter_path_pattern_matches(pattern: &str, path: &str) -> bool {
    let pattern = normalize_adapter_path(pattern);
    let path = normalize_adapter_path(path);
    if pattern.eq_ignore_ascii_case(&path) || pattern == "/*" {
        return true;
    }
    let pattern_lower = pattern.to_ascii_lowercase();
    let path_lower = path.to_ascii_lowercase();
    pattern_lower
        .strip_suffix("/*")
        .is_some_and(|prefix| path_lower == prefix || path_lower.starts_with(&format!("{prefix}/")))
}

fn normalize_adapter_path(value: &str) -> String {
    let value = value.trim();
    if value.starts_with('/') {
        value.to_owned()
    } else {
        format!("/{value}")
    }
}

#[derive(Clone)]
struct ProviderRelayRuntimeConfig {
    response_timeout: Duration,
    stream_response_timeout: Duration,
    response_max_bytes: u64,
    http_pool_config: ProviderRelayHttpPoolConfig,
    default_retry_policy: ProviderRetryPolicy,
    catalog_refresh_interval: Duration,
    circuit_breaker_recovery_window_seconds: u64,
    failure_strategy: OpenAiRuntimeFailureStrategy,
    tenant_inflight_config: TenantInflightConfig,
    estimated_instance_count: u32,
}

fn provider_relay_runtime_config_from_env_or_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<ProviderRelayRuntimeConfig, String> {
    const RESPONSE_TIMEOUT: &str = "SDKWORK_CLAW_PROVIDER_RESPONSE_TIMEOUT_MILLIS";
    const STREAM_RESPONSE_TIMEOUT: &str = "SDKWORK_CLAW_PROVIDER_STREAM_RESPONSE_TIMEOUT_MILLIS";
    const RESPONSE_MAX_BYTES: &str = "SDKWORK_CLAW_PROVIDER_RESPONSE_MAX_BYTES";
    const RETRY_MAX_ATTEMPTS: &str = "SDKWORK_CLAW_PROVIDER_RETRY_MAX_ATTEMPTS";
    const RETRY_STATUS_CODES: &str = "SDKWORK_CLAW_PROVIDER_RETRYABLE_STATUS_CODES";
    const RETRY_BACKOFF: &str = "SDKWORK_CLAW_PROVIDER_RETRY_BACKOFF_MILLIS";
    const CATALOG_REFRESH_INTERVAL: &str = "SDKWORK_CLAW_PROVIDER_CATALOG_REFRESH_INTERVAL_MILLIS";
    const CIRCUIT_BREAKER_RECOVERY_WINDOW: &str =
        "SDKWORK_CLAW_PROVIDER_CIRCUIT_BREAKER_RECOVERY_WINDOW_MILLIS";
    const FAILURE_STRATEGY: &str = "SDKWORK_CLAW_PROVIDER_FAILURE_STRATEGY";
    const POOL_IDLE_TIMEOUT: &str = "SDKWORK_CLAW_PROVIDER_HTTP_POOL_IDLE_TIMEOUT_SECONDS";
    const POOL_MAX_IDLE_PER_HOST: &str = "SDKWORK_CLAW_PROVIDER_HTTP_POOL_MAX_IDLE_PER_HOST";
    const HTTP2_KEEP_ALIVE_INTERVAL: &str =
        "SDKWORK_CLAW_PROVIDER_HTTP2_KEEP_ALIVE_INTERVAL_SECONDS";
    const HTTP2_KEEP_ALIVE_TIMEOUT: &str = "SDKWORK_CLAW_PROVIDER_HTTP2_KEEP_ALIVE_TIMEOUT_SECONDS";
    const CONNECT_TIMEOUT: &str = "SDKWORK_CLAW_PROVIDER_HTTP_CONNECT_TIMEOUT_SECONDS";
    const ESTIMATED_INSTANCE_COUNT: &str =
        "SDKWORK_CLAW_PROVIDER_RATE_LIMIT_ESTIMATED_INSTANCE_COUNT";
    const TENANT_MAX_INFLIGHT: &str = "SDKWORK_CLAW_PROVIDER_TENANT_MAX_INFLIGHT_REQUESTS";

    let response_timeout_millis = parse_positive_u64_config(
        RESPONSE_TIMEOUT,
        runtime_toml.and_then(|config| config.provider_relay.runtime.response_timeout_millis),
        DEFAULT_PROVIDER_RESPONSE_TIMEOUT_MILLIS,
    )?;
    let stream_response_timeout_millis = parse_positive_u64_config(
        STREAM_RESPONSE_TIMEOUT,
        runtime_toml
            .and_then(|config| config.provider_relay.runtime.stream_response_timeout_millis),
        DEFAULT_PROVIDER_STREAM_RESPONSE_TIMEOUT_MILLIS,
    )?;
    let response_max_bytes = parse_positive_u64_config(
        RESPONSE_MAX_BYTES,
        runtime_toml.and_then(|config| config.provider_relay.runtime.provider_response_max_bytes),
        DEFAULT_PROVIDER_RESPONSE_MAX_BYTES,
    )?;
    let retry_max_attempts = parse_positive_usize_config(
        RETRY_MAX_ATTEMPTS,
        runtime_toml.and_then(|config| config.provider_relay.retry.max_attempts),
        DEFAULT_PROVIDER_RETRY_ATTEMPTS,
    )?;
    let retryable_status_codes = parse_retryable_status_codes_config(
        RETRY_STATUS_CODES,
        runtime_toml.map(|config| {
            config
                .provider_relay
                .retry
                .retryable_status_codes
                .as_slice()
        }),
        DEFAULT_RETRYABLE_PROVIDER_STATUS_CODES.as_slice(),
    )?;
    let retry_backoff_millis = parse_non_negative_u64_config(
        RETRY_BACKOFF,
        runtime_toml.and_then(|config| config.provider_relay.retry.backoff_millis),
        0,
    )?;
    let default_retry_policy = ProviderRetryPolicy::new(
        retry_max_attempts,
        retryable_status_codes,
        retry_backoff_millis,
    )
    .map_err(|error| error.to_string())?;
    let catalog_refresh_interval_millis = parse_positive_u64_config(
        CATALOG_REFRESH_INTERVAL,
        runtime_toml.and_then(|config| {
            config
                .provider_relay
                .runtime
                .catalog_refresh_interval_millis
        }),
        DEFAULT_OPENAI_RUNTIME_CATALOG_REFRESH_INTERVAL_MILLIS,
    )?;
    let circuit_breaker_recovery_window_millis = parse_positive_u64_config(
        CIRCUIT_BREAKER_RECOVERY_WINDOW,
        runtime_toml.and_then(|config| {
            config
                .provider_relay
                .runtime
                .circuit_breaker_recovery_window_millis
        }),
        DEFAULT_PROVIDER_CIRCUIT_BREAKER_RECOVERY_WINDOW_SECONDS * 1_000,
    )?;
    let failure_strategy = parse_openai_runtime_failure_strategy(
        sdkwork_claw_config::runtime::env_optional(FAILURE_STRATEGY)
            .or_else(|| {
                runtime_toml
                    .and_then(|config| config.provider_relay.runtime.failure_strategy.as_deref())
                    .map(str::to_owned)
            })
            .as_deref(),
    )?;

    let http_pool_section = runtime_toml.map(|config| &config.provider_relay.http_pool);
    let http_pool_config = match http_pool_section {
        Some(section) => ProviderRelayHttpPoolConfig::from_section(section),
        None => ProviderRelayHttpPoolConfig::default(),
    };
    let http_pool_config = ProviderRelayHttpPoolConfig {
        pool_idle_timeout: parse_positive_u64_config(
            POOL_IDLE_TIMEOUT,
            http_pool_section.and_then(|section| section.pool_idle_timeout_seconds),
            http_pool_config.pool_idle_timeout.as_secs(),
        )
        .map(Duration::from_secs)?,
        pool_max_idle_per_host: parse_positive_usize_config(
            POOL_MAX_IDLE_PER_HOST,
            http_pool_section.and_then(|section| section.pool_max_idle_per_host),
            http_pool_config.pool_max_idle_per_host,
        )?,
        http2_keep_alive_interval: parse_positive_u64_config(
            HTTP2_KEEP_ALIVE_INTERVAL,
            http_pool_section.and_then(|section| section.http2_keep_alive_interval_seconds),
            http_pool_config.http2_keep_alive_interval.as_secs(),
        )
        .map(Duration::from_secs)?,
        http2_keep_alive_timeout: parse_positive_u64_config(
            HTTP2_KEEP_ALIVE_TIMEOUT,
            http_pool_section.and_then(|section| section.http2_keep_alive_timeout_seconds),
            http_pool_config.http2_keep_alive_timeout.as_secs(),
        )
        .map(Duration::from_secs)?,
        connect_timeout: parse_positive_u64_config(
            CONNECT_TIMEOUT,
            http_pool_section.and_then(|section| section.connect_timeout_seconds),
            http_pool_config.connect_timeout.as_secs(),
        )
        .map(Duration::from_secs)?,
    };

    let rate_limit_section = runtime_toml.map(|config| &config.provider_relay.rate_limit);
    let estimated_instance_count = parse_positive_u32_config(
        ESTIMATED_INSTANCE_COUNT,
        rate_limit_section.and_then(|section| section.estimated_instance_count),
        1,
    )?;
    let tenant_max_inflight = parse_positive_u32_config(
        TENANT_MAX_INFLIGHT,
        rate_limit_section.and_then(|section| section.tenant_max_inflight_requests),
        TenantInflightConfig::default().max_inflight,
    )?;
    let tenant_inflight_config = TenantInflightConfig {
        max_inflight: tenant_max_inflight,
    };

    Ok(ProviderRelayRuntimeConfig {
        response_timeout: Duration::from_millis(response_timeout_millis),
        stream_response_timeout: Duration::from_millis(stream_response_timeout_millis),
        response_max_bytes,
        http_pool_config,
        default_retry_policy,
        catalog_refresh_interval: Duration::from_millis(catalog_refresh_interval_millis),
        circuit_breaker_recovery_window_seconds: seconds_ceil_from_millis(
            circuit_breaker_recovery_window_millis,
        ),
        failure_strategy,
        tenant_inflight_config,
        estimated_instance_count,
    })
}

fn parse_positive_u32_config(
    name: &str,
    config_value: Option<u32>,
    default: u32,
) -> Result<u32, String> {
    let parsed = sdkwork_claw_config::runtime::config_u32(name, config_value)?.unwrap_or(default);
    if parsed == 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(parsed)
}

fn parse_openai_runtime_failure_strategy(
    value: Option<&str>,
) -> Result<OpenAiRuntimeFailureStrategy, String> {
    match value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("failover")
        .to_ascii_lowercase()
        .as_str()
    {
        "failover" | "fail_over" | "fail-over" => Ok(OpenAiRuntimeFailureStrategy::Failover),
        "fail_closed" | "fail-closed" | "failclosed" => {
            Ok(OpenAiRuntimeFailureStrategy::FailClosed)
        }
        _ => Err(
            "SDKWORK_CLAW_PROVIDER_FAILURE_STRATEGY must be one of failover or fail_closed"
                .to_owned(),
        ),
    }
}

fn seconds_ceil_from_millis(millis: u64) -> u64 {
    millis.saturating_add(999) / 1_000
}

#[derive(Debug)]
pub enum GatewayRouterError {
    Config(String),
    Installer(DatabaseInstallError),
    Sqlite(SqlCatalogLoadError),
    Postgres(PostgresCatalogLoadError),
}

impl std::fmt::Display for GatewayRouterError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Config(error) => write!(f, "{error}"),
            Self::Installer(error) => write!(f, "{error}"),
            Self::Sqlite(error) => write!(f, "{error}"),
            Self::Postgres(error) => write!(f, "{error}"),
        }
    }
}

impl std::error::Error for GatewayRouterError {}

impl From<SqlCatalogLoadError> for GatewayRouterError {
    fn from(value: SqlCatalogLoadError) -> Self {
        Self::Sqlite(value)
    }
}

impl From<DatabaseInstallError> for GatewayRouterError {
    fn from(value: DatabaseInstallError) -> Self {
        Self::Installer(value)
    }
}

impl From<PostgresCatalogLoadError> for GatewayRouterError {
    fn from(value: PostgresCatalogLoadError) -> Self {
        Self::Postgres(value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn no_database_router_health_uses_explicit_deployment_mode() {
        use axum::body::{to_bytes, Body};
        use axum::http::Request;
        use tower::ServiceExt;

        let response = router_without_database(DeploymentMode::Server)
            .oneshot(
                Request::builder()
                    .uri("/healthz")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!("server", payload["deployment_mode"]);
        assert_eq!(false, payload["database"]["configured"]);
    }

    #[tokio::test]
    async fn embedded_sdkwork_api_cloud_gateway_router_builds_for_all_in_one_runtime() {
        let _router = build_embedded_sdkwork_api_cloud_gateway_router(Router::new(), Router::new())
            .await
            .expect("embedded SDKWork API Gateway router should build");
    }

    #[test]
    fn gateway_dependency_surfaces_resolve_product_api_keys_before_broad_iam_catch_all() {
        use sdkwork_api_cloud_gateway_config::APPBASE_APP_API_SERVICE_ID;
        use sdkwork_api_cloud_gateway_registry::GatewayRouteRegistry;

        let surfaces = claw_router_gateway_dependency_surfaces();
        assert_eq!(5, surfaces.len());
        assert_eq!(
            surfaces[0].api_prefix, "/app/v3/api/iam/api_keys",
            "product-owned api_keys surface must be declared first for precedence"
        );
        assert_eq!(
            surfaces[1].service_id, APPBASE_APP_API_SERVICE_ID,
            "sdkwork-iam app-api surface must be declared for auth/iam/oauth catch-all routes"
        );

        let registry = GatewayRouteRegistry::from_dependency_surfaces(&surfaces);
        let api_keys_route = registry
            .resolve("GET", "/app/v3/api/iam/api_keys")
            .expect("api_keys list route should resolve");
        assert_eq!(
            api_keys_route.service_id, CLAW_ROUTER_APP_API_SERVICE_ID,
            "api_keys must route to clawrouter product app-api"
        );

        let iam_user_route = registry
            .resolve("GET", "/app/v3/api/iam/users/current")
            .expect("iam users/current route should resolve");
        assert_eq!(
            iam_user_route.service_id, APPBASE_APP_API_SERVICE_ID,
            "generic iam paths must route to sdkwork-iam app-api"
        );
    }

    #[test]
    fn runtime_catalog_refresh_decision_refreshes_first_observed_version() {
        assert!(catalog_refresh_snapshot_due(
            CatalogRefreshDecisionState::default(),
            Some(7)
        ));
    }

    #[test]
    fn runtime_catalog_refresh_decision_skips_unchanged_version_before_fallback() {
        let state = CatalogRefreshDecisionState {
            last_seen_version: Some(7),
            ticks_since_full_refresh: 0,
        };

        assert!(!catalog_refresh_snapshot_due(state, Some(7)));
        assert_eq!(
            CatalogRefreshDecisionState {
                last_seen_version: Some(7),
                ticks_since_full_refresh: 1,
            },
            state.after_catalog_refresh_skip(Some(7))
        );
    }

    #[test]
    fn runtime_catalog_refresh_decision_refreshes_changed_version() {
        let state = CatalogRefreshDecisionState {
            last_seen_version: Some(7),
            ticks_since_full_refresh: 3,
        };

        assert!(catalog_refresh_snapshot_due(state, Some(8)));
        assert_eq!(
            CatalogRefreshDecisionState {
                last_seen_version: Some(8),
                ticks_since_full_refresh: 0,
            },
            state.after_catalog_refresh_success(Some(8))
        );
    }

    #[test]
    fn runtime_catalog_refresh_decision_refreshes_unchanged_version_on_fallback_tick() {
        let state = CatalogRefreshDecisionState {
            last_seen_version: Some(7),
            ticks_since_full_refresh: CATALOG_REFRESH_FALLBACK_TICKS - 1,
        };

        assert!(catalog_refresh_snapshot_due(state, Some(7)));
    }

    #[test]
    fn runtime_catalog_refresh_decision_refreshes_when_version_probe_fails() {
        let state = CatalogRefreshDecisionState {
            last_seen_version: Some(7),
            ticks_since_full_refresh: 0,
        };

        assert!(catalog_refresh_snapshot_due(state, None));
        assert_eq!(
            CatalogRefreshDecisionState {
                last_seen_version: Some(7),
                ticks_since_full_refresh: 0,
            },
            state.after_catalog_refresh_success(None)
        );
    }

    #[test]
    fn gateway_runtime_sqlite_pool_options_raise_file_database_max_connections_and_set_acquire_timeout(
    ) {
        use sdkwork_clawrouter_router_service::infrastructure::sql::pool::{
            effective_sqlite_runtime_pool_max_connections, SQLITE_POOL_ACQUIRE_TIMEOUT_SECONDS,
            SQLITE_RUNTIME_MIN_POOL_CONNECTIONS,
        };

        assert_eq!(
            SQLITE_RUNTIME_MIN_POOL_CONNECTIONS,
            effective_sqlite_runtime_pool_max_connections(
                "sqlite://D:/tmp/sdkwork-clawrouter.db",
                1
            )
        );
        assert_eq!(10, SQLITE_POOL_ACQUIRE_TIMEOUT_SECONDS);
    }

    #[test]
    fn gateway_runtime_sqlite_pool_options_preserve_in_memory_configured_max_connections() {
        use sdkwork_clawrouter_router_service::infrastructure::sql::pool::effective_sqlite_runtime_pool_max_connections;

        assert_eq!(
            1,
            effective_sqlite_runtime_pool_max_connections("sqlite::memory:", 1)
        );
    }

    #[test]
    fn database_runtime_does_not_enable_empty_secret_ref_resolver() {
        let resolver =
            openai_runtime_relay_secret_resolver(None, std::collections::BTreeMap::new());

        assert!(
            resolver.is_none(),
            "an empty resolver must not override an explicit provider relay config"
        );
    }

    #[tokio::test]
    async fn provider_adapter_config_discovers_manifest_from_adapter_service() {
        use axum::extract::State;
        use axum::http::HeaderMap;
        use axum::routing::get;
        use sdkwork_claw_provider_adapter_contract::{
            AdapterEndpointRuntimeState, AdapterInvocationShape, ProviderAdapterEndpointManifest,
            ProviderAdapterManifest, ProviderAdapterProviderManifest,
        };
        use std::sync::Mutex;

        let captured_authorization = Arc::new(Mutex::new(None::<String>));
        let app = Router::new()
            .route(
                "/internal/adapter-manifest",
                get(
                    |State(captured_authorization): State<Arc<Mutex<Option<String>>>>,
                     headers: HeaderMap| async move {
                        *captured_authorization.lock().unwrap() = headers
                            .get(axum::http::header::AUTHORIZATION)
                            .and_then(|value| value.to_str().ok())
                            .map(str::to_owned);
                        axum::Json(ProviderAdapterManifest {
                            providers: vec![ProviderAdapterProviderManifest {
                                package: "tencent-cloud".to_owned(),
                                provider_family: "tencent-cloud".to_owned(),
                                provider_codes: vec!["tencent-cloud".to_owned()],
                                endpoints: vec![ProviderAdapterEndpointManifest {
                                    endpoint_key: "video.start_end2video".to_owned(),
                                    capability: Some("video_generation".to_owned()),
                                    service_group: None,
                                    openapi_operation_id: None,
                                    s3_operation: None,
                                    iaas_operation: None,
                                    request_schema: None,
                                    response_schema: None,
                                    endpoint_styles: Vec::new(),
                                    runtime_state: AdapterEndpointRuntimeState::RuntimeAvailable,
                                    method: "POST".to_owned(),
                                    standard_path_pattern: "/vidu/ent/v2/start-end2video"
                                        .to_owned(),
                                    invocation_shape: AdapterInvocationShape::AsyncTaskStart,
                                }],
                            }],
                        })
                    },
                ),
            )
            .with_state(Arc::clone(&captured_authorization));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base_url = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        let runtime_toml = RuntimeTomlConfig::from_toml_str(&format!(
            r#"
[provider_adapter]
adapter_base_url = "{base_url}/"
gateway_token = "adapter-token"
"#
        ))
        .unwrap();

        let adapter_config = provider_adapter_config_from_env_or_runtime_toml(Some(&runtime_toml))
            .await
            .unwrap()
            .unwrap();

        assert_eq!("adapter-token", adapter_config.gateway_token());
        assert_eq!(1, adapter_config.routes().len());
        let route = &adapter_config.routes()[0];
        assert_eq!("tencent-cloud", route.provider_code);
        assert_eq!(base_url, route.adapter_base_url);
        assert_eq!(Some("video.start_end2video"), route.endpoint_key.as_deref());
        assert_eq!(
            Some("Bearer adapter-token".to_owned()),
            captured_authorization.lock().unwrap().clone()
        );

        server.abort();
    }

    #[tokio::test]
    async fn provider_adapter_config_fails_when_explicit_manifest_discovery_fails() {
        use axum::http::StatusCode;
        use axum::routing::get;

        let app = Router::new().route(
            "/internal/adapter-manifest",
            get(|| async { StatusCode::UNAUTHORIZED }),
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base_url = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        let runtime_toml = RuntimeTomlConfig::from_toml_str(&format!(
            r#"
[provider_adapter]
adapter_base_url = "{base_url}"
gateway_token = "adapter-token"
"#
        ))
        .unwrap();

        let error = provider_adapter_config_from_env_or_runtime_toml(Some(&runtime_toml))
            .await
            .unwrap_err();

        assert!(error.contains("provider adapter manifest discovery failed"));

        server.abort();
    }

    #[tokio::test]
    async fn provider_adapter_config_does_not_discover_without_explicit_base_url() {
        let runtime_toml = RuntimeTomlConfig::from_toml_str(
            r#"
[provider_adapter]
gateway_token = "adapter-token"
"#,
        )
        .unwrap();

        let adapter_config = provider_adapter_config_from_env_or_runtime_toml(Some(&runtime_toml))
            .await
            .unwrap();

        assert!(adapter_config.is_none());
    }

    #[tokio::test]
    async fn provider_adapter_config_discovery_empty_manifest_keeps_adapter_disabled() {
        use axum::routing::get;
        use sdkwork_claw_provider_adapter_contract::ProviderAdapterManifest;

        let app = Router::new().route(
            "/internal/adapter-manifest",
            get(|| async { axum::Json(ProviderAdapterManifest { providers: vec![] }) }),
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base_url = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        let runtime_toml = RuntimeTomlConfig::from_toml_str(&format!(
            r#"
[provider_adapter]
adapter_base_url = "{base_url}"
gateway_token = "adapter-token"
"#
        ))
        .unwrap();

        let adapter_config = provider_adapter_config_from_env_or_runtime_toml(Some(&runtime_toml))
            .await
            .unwrap();

        assert!(adapter_config.is_none());

        server.abort();
    }
}
