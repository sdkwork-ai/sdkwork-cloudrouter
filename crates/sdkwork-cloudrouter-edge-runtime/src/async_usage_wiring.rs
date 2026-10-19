use std::sync::Arc;

use chrono::Duration;
use sdkwork_cloudrouter_router_service::application::{
    AsyncUsageTaskWorker, AsyncUsageWorkerConfig, PipelineAsyncPollTransport,
    ProviderAsyncUsageExecutor, ReplayAsyncUsageSettler,
};
use sdkwork_cloudrouter_router_service::ports::{
    AsyncUsageTaskStore, GatewayBillingStore, GatewayUsageRecorder, InvocationDispatcher,
    PricingCatalog, PricingDefaultRegionProvider, ProviderSecretResolver,
    UpstreamAccountRouteCatalog,
};

/// Assembles the asynchronous usage reconciliation worker from the runtime's
/// already-constructed collaborators.
///
/// Wiring is deliberately a pure builder: it performs no IO and starts no task,
/// so the runtime can construct it once, decide from
/// [`AsyncUsageWorkerConfig`] whether to run it, and tests can assert the
/// assembled pieces without a database or a network.
///
/// The `dispatcher` must be the same instance the invocation pipeline uses:
/// polling inherits its TLS, proxy, outbound target policy, timeouts and
/// response-size limits, so a separate client would silently change the egress
/// security posture.
pub fn build_async_usage_worker<C>(
    store: Arc<dyn AsyncUsageTaskStore>,
    catalog: Arc<C>,
    dispatcher: Arc<dyn InvocationDispatcher>,
    billing_store: Arc<dyn GatewayBillingStore + Send + Sync>,
    usage_recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    secret_resolver: Option<Arc<dyn ProviderSecretResolver + Send + Sync>>,
    config: AsyncUsageWorkerConfig,
) -> AsyncUsageTaskWorker
where
    C: PricingCatalog
        + PricingDefaultRegionProvider
        + UpstreamAccountRouteCatalog
        + Send
        + Sync
        + 'static,
{
    let transport = Arc::new(PipelineAsyncPollTransport::new(dispatcher));
    let mut executor = ProviderAsyncUsageExecutor::new(Arc::clone(&catalog), transport);
    if let Some(resolver) = secret_resolver {
        executor = executor.with_secret_resolver(resolver);
    }
    let mut settler = ReplayAsyncUsageSettler::new(Arc::clone(&catalog), billing_store);
    if let Some(recorder) = usage_recorder {
        settler = settler.with_recorder(recorder);
    }
    AsyncUsageTaskWorker::new(
        store,
        Arc::new(executor),
        Duration::seconds(config.lease_seconds),
        Duration::seconds(config.retry_delay_seconds),
        config.max_attempts,
    )
    .with_settler(Arc::new(settler))
}
