use std::future::pending;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use sdkwork_clawrouter_router_service::application::{
    GatewayAccountingRetryHealth, GatewayAccountingRetryRecorderConfig,
    RetryingGatewayUsageRecorder,
};
use sdkwork_clawrouter_router_service::domain::DomainError;
use sdkwork_clawrouter_router_service::ports::{
    GatewayAccountingRetryDelivery, GatewayAccountingRetryEnvelope, GatewayAccountingRetryQueue,
    GatewayAccountingRetryQueueFuture, GatewayRequestTraceCommand, GatewayUsageRecordCommand,
    GatewayUsageRecordFuture, GatewayUsageRecorder,
};

#[derive(Clone, Copy)]
enum RecorderMode {
    Fail,
    Hang,
}

#[derive(Clone, Copy)]
struct TestRecorder {
    mode: RecorderMode,
}

impl GatewayUsageRecorder for TestRecorder {
    fn record_gateway_trace<'a>(
        &'a self,
        _command: GatewayRequestTraceCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            match self.mode {
                RecorderMode::Fail => Err(DomainError::new("scripted primary failure")),
                RecorderMode::Hang => pending().await,
            }
        })
    }

    fn record_gateway_usage<'a>(
        &'a self,
        _command: GatewayUsageRecordCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            match self.mode {
                RecorderMode::Fail => Err(DomainError::new("scripted primary failure")),
                RecorderMode::Hang => pending().await,
            }
        })
    }
}

#[derive(Clone, Default)]
struct TestQueue {
    hang_enqueue: bool,
    enqueued: Arc<Mutex<u32>>,
}

impl TestQueue {
    fn enqueue_count(&self) -> u32 {
        *self.enqueued.lock().expect("queue count lock")
    }
}

impl GatewayAccountingRetryQueue for TestQueue {
    fn enqueue<'a>(
        &'a self,
        _envelope: GatewayAccountingRetryEnvelope,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        Box::pin(async move {
            if self.hang_enqueue {
                pending().await
            }
            *self.enqueued.lock().expect("queue count lock") += 1;
            Ok(())
        })
    }

    fn claim<'a>(
        &'a self,
        _consumer_id: &'a str,
        _batch_size: usize,
        _reclaim_idle: Duration,
        _wait_timeout: Duration,
    ) -> GatewayAccountingRetryQueueFuture<'a, Vec<GatewayAccountingRetryDelivery>> {
        Box::pin(async { Ok(Vec::new()) })
    }

    fn acknowledge<'a>(
        &'a self,
        _delivery_id: &'a str,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }

    fn reschedule<'a>(
        &'a self,
        _delivery_id: &'a str,
        _envelope: GatewayAccountingRetryEnvelope,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }

    fn dead_letter<'a>(
        &'a self,
        _delivery_id: &'a str,
        _envelope: GatewayAccountingRetryEnvelope,
        _failure_code: &'a str,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }
}

fn trace_command() -> GatewayRequestTraceCommand {
    GatewayRequestTraceCommand {
        request_id: "timeout-test-request".to_owned(),
        trace_id: Some("timeout-test-trace".to_owned()),
        tenant_id: 1,
        organization_id: 0,
        user_id: 2,
        api_key_id: 3,
        api_key_name_snapshot: "timeout-test-key".to_owned(),
        account_group_id: 4,
        upstream_account_group_snapshot: "default".to_owned(),
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        requested_model: "gpt-4o-mini".to_owned(),
        requested_model_catalog_key: "openai/gpt-4o-mini".to_owned(),
        supplier_code: "openai".to_owned(),
        account_id: 5,
        provider_model: "gpt-4o-mini".to_owned(),
        provider_native_model: "gpt-4o-mini".to_owned(),
        region_code: "global".to_owned(),
        request_path: "/v1/chat/completions".to_owned(),
        http_method: "POST".to_owned(),
        user_agent: Some("timeout-test-agent".to_owned()),
        http_status: Some(200),
        streaming: false,
        prompt_tokens: 1,
        completion_tokens: 1,
        cached_tokens: 0,
        total_tokens: 2,
        latency_ms: Some(1),
        ttft_ms: Some(1),
        provider_error_code: None,
        error_type: None,
        error_message_masked: None,
    }
}

fn recorder(
    primary: TestRecorder,
    queue: Arc<TestQueue>,
    health: GatewayAccountingRetryHealth,
) -> RetryingGatewayUsageRecorder {
    RetryingGatewayUsageRecorder::new_with_attribution_and_config(
        Arc::new(primary),
        queue,
        health,
        Default::default(),
        GatewayAccountingRetryRecorderConfig {
            primary_timeout: Duration::from_millis(20),
            enqueue_timeout: Duration::from_millis(15),
        },
    )
}

#[tokio::test(start_paused = true)]
async fn primary_timeout_is_fail_open_when_durable_queue_accepts() {
    let queue = Arc::new(TestQueue::default());
    let health = GatewayAccountingRetryHealth::default();
    let recorder = recorder(
        TestRecorder {
            mode: RecorderMode::Hang,
        },
        queue.clone(),
        health.clone(),
    );

    recorder
        .record_gateway_trace(trace_command())
        .await
        .expect("primary timeout must not replace provider success with an error");

    assert_eq!(1, queue.enqueue_count());
    assert!(!health.is_degraded());
    assert_eq!(0, health.dual_failure_count());
}

#[tokio::test(start_paused = true)]
async fn enqueue_timeout_is_fail_open_but_marks_accounting_unreconciled() {
    let queue = Arc::new(TestQueue {
        hang_enqueue: true,
        ..TestQueue::default()
    });
    let health = GatewayAccountingRetryHealth::default();
    let recorder = recorder(
        TestRecorder {
            mode: RecorderMode::Fail,
        },
        queue,
        health.clone(),
    );

    recorder
        .record_gateway_trace(trace_command())
        .await
        .expect("queue timeout must not replace provider success with an error");

    assert!(health.is_degraded());
    assert_eq!(1, health.dual_failure_count());
    assert!(!(health.readiness_check())().await);
}

#[test]
fn recorder_timeout_configuration_is_normalized_to_a_bounded_range() {
    let config = GatewayAccountingRetryRecorderConfig {
        primary_timeout: Duration::ZERO,
        enqueue_timeout: Duration::from_secs(120),
    }
    .normalized();
    assert_eq!(Duration::from_millis(10), config.primary_timeout);
    assert_eq!(Duration::from_secs(30), config.enqueue_timeout);
}
