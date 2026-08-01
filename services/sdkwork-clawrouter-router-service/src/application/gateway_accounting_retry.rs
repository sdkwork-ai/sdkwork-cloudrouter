use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use prometheus::{IntCounterVec, IntGauge};
use sdkwork_claw_security::redact_error_message;

use crate::domain::{DomainError, DomainResult};
use crate::ports::{
    now_epoch_millis, GatewayAccountingRecordContext, GatewayAccountingRetryDelivery,
    GatewayAccountingRetryEnvelope, GatewayAccountingRetryPayload, GatewayAccountingRetryQueue,
    GatewayRequestTraceCommand, GatewayTraceAttribution, GatewayUsageRecordCommand,
    GatewayUsageRecordFuture, GatewayUsageRecorder,
};

const MIN_ACCOUNTING_TIMEOUT: Duration = Duration::from_millis(10);
const MAX_ACCOUNTING_TIMEOUT: Duration = Duration::from_secs(30);

/// Time budgets for the synchronous accounting leg that runs after a provider
/// response.  The budgets are deliberately independent: a slow primary store
/// gets one bounded attempt, and a fallback queue gets its own shorter budget.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GatewayAccountingRetryRecorderConfig {
    pub primary_timeout: Duration,
    pub enqueue_timeout: Duration,
}

impl Default for GatewayAccountingRetryRecorderConfig {
    fn default() -> Self {
        Self {
            primary_timeout: Duration::from_millis(500),
            enqueue_timeout: Duration::from_millis(250),
        }
    }
}

impl GatewayAccountingRetryRecorderConfig {
    pub fn normalized(self) -> Self {
        Self {
            primary_timeout: self
                .primary_timeout
                .max(MIN_ACCOUNTING_TIMEOUT)
                .min(MAX_ACCOUNTING_TIMEOUT),
            enqueue_timeout: self
                .enqueue_timeout
                .max(MIN_ACCOUNTING_TIMEOUT)
                .min(MAX_ACCOUNTING_TIMEOUT),
        }
    }
}

#[derive(Clone, Default)]
pub struct GatewayAccountingRetryHealth {
    queue_unavailable: Arc<AtomicBool>,
    unreconciled_failure: Arc<AtomicBool>,
    dual_failure_count: Arc<AtomicU64>,
}

impl GatewayAccountingRetryHealth {
    pub fn is_degraded(&self) -> bool {
        self.queue_unavailable.load(Ordering::Relaxed)
            || self.unreconciled_failure.load(Ordering::Relaxed)
    }

    pub fn dual_failure_count(&self) -> u64 {
        self.dual_failure_count.load(Ordering::Relaxed)
    }

    pub fn readiness_check(&self) -> sdkwork_claw_http::ReadinessCheckFn {
        let health = self.clone();
        Arc::new(move || {
            let ready = !health.is_degraded();
            Box::pin(async move { ready })
        })
    }

    fn mark_queue_available(&self) {
        self.queue_unavailable.store(false, Ordering::Relaxed);
        self.refresh_gauge();
    }

    fn mark_queue_unavailable(&self) {
        self.queue_unavailable.store(true, Ordering::Relaxed);
        self.refresh_gauge();
    }

    fn mark_dual_failure(&self) {
        self.unreconciled_failure.store(true, Ordering::Relaxed);
        self.dual_failure_count.fetch_add(1, Ordering::Relaxed);
        self.refresh_gauge();
    }

    fn mark_unreconciled_failure(&self) {
        self.unreconciled_failure.store(true, Ordering::Relaxed);
        self.refresh_gauge();
    }

    fn refresh_gauge(&self) {
        accounting_retry_degraded_gauge().set(i64::from(self.is_degraded()));
    }
}

#[derive(Clone)]
pub struct RetryingGatewayUsageRecorder {
    primary: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    retry_queue: Arc<dyn GatewayAccountingRetryQueue + Send + Sync>,
    health: GatewayAccountingRetryHealth,
    attribution: GatewayTraceAttribution,
    config: GatewayAccountingRetryRecorderConfig,
}

impl RetryingGatewayUsageRecorder {
    pub fn new(
        primary: Arc<dyn GatewayUsageRecorder + Send + Sync>,
        retry_queue: Arc<dyn GatewayAccountingRetryQueue + Send + Sync>,
        health: GatewayAccountingRetryHealth,
    ) -> Self {
        Self::new_with_attribution(
            primary,
            retry_queue,
            health,
            GatewayTraceAttribution::default(),
        )
    }

    pub fn new_with_attribution(
        primary: Arc<dyn GatewayUsageRecorder + Send + Sync>,
        retry_queue: Arc<dyn GatewayAccountingRetryQueue + Send + Sync>,
        health: GatewayAccountingRetryHealth,
        attribution: GatewayTraceAttribution,
    ) -> Self {
        Self::new_with_attribution_and_config(
            primary,
            retry_queue,
            health,
            attribution,
            GatewayAccountingRetryRecorderConfig::default(),
        )
    }

    pub fn new_with_attribution_and_config(
        primary: Arc<dyn GatewayUsageRecorder + Send + Sync>,
        retry_queue: Arc<dyn GatewayAccountingRetryQueue + Send + Sync>,
        health: GatewayAccountingRetryHealth,
        attribution: GatewayTraceAttribution,
        config: GatewayAccountingRetryRecorderConfig,
    ) -> Self {
        Self {
            primary,
            retry_queue,
            health,
            attribution,
            config: config.normalized(),
        }
    }

    pub fn health(&self) -> &GatewayAccountingRetryHealth {
        &self.health
    }

    pub fn config(&self) -> GatewayAccountingRetryRecorderConfig {
        self.config
    }

    async fn enqueue_after_primary_failure(
        &self,
        envelope: DomainResult<GatewayAccountingRetryEnvelope>,
        record_type: &'static str,
        primary_error: DomainError,
    ) -> DomainResult<()> {
        let envelope = match envelope {
            Ok(envelope) => envelope,
            Err(envelope_error) => {
                self.health.mark_dual_failure();
                accounting_retry_outcome_counter()
                    .with_label_values(&[record_type, "envelope_rejected"])
                    .inc();
                tracing::error!(
                    record_type,
                    primary_error = %redact_error_message(&primary_error),
                    envelope_error = %redact_error_message(&envelope_error),
                    readiness_degraded = true,
                    "gateway accounting primary write failed and retry envelope was rejected"
                );
                return Ok(());
            }
        };
        let event_id = envelope.event_id.clone();
        match tokio::time::timeout(
            self.config.enqueue_timeout,
            self.retry_queue.enqueue(envelope),
        )
        .await
        {
            Ok(Ok(())) => {
                self.health.mark_queue_available();
                accounting_retry_outcome_counter()
                    .with_label_values(&[record_type, "queued"])
                    .inc();
                tracing::warn!(
                    record_type,
                    event_id,
                    primary_error = %redact_error_message(&primary_error),
                    "gateway accounting primary write failed; durable retry accepted"
                );
                Ok(())
            }
            Ok(Err(queue_error)) => {
                self.health.mark_dual_failure();
                accounting_retry_outcome_counter()
                    .with_label_values(&[record_type, "queue_failed"])
                    .inc();
                tracing::error!(
                    record_type,
                    event_id,
                    primary_error = %redact_error_message(&primary_error),
                    queue_error = %redact_error_message(&queue_error),
                    readiness_degraded = true,
                    "critical gateway accounting database and retry queue failure"
                );
                Ok(())
            }
            Err(_) => {
                self.health.mark_dual_failure();
                accounting_retry_outcome_counter()
                    .with_label_values(&[record_type, "queue_timeout"])
                    .inc();
                tracing::error!(
                    record_type,
                    event_id,
                    primary_error = %redact_error_message(&primary_error),
                    enqueue_timeout_millis = u64::try_from(
                        self.config.enqueue_timeout.as_millis()
                    )
                    .unwrap_or(u64::MAX),
                    readiness_degraded = true,
                    "gateway accounting retry queue timed out after primary write failure"
                );
                Ok(())
            }
        }
    }

    async fn record_trace_with_context(
        &self,
        command: GatewayRequestTraceCommand,
        context: GatewayAccountingRecordContext,
    ) -> DomainResult<()> {
        let retry_command = command.clone();
        match tokio::time::timeout(
            self.config.primary_timeout,
            self.primary
                .record_gateway_trace_with_context(command, context.clone()),
        )
        .await
        {
            Ok(Ok(())) => Ok(()),
            Ok(Err(error)) => {
                self.enqueue_after_primary_failure(
                    GatewayAccountingRetryEnvelope::from_trace_with_context(retry_command, context),
                    "trace",
                    error,
                )
                .await
            }
            Err(_) => {
                accounting_retry_outcome_counter()
                    .with_label_values(&["trace", "primary_timeout"])
                    .inc();
                self.enqueue_after_primary_failure(
                    GatewayAccountingRetryEnvelope::from_trace_with_context(retry_command, context),
                    "trace",
                    accounting_timeout_error("trace", self.config.primary_timeout),
                )
                .await
            }
        }
    }

    async fn record_usage_with_context(
        &self,
        command: GatewayUsageRecordCommand,
        context: GatewayAccountingRecordContext,
    ) -> DomainResult<()> {
        let retry_command = command.clone();
        match tokio::time::timeout(
            self.config.primary_timeout,
            self.primary
                .record_gateway_usage_with_context(command, context.clone()),
        )
        .await
        {
            Ok(Ok(())) => Ok(()),
            Ok(Err(error)) => {
                self.enqueue_after_primary_failure(
                    GatewayAccountingRetryEnvelope::from_usage_with_context(retry_command, context),
                    "usage",
                    error,
                )
                .await
            }
            Err(_) => {
                accounting_retry_outcome_counter()
                    .with_label_values(&["usage", "primary_timeout"])
                    .inc();
                self.enqueue_after_primary_failure(
                    GatewayAccountingRetryEnvelope::from_usage_with_context(retry_command, context),
                    "usage",
                    accounting_timeout_error("usage", self.config.primary_timeout),
                )
                .await
            }
        }
    }
}

fn accounting_timeout_error(record_type: &'static str, timeout: Duration) -> DomainError {
    DomainError::new(format!(
        "gateway accounting {record_type} primary write timed out after {} ms",
        timeout.as_millis()
    ))
}

impl GatewayUsageRecorder for RetryingGatewayUsageRecorder {
    fn record_gateway_trace<'a>(
        &'a self,
        command: GatewayRequestTraceCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            let context = GatewayAccountingRecordContext::from_trace(
                &command,
                self.attribution.clone(),
                current_epoch_millis_i64(),
            );
            match context {
                Ok(context) => self.record_trace_with_context(command, context).await,
                Err(error) => {
                    self.health.mark_dual_failure();
                    tracing::error!(
                        error = %redact_error_message(&error),
                        readiness_degraded = true,
                        "gateway trace persistence context could not be captured"
                    );
                    Ok(())
                }
            }
        })
    }

    fn record_gateway_usage<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            let context = GatewayAccountingRecordContext::from_usage(
                &command,
                self.attribution.clone(),
                current_epoch_millis_i64(),
            );
            match context {
                Ok(context) => self.record_usage_with_context(command, context).await,
                Err(error) => {
                    self.health.mark_dual_failure();
                    tracing::error!(
                        error = %redact_error_message(&error),
                        readiness_degraded = true,
                        "gateway usage persistence context could not be captured"
                    );
                    Ok(())
                }
            }
        })
    }

    fn record_gateway_usage_batch<'a>(
        &'a self,
        commands: Vec<GatewayUsageRecordCommand>,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            match tokio::time::timeout(
                self.config.primary_timeout,
                self.primary.record_gateway_usage_batch(commands),
            )
            .await
            {
                Ok(Ok(())) => Ok(()),
                Ok(Err(error)) => {
                    self.health.mark_dual_failure();
                    Err(DomainError::new(format!(
                        "atomic gateway usage batch persistence failed: {}",
                        redact_error_message(&error)
                    )))
                }
                Err(_) => {
                    self.health.mark_dual_failure();
                    Err(accounting_timeout_error(
                        "usage batch",
                        self.config.primary_timeout,
                    ))
                }
            }
        })
    }

    fn record_gateway_trace_with_context<'a>(
        &'a self,
        command: GatewayRequestTraceCommand,
        context: GatewayAccountingRecordContext,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move { self.record_trace_with_context(command, context).await })
    }

    fn record_gateway_usage_with_context<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
        context: GatewayAccountingRecordContext,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move { self.record_usage_with_context(command, context).await })
    }
}

#[derive(Debug, Clone, Copy)]
pub struct GatewayAccountingRetryWorkerConfig {
    pub batch_size: usize,
    pub poll_interval: Duration,
    pub reclaim_idle: Duration,
    pub queue_wait_timeout: Duration,
    pub max_attempts: u32,
    pub base_backoff: Duration,
    pub max_backoff: Duration,
}

impl Default for GatewayAccountingRetryWorkerConfig {
    fn default() -> Self {
        Self {
            batch_size: 32,
            poll_interval: Duration::from_millis(500),
            reclaim_idle: Duration::from_secs(30),
            queue_wait_timeout: Duration::from_millis(250),
            max_attempts: 8,
            base_backoff: Duration::from_millis(250),
            max_backoff: Duration::from_secs(30),
        }
    }
}

impl GatewayAccountingRetryWorkerConfig {
    pub fn normalized(self) -> Self {
        Self {
            batch_size: self.batch_size.clamp(1, 200),
            poll_interval: self.poll_interval.max(Duration::from_millis(10)),
            reclaim_idle: self.reclaim_idle.max(Duration::from_millis(100)),
            queue_wait_timeout: self.queue_wait_timeout.max(Duration::from_millis(10)),
            max_attempts: self.max_attempts.clamp(1, 64),
            base_backoff: self.base_backoff.max(Duration::from_millis(10)),
            max_backoff: self.max_backoff.max(self.base_backoff),
        }
    }
}

pub struct GatewayAccountingRetryWorker {
    recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
    retry_queue: Arc<dyn GatewayAccountingRetryQueue + Send + Sync>,
    health: GatewayAccountingRetryHealth,
    consumer_id: String,
    config: GatewayAccountingRetryWorkerConfig,
}

impl GatewayAccountingRetryWorker {
    pub fn new(
        recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>,
        retry_queue: Arc<dyn GatewayAccountingRetryQueue + Send + Sync>,
        health: GatewayAccountingRetryHealth,
        consumer_id: impl Into<String>,
        config: GatewayAccountingRetryWorkerConfig,
    ) -> Self {
        Self {
            recorder,
            retry_queue,
            health,
            consumer_id: consumer_id.into(),
            config: config.normalized(),
        }
    }

    pub fn config(&self) -> GatewayAccountingRetryWorkerConfig {
        self.config
    }

    pub async fn run_once(&self) -> DomainResult<usize> {
        let deliveries = match self
            .retry_queue
            .claim(
                &self.consumer_id,
                self.config.batch_size,
                self.config.reclaim_idle,
                self.config.queue_wait_timeout,
            )
            .await
        {
            Ok(deliveries) => {
                self.health.mark_queue_available();
                deliveries
            }
            Err(error) => {
                self.health.mark_queue_unavailable();
                accounting_retry_outcome_counter()
                    .with_label_values(&["queue", "claim_failed"])
                    .inc();
                return Err(error);
            }
        };

        match self.retry_queue.dead_letter_depth().await {
            Ok(depth) => {
                accounting_retry_dlq_depth_gauge().set(i64::try_from(depth).unwrap_or(i64::MAX));
                if depth > 0 {
                    self.health.mark_unreconciled_failure();
                }
            }
            Err(error) => {
                self.health.mark_queue_unavailable();
                accounting_retry_outcome_counter()
                    .with_label_values(&["queue", "dlq_depth_failed"])
                    .inc();
                tracing::warn!(
                    error = %redact_error_message(&error),
                    "gateway accounting retry dead-letter depth check failed"
                );
            }
        }

        let mut processed = 0;
        let mut first_delivery_error = None;
        for delivery in deliveries {
            match self.process_delivery(delivery).await {
                Ok(()) => processed += 1,
                Err(error) => {
                    self.health.mark_queue_unavailable();
                    accounting_retry_outcome_counter()
                        .with_label_values(&["queue", "delivery_update_failed"])
                        .inc();
                    tracing::warn!(
                        error = %redact_error_message(&error),
                        "gateway accounting retry delivery state update failed"
                    );
                    if first_delivery_error.is_none() {
                        first_delivery_error = Some(error);
                    }
                }
            }
        }
        match first_delivery_error {
            Some(error) => {
                // A later successful delivery may have marked the queue available;
                // preserve the batch's failed mutation as the final health state.
                self.health.mark_queue_unavailable();
                Err(error)
            }
            None => Ok(processed),
        }
    }

    async fn process_delivery(&self, delivery: GatewayAccountingRetryDelivery) -> DomainResult<()> {
        if let Err(error) = delivery.envelope.validate() {
            self.retry_queue
                .dead_letter(
                    &delivery.delivery_id,
                    delivery.envelope,
                    "invalid_retry_envelope",
                )
                .await?;
            self.health.mark_unreconciled_failure();
            accounting_retry_outcome_counter()
                .with_label_values(&["unknown", "dead_lettered_invalid"])
                .inc();
            tracing::error!(
                error = %redact_error_message(&error),
                "invalid gateway accounting retry envelope moved to dead-letter queue"
            );
            return Ok(());
        }
        let now = now_epoch_millis();
        if !delivery.envelope.is_due(now) {
            self.retry_queue
                .reschedule(&delivery.delivery_id, delivery.envelope)
                .await?;
            return Ok(());
        }

        let record_type = delivery.envelope.payload.record_type();
        match replay(&*self.recorder, &delivery.envelope).await {
            Ok(()) => {
                self.retry_queue.acknowledge(&delivery.delivery_id).await?;
                self.health.mark_queue_available();
                accounting_retry_outcome_counter()
                    .with_label_values(&[record_type, "replayed"])
                    .inc();
                Ok(())
            }
            Err(error) => {
                let next_attempt = delivery.envelope.attempt.saturating_add(1);
                if next_attempt >= self.config.max_attempts {
                    self.retry_queue
                        .dead_letter(
                            &delivery.delivery_id,
                            delivery.envelope,
                            "recorder_retry_exhausted",
                        )
                        .await?;
                    self.health.mark_unreconciled_failure();
                    accounting_retry_outcome_counter()
                        .with_label_values(&[record_type, "dead_lettered"])
                        .inc();
                    tracing::error!(
                        record_type,
                        error = %redact_error_message(&error),
                        "gateway accounting retry exhausted and moved to the dead-letter queue"
                    );
                    return Ok(());
                }

                let delay = retry_backoff(
                    self.config.base_backoff,
                    self.config.max_backoff,
                    next_attempt,
                );
                let next = delivery.envelope.next_attempt(now_epoch_millis(), delay)?;
                self.retry_queue
                    .reschedule(&delivery.delivery_id, next)
                    .await?;
                accounting_retry_outcome_counter()
                    .with_label_values(&[record_type, "rescheduled"])
                    .inc();
                tracing::warn!(
                    record_type,
                    attempt = next_attempt,
                    retry_delay_millis = u64::try_from(delay.as_millis()).unwrap_or(u64::MAX),
                    error = %redact_error_message(&error),
                    "gateway accounting retry replay failed and was rescheduled"
                );
                Ok(())
            }
        }
    }
}

async fn replay(
    recorder: &(dyn GatewayUsageRecorder + Send + Sync),
    envelope: &GatewayAccountingRetryEnvelope,
) -> DomainResult<()> {
    match &envelope.payload {
        GatewayAccountingRetryPayload::Trace(command) => {
            recorder
                .record_gateway_trace_with_context(
                    command.as_ref().clone(),
                    envelope.context.clone(),
                )
                .await
        }
        GatewayAccountingRetryPayload::Usage(command) => {
            recorder
                .record_gateway_usage_with_context(
                    command.as_ref().clone(),
                    envelope.context.clone(),
                )
                .await
        }
    }
}

fn current_epoch_millis_i64() -> i64 {
    i64::try_from(now_epoch_millis()).unwrap_or(i64::MAX)
}

fn retry_backoff(base: Duration, maximum: Duration, attempt: u32) -> Duration {
    let multiplier = 1_u32.checked_shl(attempt.min(16)).unwrap_or(u32::MAX);
    base.checked_mul(multiplier).unwrap_or(maximum).min(maximum)
}

fn accounting_retry_outcome_counter() -> IntCounterVec {
    static METRIC: OnceLock<IntCounterVec> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = IntCounterVec::new(
                prometheus::Opts::new(
                    "gateway_accounting_retry_outcomes_total",
                    "Durable gateway accounting retry outcomes.",
                )
                .namespace("clawrouter"),
                &["record_type", "outcome"],
            )
            .expect("gateway accounting retry outcome metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

fn accounting_retry_degraded_gauge() -> IntGauge {
    static METRIC: OnceLock<IntGauge> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = IntGauge::new(
                "clawrouter_gateway_accounting_retry_readiness_degraded",
                "1 when both primary accounting persistence and durable retry are unavailable.",
            )
            .expect("gateway accounting retry degraded metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

fn accounting_retry_dlq_depth_gauge() -> IntGauge {
    static METRIC: OnceLock<IntGauge> = OnceLock::new();
    METRIC
        .get_or_init(|| {
            let metric = IntGauge::new(
                "clawrouter_gateway_accounting_retry_dead_letter_depth",
                "Number of gateway accounting records awaiting dead-letter reconciliation.",
            )
            .expect("gateway accounting retry dead-letter depth metric");
            let _ = prometheus::register(Box::new(metric.clone()));
            metric
        })
        .clone()
}

#[cfg(test)]
mod tests {
    use std::collections::VecDeque;
    use std::sync::Mutex;

    use super::*;
    use crate::infrastructure::InMemoryGatewayAccountingRetryQueue;
    use crate::ports::{GatewayAccountingRetryQueueFuture, GatewayUsageRecordCommand};

    #[derive(Clone, Default)]
    struct TestRecorder {
        fail: bool,
        trace_calls: Arc<Mutex<Vec<(GatewayRequestTraceCommand, GatewayAccountingRecordContext)>>>,
        usage_calls: Arc<Mutex<Vec<(GatewayUsageRecordCommand, GatewayAccountingRecordContext)>>>,
    }

    impl TestRecorder {
        fn failing() -> Self {
            Self {
                fail: true,
                ..Self::default()
            }
        }

        fn outcome(&self) -> DomainResult<()> {
            if self.fail {
                Err(DomainError::new("scripted accounting recorder failure"))
            } else {
                Ok(())
            }
        }

        fn trace_calls(&self) -> Vec<(GatewayRequestTraceCommand, GatewayAccountingRecordContext)> {
            self.trace_calls.lock().expect("trace call lock").clone()
        }

        fn usage_calls(&self) -> Vec<(GatewayUsageRecordCommand, GatewayAccountingRecordContext)> {
            self.usage_calls.lock().expect("usage call lock").clone()
        }
    }

    impl GatewayUsageRecorder for TestRecorder {
        fn record_gateway_trace<'a>(
            &'a self,
            _command: GatewayRequestTraceCommand,
        ) -> GatewayUsageRecordFuture<'a> {
            Box::pin(async move { self.outcome() })
        }

        fn record_gateway_usage<'a>(
            &'a self,
            _command: GatewayUsageRecordCommand,
        ) -> GatewayUsageRecordFuture<'a> {
            Box::pin(async move { self.outcome() })
        }

        fn record_gateway_trace_with_context<'a>(
            &'a self,
            command: GatewayRequestTraceCommand,
            context: GatewayAccountingRecordContext,
        ) -> GatewayUsageRecordFuture<'a> {
            Box::pin(async move {
                self.trace_calls
                    .lock()
                    .expect("trace call lock")
                    .push((command, context));
                self.outcome()
            })
        }

        fn record_gateway_usage_with_context<'a>(
            &'a self,
            command: GatewayUsageRecordCommand,
            context: GatewayAccountingRecordContext,
        ) -> GatewayUsageRecordFuture<'a> {
            Box::pin(async move {
                self.usage_calls
                    .lock()
                    .expect("usage call lock")
                    .push((command, context));
                self.outcome()
            })
        }
    }

    #[derive(Clone, Default)]
    struct TestRetryQueueState {
        claims: VecDeque<GatewayAccountingRetryDelivery>,
        enqueued: Vec<GatewayAccountingRetryEnvelope>,
        acknowledged: Vec<String>,
        rescheduled: Vec<(String, GatewayAccountingRetryEnvelope)>,
        dead_lettered: Vec<(String, GatewayAccountingRetryEnvelope, String)>,
    }

    #[derive(Clone, Default)]
    struct TestRetryQueue {
        enqueue_fails: bool,
        acknowledge_fails_for: Option<String>,
        dead_letter_depth: u64,
        state: Arc<Mutex<TestRetryQueueState>>,
    }

    impl TestRetryQueue {
        fn failing_enqueue() -> Self {
            Self {
                enqueue_fails: true,
                ..Self::default()
            }
        }

        fn with_delivery(delivery: GatewayAccountingRetryDelivery) -> Self {
            let queue = Self::default();
            queue
                .state
                .lock()
                .expect("retry queue state lock")
                .claims
                .push_back(delivery);
            queue
        }

        fn with_dead_letter_depth(dead_letter_depth: u64) -> Self {
            Self {
                dead_letter_depth,
                ..Self::default()
            }
        }

        fn snapshot(&self) -> TestRetryQueueState {
            self.state.lock().expect("retry queue state lock").clone()
        }
    }

    impl GatewayAccountingRetryQueue for TestRetryQueue {
        fn enqueue<'a>(
            &'a self,
            envelope: GatewayAccountingRetryEnvelope,
        ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
            Box::pin(async move {
                if self.enqueue_fails {
                    return Err(DomainError::new("scripted retry queue failure"));
                }
                self.state
                    .lock()
                    .expect("retry queue state lock")
                    .enqueued
                    .push(envelope);
                Ok(())
            })
        }

        fn claim<'a>(
            &'a self,
            _consumer_id: &'a str,
            batch_size: usize,
            _reclaim_idle: Duration,
            _wait_timeout: Duration,
        ) -> GatewayAccountingRetryQueueFuture<'a, Vec<GatewayAccountingRetryDelivery>> {
            Box::pin(async move {
                let mut state = self.state.lock().expect("retry queue state lock");
                let mut deliveries = Vec::with_capacity(batch_size.min(state.claims.len()));
                for _ in 0..batch_size {
                    let Some(delivery) = state.claims.pop_front() else {
                        break;
                    };
                    deliveries.push(delivery);
                }
                Ok(deliveries)
            })
        }

        fn acknowledge<'a>(
            &'a self,
            delivery_id: &'a str,
        ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
            Box::pin(async move {
                if self.acknowledge_fails_for.as_deref() == Some(delivery_id) {
                    return Err(DomainError::new("scripted retry queue ACK failure"));
                }
                self.state
                    .lock()
                    .expect("retry queue state lock")
                    .acknowledged
                    .push(delivery_id.to_owned());
                Ok(())
            })
        }

        fn reschedule<'a>(
            &'a self,
            delivery_id: &'a str,
            envelope: GatewayAccountingRetryEnvelope,
        ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
            Box::pin(async move {
                self.state
                    .lock()
                    .expect("retry queue state lock")
                    .rescheduled
                    .push((delivery_id.to_owned(), envelope));
                Ok(())
            })
        }

        fn dead_letter<'a>(
            &'a self,
            delivery_id: &'a str,
            envelope: GatewayAccountingRetryEnvelope,
            failure_code: &'a str,
        ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
            Box::pin(async move {
                self.state
                    .lock()
                    .expect("retry queue state lock")
                    .dead_lettered
                    .push((delivery_id.to_owned(), envelope, failure_code.to_owned()));
                Ok(())
            })
        }

        fn dead_letter_depth<'a>(&'a self) -> GatewayAccountingRetryQueueFuture<'a, u64> {
            Box::pin(async move { Ok(self.dead_letter_depth) })
        }
    }

    fn trace_command(request_id: &str) -> GatewayRequestTraceCommand {
        GatewayRequestTraceCommand {
            request_id: request_id.to_owned(),
            trace_id: Some(format!("trace-{request_id}")),
            tenant_id: 100_001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 101,
            api_key_name_snapshot: "Accounting Retry Test Key".to_owned(),
            account_group_id: 10,
            upstream_account_group_snapshot: "standard".to_owned(),
            catalog_key: "openai/gpt-4o-mini".to_owned(),
            requested_model: "gpt-4o-mini".to_owned(),
            requested_model_catalog_key: "openai/gpt-4o-mini".to_owned(),
            supplier_code: "openrouter".to_owned(),
            account_id: 3_001,
            provider_model: "gpt-4o-mini-upstream".to_owned(),
            provider_native_model: "gpt-4o-mini-upstream".to_owned(),
            region_code: "global".to_owned(),
            request_path: "/v1/chat/completions".to_owned(),
            http_method: "POST".to_owned(),
            user_agent: Some("sdkwork-accounting-retry-test".to_owned()),
            http_status: Some(200),
            streaming: false,
            prompt_tokens: 3,
            completion_tokens: 2,
            cached_tokens: 0,
            total_tokens: 5,
            latency_ms: Some(42),
            ttft_ms: Some(10),
            provider_error_code: None,
            error_type: None,
            error_message_masked: None,
        }
    }

    fn usage_command(request_id: &str) -> GatewayUsageRecordCommand {
        GatewayUsageRecordCommand {
            request_id: request_id.to_owned(),
            trace_id: Some(format!("trace-{request_id}")),
            tenant_id: 100_001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 101,
            api_key_name_snapshot: "Accounting Retry Test Key".to_owned(),
            account_group_id: 10,
            upstream_account_group_snapshot: "standard".to_owned(),
            catalog_key: "openai/gpt-4o-mini".to_owned(),
            requested_model: "gpt-4o-mini".to_owned(),
            requested_model_catalog_key: "openai/gpt-4o-mini".to_owned(),
            supplier_code: "openrouter".to_owned(),
            account_id: 3_001,
            provider_model: "gpt-4o-mini-upstream".to_owned(),
            provider_native_model: "gpt-4o-mini-upstream".to_owned(),
            region_code: "global".to_owned(),
            request_path: "/v1/chat/completions".to_owned(),
            http_method: "POST".to_owned(),
            user_agent: Some("sdkwork-accounting-retry-test".to_owned()),
            http_status: 200,
            streaming: false,
            modality: 1,
            usage_type: 1,
            billing_meter_code: "llm_input_token".to_owned(),
            billable_quantity: "3".to_owned(),
            prompt_tokens: 3,
            completion_tokens: 0,
            cached_tokens: 0,
            total_tokens: 3,
            request_count: 1,
            result_count: 0,
            item_count: 0,
            character_count: 0,
            image_count: 0,
            audio_seconds: None,
            video_seconds: None,
            latency_ms: Some(42),
            ttft_ms: None,
            provider_error_code: None,
            error_type: None,
            error_message_masked: None,
            base_input_unit_price: "0.150000".to_owned(),
            base_output_unit_price: "0.000000".to_owned(),
            cache_read_unit_price: "0.000000".to_owned(),
            rate_multiplier: "1.000000".to_owned(),
            reference_multiplier: "1.000000".to_owned(),
            official_reference_amount: "0.000000450000".to_owned(),
            customer_charge_amount: "0.000000450000".to_owned(),
            upstream_cost_amount: "0.000000330000".to_owned(),
            currency: "USD".to_owned(),
            pricing_plan_code: "standard".to_owned(),
            pricing_snapshot: "{}".to_owned(),
        }
    }

    fn attribution() -> GatewayTraceAttribution {
        GatewayTraceAttribution {
            gateway_instance_id: Some(7_001),
            gateway_instance_code_snapshot: Some("gateway-east-1".to_owned()),
            gateway_region_code_snapshot: Some("cn-east".to_owned()),
            gateway_node_name_snapshot: Some("node-a".to_owned()),
        }
    }

    fn trace_context(command: &GatewayRequestTraceCommand) -> GatewayAccountingRecordContext {
        GatewayAccountingRecordContext::from_trace(command, attribution(), 1_700_000_000_042)
            .expect("valid trace context")
    }

    fn usage_context(command: &GatewayUsageRecordCommand) -> GatewayAccountingRecordContext {
        GatewayAccountingRecordContext::from_usage(command, attribution(), 1_700_000_000_042)
            .expect("valid usage context")
    }

    #[test]
    fn retry_backoff_is_exponential_and_bounded() {
        let base = Duration::from_millis(100);
        let maximum = Duration::from_secs(1);
        assert_eq!(Duration::from_millis(200), retry_backoff(base, maximum, 1));
        assert_eq!(Duration::from_millis(800), retry_backoff(base, maximum, 3));
        assert_eq!(maximum, retry_backoff(base, maximum, 20));
    }

    #[tokio::test]
    async fn primary_failure_with_durable_queue_is_fail_open() {
        let primary = Arc::new(TestRecorder::failing());
        let queue = Arc::new(TestRetryQueue::default());
        let health = GatewayAccountingRetryHealth::default();
        let recorder =
            RetryingGatewayUsageRecorder::new(primary.clone(), queue.clone(), health.clone());
        let command = usage_command("req-queue-accepted");
        let context = usage_context(&command);

        recorder
            .record_gateway_usage_with_context(command.clone(), context.clone())
            .await
            .expect("provider success must not be replaced by an accounting error");

        assert!(!health.is_degraded());
        assert_eq!(0, health.dual_failure_count());
        assert!((health.readiness_check())().await);
        assert_eq!(
            vec![(command.clone(), context.clone())],
            primary.usage_calls()
        );

        let state = queue.snapshot();
        assert_eq!(1, state.enqueued.len());
        let envelope = &state.enqueued[0];
        envelope.validate().expect("queued envelope must be valid");
        assert_eq!(context, envelope.context);
        assert!(envelope.event_id.starts_with("acct:v1:"));
        assert_eq!(72, envelope.event_id.len());
        match &envelope.payload {
            GatewayAccountingRetryPayload::Usage(queued) => {
                assert_eq!(command.request_id, queued.request_id);
                assert_eq!(command.api_key_name_snapshot, queued.api_key_name_snapshot);
                assert!(queued.user_agent.is_none());
            }
            GatewayAccountingRetryPayload::Trace(_) => panic!("expected usage retry payload"),
        }
    }

    #[tokio::test]
    async fn primary_and_queue_failure_remains_fail_open_but_degrades_readiness() {
        let primary = Arc::new(TestRecorder::failing());
        let queue = Arc::new(TestRetryQueue::failing_enqueue());
        let health = GatewayAccountingRetryHealth::default();
        let recorder =
            RetryingGatewayUsageRecorder::new(primary.clone(), queue.clone(), health.clone());
        let command = trace_command("req-dual-failure");
        let context = trace_context(&command);

        recorder
            .record_gateway_trace_with_context(command.clone(), context.clone())
            .await
            .expect("provider success must survive a database and retry queue outage");

        assert!(health.is_degraded());
        assert_eq!(1, health.dual_failure_count());
        assert!(!(health.readiness_check())().await);
        assert_eq!(vec![(command, context)], primary.trace_calls());
        assert!(queue.snapshot().enqueued.is_empty());
    }

    #[tokio::test]
    async fn worker_replay_preserves_original_context_and_acknowledges_delivery() {
        let command = trace_command("req-replay-context");
        let context = trace_context(&command);
        let mut envelope = GatewayAccountingRetryEnvelope::from_trace_with_context(
            command.clone(),
            context.clone(),
        )
        .expect("valid retry envelope");
        envelope.available_at_epoch_millis = 0;
        let queue = Arc::new(TestRetryQueue::with_delivery(
            GatewayAccountingRetryDelivery {
                delivery_id: "lease-replay-context".to_owned(),
                envelope,
            },
        ));
        let primary = Arc::new(TestRecorder::default());
        let health = GatewayAccountingRetryHealth::default();
        let worker = GatewayAccountingRetryWorker::new(
            primary.clone(),
            queue.clone(),
            health.clone(),
            "test-worker",
            GatewayAccountingRetryWorkerConfig::default(),
        );

        assert_eq!(1, worker.run_once().await.expect("run retry worker"));

        let calls = primary.trace_calls();
        assert_eq!(1, calls.len());
        assert_eq!(context, calls[0].1);
        assert_eq!(1_700_000_000_000, calls[0].1.started_at_epoch_millis);
        assert_eq!(1_700_000_000_042, calls[0].1.ended_at_epoch_millis);
        assert_eq!(attribution(), calls[0].1.attribution);
        assert!(calls[0].1.user_agent_hash.is_some());
        assert!(calls[0].0.user_agent.is_none());

        let state = queue.snapshot();
        assert_eq!(vec!["lease-replay-context".to_owned()], state.acknowledged);
        assert!(state.rescheduled.is_empty());
        assert!(state.dead_lettered.is_empty());
        assert!(!health.is_degraded());
    }

    #[tokio::test]
    async fn worker_continues_batch_after_delivery_mutation_failure_and_degrades_readiness() {
        let first_command = trace_command("req-batch-ack-failure");
        let first_context = trace_context(&first_command);
        let mut first_envelope = GatewayAccountingRetryEnvelope::from_trace_with_context(
            first_command.clone(),
            first_context.clone(),
        )
        .expect("valid first retry envelope");
        first_envelope.available_at_epoch_millis = 0;

        let second_command = trace_command("req-batch-continues");
        let second_context = trace_context(&second_command);
        let mut second_envelope = GatewayAccountingRetryEnvelope::from_trace_with_context(
            second_command.clone(),
            second_context.clone(),
        )
        .expect("valid second retry envelope");
        second_envelope.available_at_epoch_millis = 0;

        let queue = Arc::new(TestRetryQueue {
            acknowledge_fails_for: Some("lease-ack-failure".to_owned()),
            ..TestRetryQueue::default()
        });
        queue
            .state
            .lock()
            .expect("retry queue state lock")
            .claims
            .extend([
                GatewayAccountingRetryDelivery {
                    delivery_id: "lease-ack-failure".to_owned(),
                    envelope: first_envelope,
                },
                GatewayAccountingRetryDelivery {
                    delivery_id: "lease-batch-continues".to_owned(),
                    envelope: second_envelope,
                },
            ]);
        let primary = Arc::new(TestRecorder::default());
        let health = GatewayAccountingRetryHealth::default();
        let worker = GatewayAccountingRetryWorker::new(
            primary.clone(),
            queue.clone(),
            health.clone(),
            "test-worker",
            GatewayAccountingRetryWorkerConfig::default(),
        );

        let error = worker
            .run_once()
            .await
            .expect_err("the batch must report its first delivery mutation error");

        assert!(error
            .to_string()
            .contains("scripted retry queue ACK failure"));
        let calls = primary.trace_calls();
        assert_eq!(2, calls.len());
        assert_eq!(first_command.request_id, calls[0].0.request_id);
        assert_eq!(second_command.request_id, calls[1].0.request_id);
        assert_eq!(first_context, calls[0].1);
        assert_eq!(second_context, calls[1].1);
        assert!(calls
            .iter()
            .all(|(command, _)| command.user_agent.is_none()));
        assert_eq!(
            vec!["lease-batch-continues".to_owned()],
            queue.snapshot().acknowledged
        );
        assert!(health.is_degraded());
        assert!(!(health.readiness_check())().await);
    }

    #[tokio::test]
    async fn worker_detects_existing_dead_letters_after_restart() {
        let queue = Arc::new(TestRetryQueue::with_dead_letter_depth(2));
        let health = GatewayAccountingRetryHealth::default();
        let worker = GatewayAccountingRetryWorker::new(
            Arc::new(TestRecorder::default()),
            queue,
            health.clone(),
            "test-worker",
            GatewayAccountingRetryWorkerConfig::default(),
        );

        assert_eq!(0, worker.run_once().await.expect("inspect retry queue"));
        assert!(health.is_degraded());
        assert!(!(health.readiness_check())().await);
    }

    #[tokio::test]
    async fn worker_retry_keeps_event_identity_and_exhaustion_moves_it_to_dlq() {
        let command = trace_command("req-retry-exhausted");
        let context = trace_context(&command);
        let mut envelope =
            GatewayAccountingRetryEnvelope::from_trace_with_context(command, context.clone())
                .expect("valid retry envelope");
        envelope.available_at_epoch_millis = 0;
        let original_event_id = envelope.event_id.clone();
        let original_payload = envelope.payload.clone();
        let queue = Arc::new(TestRetryQueue::with_delivery(
            GatewayAccountingRetryDelivery {
                delivery_id: "lease-attempt-0".to_owned(),
                envelope,
            },
        ));
        let primary = Arc::new(TestRecorder::failing());
        let health = GatewayAccountingRetryHealth::default();
        let worker = GatewayAccountingRetryWorker::new(
            primary.clone(),
            queue.clone(),
            health.clone(),
            "test-worker",
            GatewayAccountingRetryWorkerConfig {
                max_attempts: 2,
                base_backoff: Duration::from_millis(10),
                max_backoff: Duration::from_millis(10),
                ..GatewayAccountingRetryWorkerConfig::default()
            },
        );

        assert_eq!(1, worker.run_once().await.expect("run first retry attempt"));
        let first_state = queue.snapshot();
        assert_eq!(1, first_state.rescheduled.len());
        assert!(first_state.dead_lettered.is_empty());
        assert!(!health.is_degraded());
        let mut next = first_state.rescheduled[0].1.clone();
        assert_eq!(1, next.attempt);
        assert_eq!(original_event_id, next.event_id);
        assert_eq!(original_payload, next.payload);
        assert_eq!(context, next.context);

        next.available_at_epoch_millis = 0;
        worker
            .process_delivery(GatewayAccountingRetryDelivery {
                delivery_id: "lease-attempt-1".to_owned(),
                envelope: next,
            })
            .await
            .expect("exhausted retry must be handled by the DLQ");

        let final_state = queue.snapshot();
        assert_eq!(1, final_state.dead_lettered.len());
        assert_eq!("lease-attempt-1", final_state.dead_lettered[0].0);
        assert_eq!(original_event_id, final_state.dead_lettered[0].1.event_id);
        assert_eq!(1, final_state.dead_lettered[0].1.attempt);
        assert_eq!("recorder_retry_exhausted", final_state.dead_lettered[0].2);
        assert!(health.is_degraded());
        let calls = primary.trace_calls();
        assert_eq!(2, calls.len());
        assert!(calls.iter().all(|(_, replayed)| replayed == &context));
    }

    #[tokio::test]
    async fn event_id_deduplicates_same_payload_and_detects_payload_tampering() {
        let command = trace_command("req-event-integrity");
        let first_context = trace_context(&command);
        let mut second_context = first_context.clone();
        second_context.attribution.gateway_node_name_snapshot = Some("node-b".to_owned());
        second_context.started_at_epoch_millis += 1_000;
        second_context.ended_at_epoch_millis += 1_000;
        let first = GatewayAccountingRetryEnvelope::from_trace_with_context(
            command.clone(),
            first_context.clone(),
        )
        .expect("first retry envelope");
        let second =
            GatewayAccountingRetryEnvelope::from_trace_with_context(command, second_context)
                .expect("second retry envelope");
        assert_eq!(first.event_id, second.event_id);

        let mut tampered = first.clone();
        match &mut tampered.payload {
            GatewayAccountingRetryPayload::Trace(command) => {
                command.request_id = "req-event-tampered".to_owned();
            }
            GatewayAccountingRetryPayload::Usage(_) => panic!("expected trace retry payload"),
        }
        assert!(tampered.validate().is_err());

        let queue = InMemoryGatewayAccountingRetryQueue::default();
        queue
            .enqueue(first.clone())
            .await
            .expect("enqueue first event");
        queue
            .enqueue(second)
            .await
            .expect("enqueue duplicate event");
        let deliveries = queue
            .claim("dedup-consumer", 10, Duration::from_secs(1), Duration::ZERO)
            .await
            .expect("claim deduplicated event");
        assert_eq!(1, deliveries.len());
        assert_eq!(first.event_id, deliveries[0].envelope.event_id);
        assert_eq!(first_context, deliveries[0].envelope.context);
    }
}
