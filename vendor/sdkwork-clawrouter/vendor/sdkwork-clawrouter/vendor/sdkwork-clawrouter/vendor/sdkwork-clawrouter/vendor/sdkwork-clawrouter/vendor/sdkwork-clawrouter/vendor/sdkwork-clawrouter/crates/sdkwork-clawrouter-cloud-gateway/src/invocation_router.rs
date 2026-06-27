use std::sync::Arc;

use axum::body::Body;
use axum::http::Request;
use axum::Router;
use sdkwork_claw_config::{ProviderAdapterConfig, RedisConfig, RuntimeTomlConfig};
use sdkwork_clawrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::application::{
    AccountResolutionInterceptor, BillingPolicyInterceptor, DispatchExecutor,
    GatewayInvocationPolicyGuard, GatewayInvocationRateLimiter, InvocationPipeline,
    PayloadExtractionInterceptor, PricingFinalizationInterceptor, PricingPreflightInterceptor,
    PricingSettlementInterceptor, ProviderAdapterDispatchInterceptor,
    ResponseNormalizationInterceptor, RoutePlanningInterceptor, StickyCommitInterceptor,
    StickyResolutionInterceptor, TraceTelemetryInterceptor, UsageExtractionInterceptor,
    UsageRecordingInterceptor,
};
use sdkwork_clawrouter_router_service::ports::{
    GatewayUsageRecorder, InvocationDispatcher, PricingCatalog, ProviderAdapterRouteResolver,
    ProviderSecretResolver, StickyRouteStore,
};

use crate::invocation_http::handle_invocation;
use crate::invocation_provider_adapter::InvocationProviderAdapterResolver;

pub(crate) struct InvocationRouterState<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    pub(crate) catalog: Arc<C>,
    pub(crate) api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    pub(crate) pipeline: InvocationPipeline,
    pub(crate) invocation_policy_guard: Arc<GatewayInvocationPolicyGuard>,
}

impl<C> Clone for InvocationRouterState<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    fn clone(&self) -> Self {
        Self {
            catalog: Arc::clone(&self.catalog),
            api_key_hasher: Arc::clone(&self.api_key_hasher),
            pipeline: self.pipeline.clone(),
            invocation_policy_guard: Arc::clone(&self.invocation_policy_guard),
        }
    }
}

fn invocation_policy_guard_from_rate_limiter(
    rate_limiter: Arc<GatewayInvocationRateLimiter>,
) -> Arc<GatewayInvocationPolicyGuard> {
    Arc::new(GatewayInvocationPolicyGuard::new(rate_limiter))
}

fn default_invocation_policy_guard() -> Arc<GatewayInvocationPolicyGuard> {
    invocation_policy_guard_from_rate_limiter(Arc::new(GatewayInvocationRateLimiter::new()))
}

pub fn invocation_policy_guard_from_runtime_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Arc<GatewayInvocationPolicyGuard> {
    let redis_config = RedisConfig::from_env_or_runtime_toml(runtime_toml)
        .ok()
        .flatten();
    invocation_policy_guard_from_rate_limiter(Arc::new(
        GatewayInvocationRateLimiter::try_with_redis_config(redis_config.as_ref()),
    ))
}

fn invocation_router_state<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    pipeline: InvocationPipeline,
    invocation_policy_guard: Arc<GatewayInvocationPolicyGuard>,
) -> InvocationRouterState<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    InvocationRouterState {
        catalog,
        api_key_hasher,
        pipeline,
        invocation_policy_guard,
    }
}

pub fn invocation_router_with_catalog_api_key_hasher_dispatcher_and_secret_resolver<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    dispatcher: Arc<dyn InvocationDispatcher>,
    secret_resolver: Arc<dyn ProviderSecretResolver + Send + Sync>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    invocation_router_with_state(invocation_router_state(
        Arc::clone(&catalog),
        api_key_hasher,
        invocation_pipeline(catalog, dispatcher, Some(secret_resolver), None, None, None),
        default_invocation_policy_guard(),
    ))
}

pub fn invocation_router_with_catalog_api_key_hasher_and_dispatcher<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    dispatcher: Arc<dyn InvocationDispatcher>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    invocation_router_with_state(invocation_router_state(
        Arc::clone(&catalog),
        api_key_hasher,
        invocation_pipeline(catalog, dispatcher, None, None, None, None),
        default_invocation_policy_guard(),
    ))
}

pub fn invocation_router_with_catalog_api_key_hasher_dispatcher_secret_resolver_and_sticky_store<
    C,
>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    dispatcher: Arc<dyn InvocationDispatcher>,
    secret_resolver: Arc<dyn ProviderSecretResolver + Send + Sync>,
    sticky_store: Arc<dyn StickyRouteStore>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    invocation_router_with_state(invocation_router_state(
        Arc::clone(&catalog),
        api_key_hasher,
        invocation_pipeline(
            catalog,
            dispatcher,
            Some(secret_resolver),
            Some(sticky_store),
            None,
            None,
        ),
        default_invocation_policy_guard(),
    ))
}

pub fn invocation_router_with_full_pipeline<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    dispatcher: Arc<dyn InvocationDispatcher>,
    secret_resolver: Option<Arc<dyn ProviderSecretResolver + Send + Sync>>,
    sticky_store: Option<Arc<dyn StickyRouteStore>>,
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    invocation_router_with_state(invocation_router_state(
        Arc::clone(&catalog),
        api_key_hasher,
        invocation_pipeline(
            catalog,
            dispatcher,
            secret_resolver,
            sticky_store,
            usage_recorder,
            None,
        ),
        default_invocation_policy_guard(),
    ))
}

pub fn invocation_router_with_full_pipeline_and_provider_adapter_config<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    dispatcher: Arc<dyn InvocationDispatcher>,
    secret_resolver: Option<Arc<dyn ProviderSecretResolver + Send + Sync>>,
    sticky_store: Option<Arc<dyn StickyRouteStore>>,
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    provider_adapter_config: Option<ProviderAdapterConfig>,
    invocation_policy_guard: Option<Arc<GatewayInvocationPolicyGuard>>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let adapter_resolver = provider_adapter_config
        .and_then(InvocationProviderAdapterResolver::from_config)
        .map(|resolver| Arc::new(resolver) as Arc<dyn ProviderAdapterRouteResolver>);
    invocation_router_with_state(invocation_router_state(
        Arc::clone(&catalog),
        api_key_hasher,
        invocation_pipeline(
            catalog,
            dispatcher,
            secret_resolver,
            sticky_store,
            usage_recorder,
            adapter_resolver,
        ),
        invocation_policy_guard.unwrap_or_else(default_invocation_policy_guard),
    ))
}

fn invocation_router_with_state<C>(state: InvocationRouterState<C>) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    Router::new().fallback(move |request: Request<Body>| handle_invocation(state.clone(), request))
}

fn invocation_pipeline<C>(
    catalog: Arc<C>,
    dispatcher: Arc<dyn InvocationDispatcher>,
    secret_resolver: Option<Arc<dyn ProviderSecretResolver + Send + Sync>>,
    sticky_store: Option<Arc<dyn StickyRouteStore>>,
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    adapter_resolver: Option<Arc<dyn ProviderAdapterRouteResolver>>,
) -> InvocationPipeline
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let mut pipeline = InvocationPipeline::new()
        .with_interceptor(PayloadExtractionInterceptor::default())
        .with_interceptor(BillingPolicyInterceptor::default());

    if let Some(sticky_store) = sticky_store.clone() {
        pipeline = pipeline.with_interceptor(StickyResolutionInterceptor::new(sticky_store));
    }

    pipeline = pipeline
        .with_interceptor(RoutePlanningInterceptor::new(Arc::clone(&catalog)))
        .with_interceptor(AccountResolutionInterceptor::new(Arc::clone(&catalog)));

    let mut dispatch_executor = match secret_resolver {
        Some(secret_resolver) => {
            DispatchExecutor::with_secret_resolver(dispatcher, secret_resolver)
        }
        None => DispatchExecutor::new(dispatcher),
    };

    if let Some(adapter_resolver) = adapter_resolver {
        pipeline = pipeline.with_interceptor(ProviderAdapterDispatchInterceptor::new(Arc::clone(
            &adapter_resolver,
        )));
        dispatch_executor = dispatch_executor.with_adapter_resolver(adapter_resolver);
    }

    pipeline = pipeline.with_interceptor(PricingPreflightInterceptor::new(Arc::clone(&catalog)));

    pipeline = pipeline
        .with_interceptor(ResponseNormalizationInterceptor::default())
        .with_interceptor(dispatch_executor);

    if let Some(sticky_store) = sticky_store {
        pipeline = pipeline.with_interceptor(StickyCommitInterceptor::new(sticky_store));
    }
    if let Some(usage_recorder) = usage_recorder {
        pipeline = pipeline.with_interceptor(UsageRecordingInterceptor::new(usage_recorder));
    }

    pipeline
        .with_interceptor(PricingSettlementInterceptor::default())
        .with_interceptor(PricingFinalizationInterceptor::new(catalog))
        .with_interceptor(TraceTelemetryInterceptor::default())
        .with_interceptor(UsageExtractionInterceptor::default())
}
