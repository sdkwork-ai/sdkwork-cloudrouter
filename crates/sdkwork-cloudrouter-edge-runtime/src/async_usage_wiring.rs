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

/// Runs the reconciliation worker until process shutdown.
///
/// The loop mirrors the usage settlement worker: one bounded claim/poll pass per
/// interval, a shutdown signal observed before and during the sleep, and errors
/// logged rather than fatal (a failed pass is retried next tick; the worker's
/// per-task lease and attempt counters bound the retries).
pub fn spawn_async_usage_worker(
    worker: AsyncUsageTaskWorker,
    interval_millis: u64,
    batch_size: i64,
) -> tokio::task::JoinHandle<()> {
    let interval = std::time::Duration::from_millis(
        interval_millis.max(AsyncUsageWorkerConfig::MIN_INTERVAL_MILLIS),
    );
    let batch_size = batch_size.clamp(1, AsyncUsageWorkerConfig::MAX_BATCH_SIZE);
    let mut shutdown_rx = sdkwork_cloudrouter_http::subscribe_shutdown_signal();
    tokio::spawn(async move {
        loop {
            if shutdown_rx.try_recv().is_ok() {
                break;
            }
            match worker.run_once(chrono::Utc::now(), batch_size).await {
                Ok(0) => {}
                Ok(processed) => {
                    tracing::debug!(
                        processed,
                        "async usage reconciliation pass claimed tasks"
                    );
                }
                Err(error) => {
                    tracing::warn!(
                        error = %error,
                        "async usage reconciliation pass failed; retrying next interval"
                    );
                }
            }
            tokio::select! {
                _ = shutdown_rx.recv() => break,
                _ = tokio::time::sleep(interval) => {}
            }
        }
        tracing::info!("async usage reconciliation worker stopped");
    })
}

