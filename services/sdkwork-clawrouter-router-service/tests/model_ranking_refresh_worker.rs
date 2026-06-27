use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use sdkwork_clawrouter_router_service::application::{
    ModelRankingRefreshWorker, ModelRankingRefreshWorkerConfig,
};
use sdkwork_clawrouter_router_service::domain::{DomainError, DomainResult};
use sdkwork_clawrouter_router_service::ports::{
    ModelRankingRefreshAuditCommand, ModelRankingRefreshAuditFuture, ModelRankingRefreshCommand,
    ModelRankingRefreshFuture, ModelRankingRefreshOutcome, ModelRankingRefreshRunStatus,
    ModelRankingRefreshStore,
};
use tokio::sync::Notify;

#[tokio::test]
async fn model_ranking_refresh_worker_run_once_builds_windowed_snapshot_command() {
    let store = Arc::new(RecordingRankingRefreshStore::new(
        ModelRankingRefreshOutcome {
            generated_count: 7,
            source_count: 9,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-01T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            next_refresh_at: "2026-05-08T01:00:00Z".to_owned(),
            run_status: ModelRankingRefreshRunStatus::Succeeded,
        },
    ));
    let worker = ModelRankingRefreshWorker::new(
        store.clone(),
        ModelRankingRefreshWorkerConfig {
            enabled: true,
            tenant_id: 0,
            organization_id: 0,
            rank_scope: "commercial-default".to_owned(),
            snapshot_period: "daily".to_owned(),
            limit: 200,
            lookback_days: 7,
            interval_millis: 3_600_000,
            cache_max_age_seconds: 60,
            run_timeout_millis: 300_000,
            max_retry_attempts: 0,
            retry_backoff_millis: 1_000,
            run_on_startup: true,
            alert_after_consecutive_failures: 3,
            trigger_type: 1,
        },
    );

    let outcome = worker.run_once().await.unwrap();

    assert_eq!(7, outcome.generated_count);
    assert_eq!(9, outcome.source_count);
    let commands = store.commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!(0, commands[0].tenant_id);
    assert_eq!(0, commands[0].organization_id);
    assert_eq!("commercial-default", commands[0].rank_scope);
    assert_eq!("daily", commands[0].snapshot_period);
    assert_eq!(200, commands[0].limit);
    assert_eq!(3600, commands[0].refresh_interval_seconds);
    assert_eq!(60, commands[0].cache_max_age_seconds);
    assert_eq!(1, commands[0].trigger_type);
    assert_eq!(19, commands[0].requested_at.len());
    assert!(commands[0].requested_at.contains('-'));
    assert!(commands[0].window_start.ends_with('Z'));
    assert!(commands[0].window_end.ends_with('Z'));
}

#[tokio::test]
async fn model_ranking_refresh_worker_skips_disabled_run_without_touching_store() {
    let store = Arc::new(RecordingRankingRefreshStore::new(
        ModelRankingRefreshOutcome::default(),
    ));
    let worker = ModelRankingRefreshWorker::new(
        store.clone(),
        ModelRankingRefreshWorkerConfig {
            enabled: false,
            ..ModelRankingRefreshWorkerConfig::default()
        },
    );

    let outcome = worker.run_once().await.unwrap();

    assert_eq!(0, outcome.generated_count);
    assert_eq!(0, outcome.source_count);
    assert!(store.commands.lock().unwrap().is_empty());
}

#[tokio::test]
async fn model_ranking_refresh_worker_normalizes_invalid_global_organization_scope() {
    let store = Arc::new(RecordingRankingRefreshStore::new(
        ModelRankingRefreshOutcome::default(),
    ));
    let worker = ModelRankingRefreshWorker::new(
        store,
        ModelRankingRefreshWorkerConfig {
            enabled: true,
            tenant_id: 0,
            organization_id: 0,
            ..ModelRankingRefreshWorkerConfig::default()
        },
    );

    assert_eq!(0, worker.config().tenant_id);
    assert_eq!(0, worker.config().organization_id);
}

#[tokio::test]
async fn model_ranking_refresh_worker_normalizes_rank_scope_and_snapshot_period_from_port_standard()
{
    let store = Arc::new(RecordingRankingRefreshStore::new(
        ModelRankingRefreshOutcome::default(),
    ));
    let worker = ModelRankingRefreshWorker::new(
        store,
        ModelRankingRefreshWorkerConfig {
            enabled: true,
            rank_scope: " Commercial-Default ".to_owned(),
            snapshot_period: " BiWeekly ".to_owned(),
            ..ModelRankingRefreshWorkerConfig::default()
        },
    );

    assert_eq!("commercial-default", worker.config().rank_scope);
    assert_eq!("daily", worker.config().snapshot_period);
}

#[tokio::test]
async fn model_ranking_refresh_worker_normalizes_runtime_contract_defaults() {
    let store = Arc::new(RecordingRankingRefreshStore::new(
        ModelRankingRefreshOutcome::default(),
    ));
    let worker = ModelRankingRefreshWorker::new(
        store,
        ModelRankingRefreshWorkerConfig {
            enabled: true,
            interval_millis: 1,
            run_timeout_millis: 1,
            max_retry_attempts: 99,
            retry_backoff_millis: 0,
            alert_after_consecutive_failures: 0,
            ..ModelRankingRefreshWorkerConfig::default()
        },
    );

    assert_eq!(60_000, worker.config().interval_millis);
    assert_eq!(5_000, worker.config().run_timeout_millis);
    assert_eq!(5, worker.config().max_retry_attempts);
    assert_eq!(100, worker.config().retry_backoff_millis);
    assert_eq!(1, worker.config().alert_after_consecutive_failures);
    assert!(worker.config().run_on_startup);
}

#[tokio::test]
async fn model_ranking_refresh_worker_records_successful_refresh_execution_audit() {
    let store = Arc::new(RecordingRankingRefreshStore::new(
        ModelRankingRefreshOutcome {
            generated_count: 7,
            source_count: 9,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-01T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            next_refresh_at: "2026-05-08T01:00:00Z".to_owned(),
            run_status: ModelRankingRefreshRunStatus::Succeeded,
        },
    ));
    let worker = ModelRankingRefreshWorker::new(
        store.clone(),
        ModelRankingRefreshWorkerConfig {
            enabled: true,
            rank_scope: "commercial-default".to_owned(),
            ..ModelRankingRefreshWorkerConfig::default()
        },
    );

    worker.run_once().await.unwrap();

    let audits = store.audits.lock().unwrap();
    assert_eq!(1, audits.len());
    assert_eq!("succeeded", audits[0].status);
    assert_eq!("model_ranking_refresh", audits[0].job_name);
    assert_eq!("commercial-default", audits[0].rank_scope);
    assert_eq!(7, audits[0].generated_count);
    assert_eq!(9, audits[0].source_count);
    assert_eq!(0, audits[0].failure_count);
    assert_eq!(None, audits[0].failure_reason);
    assert_eq!(1, audits[0].trigger_type);
    assert_eq!(1, audits[0].attempt_count);
    assert_eq!(0, audits[0].retry_count);
    assert_eq!(0, audits[0].consecutive_failure_count);
    assert!(!audits[0].alert_recommended);
}

#[tokio::test]
async fn model_ranking_refresh_worker_records_failed_refresh_execution_audit_before_returning_error(
) {
    let store = Arc::new(RecordingRankingRefreshStore::failing(
        "usage aggregate failed",
    ));
    let worker = ModelRankingRefreshWorker::new(
        store.clone(),
        ModelRankingRefreshWorkerConfig {
            enabled: true,
            rank_scope: "commercial-default".to_owned(),
            max_retry_attempts: 0,
            ..ModelRankingRefreshWorkerConfig::default()
        },
    );

    let error = worker.run_once().await.unwrap_err();

    assert!(error.to_string().contains("usage aggregate failed"));
    let audits = store.audits.lock().unwrap();
    assert_eq!(1, audits.len());
    assert_eq!("failed", audits[0].status);
    assert_eq!("model_ranking_refresh", audits[0].job_name);
    assert_eq!("commercial-default", audits[0].rank_scope);
    assert_eq!(0, audits[0].generated_count);
    assert_eq!(0, audits[0].source_count);
    assert_eq!(1, audits[0].failure_count);
    assert_eq!(
        Some("usage aggregate failed".to_owned()),
        audits[0].failure_reason
    );
    assert_eq!(1, audits[0].attempt_count);
    assert_eq!(0, audits[0].retry_count);
    assert_eq!(1, audits[0].consecutive_failure_count);
    assert!(!audits[0].alert_recommended);
}

#[tokio::test]
async fn model_ranking_refresh_worker_retries_transient_failure_before_success() {
    let store = Arc::new(RecordingRankingRefreshStore::flaky(
        1,
        ModelRankingRefreshOutcome {
            generated_count: 3,
            source_count: 5,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-01T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            next_refresh_at: "2026-05-08T01:00:00Z".to_owned(),
            run_status: ModelRankingRefreshRunStatus::Succeeded,
        },
    ));
    let worker = ModelRankingRefreshWorker::new(
        store.clone(),
        ModelRankingRefreshWorkerConfig {
            enabled: true,
            max_retry_attempts: 2,
            retry_backoff_millis: 1,
            ..ModelRankingRefreshWorkerConfig::default()
        },
    );

    let outcome = worker.run_once().await.unwrap();

    assert_eq!(3, outcome.generated_count);
    assert_eq!(2, store.commands.lock().unwrap().len());
    let audits = store.audits.lock().unwrap();
    assert_eq!(1, audits.len());
    assert_eq!("succeeded", audits[0].status);
    assert_eq!(2, audits[0].attempt_count);
    assert_eq!(1, audits[0].retry_count);
    assert_eq!(0, audits[0].consecutive_failure_count);
}

#[tokio::test(start_paused = true)]
async fn model_ranking_refresh_worker_times_out_slow_refresh_and_records_failed_audit() {
    let store = Arc::new(RecordingRankingRefreshStore::slow(Duration::from_secs(10)));
    let worker = ModelRankingRefreshWorker::new(
        store.clone(),
        ModelRankingRefreshWorkerConfig {
            enabled: true,
            run_timeout_millis: 5_000,
            max_retry_attempts: 0,
            ..ModelRankingRefreshWorkerConfig::default()
        },
    );

    let result = worker.run_once().await;

    assert!(result
        .unwrap_err()
        .to_string()
        .contains("model ranking refresh timed out"));
    let audits = store.audits.lock().unwrap();
    assert_eq!(1, audits.len());
    assert_eq!("failed", audits[0].status);
    assert_eq!(1, audits[0].attempt_count);
    assert_eq!(0, audits[0].retry_count);
    assert_eq!(1, audits[0].consecutive_failure_count);
    assert!(audits[0]
        .failure_reason
        .as_deref()
        .unwrap_or_default()
        .contains("timed out"));
}

#[tokio::test]
async fn model_ranking_refresh_worker_skips_overlapping_run_for_same_worker() {
    let store = Arc::new(RecordingRankingRefreshStore::with_hold_gate(
        ModelRankingRefreshOutcome {
            generated_count: 1,
            source_count: 1,
            rank_scope: "commercial-default".to_owned(),
            snapshot_date: "2026-05-08".to_owned(),
            snapshot_period: "daily".to_owned(),
            window_start: "2026-05-01T00:00:00Z".to_owned(),
            window_end: "2026-05-08T00:00:00Z".to_owned(),
            next_refresh_at: "2026-05-08T01:00:00Z".to_owned(),
            run_status: ModelRankingRefreshRunStatus::Succeeded,
        },
    ));
    let worker = ModelRankingRefreshWorker::new(
        store.clone(),
        ModelRankingRefreshWorkerConfig {
            enabled: true,
            run_timeout_millis: 500,
            ..ModelRankingRefreshWorkerConfig::default()
        },
    );
    let first_worker = worker.clone();
    let first_run = tokio::spawn(async move { first_worker.run_once().await });
    store.wait_until_started().await;

    let skipped = worker.run_once().await.unwrap();
    store.release();
    let first = first_run.await.unwrap().unwrap();

    assert_eq!(ModelRankingRefreshRunStatus::Skipped, skipped.run_status);
    assert_eq!(ModelRankingRefreshRunStatus::Succeeded, first.run_status);
    assert_eq!(1, store.commands.lock().unwrap().len());
    let audits = store.audits.lock().unwrap();
    assert_eq!(2, audits.len());
    assert!(
        audits.iter().any(|audit| audit.status == "skipped"),
        "overlapping run must be visible in job audit history"
    );
    assert!(audits.iter().any(|audit| audit.status == "succeeded"));
}

#[tokio::test]
async fn model_ranking_refresh_worker_recommends_alert_after_delayed_failure_threshold() {
    let store = Arc::new(RecordingRankingRefreshStore::failing(
        "usage aggregate failed",
    ));
    let worker = ModelRankingRefreshWorker::new(
        store.clone(),
        ModelRankingRefreshWorkerConfig {
            enabled: true,
            max_retry_attempts: 0,
            alert_after_consecutive_failures: 2,
            ..ModelRankingRefreshWorkerConfig::default()
        },
    );

    let _ = worker.run_once().await.unwrap_err();
    let _ = worker.run_once().await.unwrap_err();

    let audits = store.audits.lock().unwrap();
    assert_eq!(2, audits.len());
    assert_eq!(1, audits[0].consecutive_failure_count);
    assert!(!audits[0].alert_recommended);
    assert_eq!(2, audits[1].consecutive_failure_count);
    assert!(audits[1].alert_recommended);
    assert_eq!(Some("warning".to_owned()), audits[1].alert_severity);
}

#[derive(Debug)]
struct RecordingRankingRefreshStore {
    commands: Mutex<Vec<ModelRankingRefreshCommand>>,
    audits: Mutex<Vec<ModelRankingRefreshAuditCommand>>,
    outcome: ModelRankingRefreshOutcome,
    failure: Option<String>,
    failures_before_success: AtomicUsize,
    delay: Duration,
    gate: Option<RefreshGate>,
}

impl RecordingRankingRefreshStore {
    fn new(outcome: ModelRankingRefreshOutcome) -> Self {
        Self {
            commands: Mutex::new(Vec::new()),
            audits: Mutex::new(Vec::new()),
            outcome,
            failure: None,
            failures_before_success: AtomicUsize::new(0),
            delay: Duration::ZERO,
            gate: None,
        }
    }

    fn failing(message: &str) -> Self {
        Self {
            commands: Mutex::new(Vec::new()),
            audits: Mutex::new(Vec::new()),
            outcome: ModelRankingRefreshOutcome::default(),
            failure: Some(message.to_owned()),
            failures_before_success: AtomicUsize::new(usize::MAX),
            delay: Duration::ZERO,
            gate: None,
        }
    }

    fn flaky(failures_before_success: usize, outcome: ModelRankingRefreshOutcome) -> Self {
        Self {
            commands: Mutex::new(Vec::new()),
            audits: Mutex::new(Vec::new()),
            outcome,
            failure: Some("transient usage aggregate failed".to_owned()),
            failures_before_success: AtomicUsize::new(failures_before_success),
            delay: Duration::ZERO,
            gate: None,
        }
    }

    fn slow(delay: Duration) -> Self {
        Self {
            commands: Mutex::new(Vec::new()),
            audits: Mutex::new(Vec::new()),
            outcome: ModelRankingRefreshOutcome {
                generated_count: 1,
                source_count: 1,
                rank_scope: "commercial-default".to_owned(),
                snapshot_date: "2026-05-08".to_owned(),
                snapshot_period: "daily".to_owned(),
                window_start: "2026-05-01T00:00:00Z".to_owned(),
                window_end: "2026-05-08T00:00:00Z".to_owned(),
                next_refresh_at: "2026-05-08T01:00:00Z".to_owned(),
                run_status: ModelRankingRefreshRunStatus::Succeeded,
            },
            failure: None,
            failures_before_success: AtomicUsize::new(0),
            delay,
            gate: None,
        }
    }

    fn with_hold_gate(outcome: ModelRankingRefreshOutcome) -> Self {
        Self {
            commands: Mutex::new(Vec::new()),
            audits: Mutex::new(Vec::new()),
            outcome,
            failure: None,
            failures_before_success: AtomicUsize::new(0),
            delay: Duration::ZERO,
            gate: Some(RefreshGate::new()),
        }
    }

    async fn wait_until_started(&self) {
        if let Some(gate) = &self.gate {
            gate.wait_until_started().await;
        }
    }

    fn release(&self) {
        if let Some(gate) = &self.gate {
            gate.release();
        }
    }
}

impl ModelRankingRefreshStore for RecordingRankingRefreshStore {
    fn refresh_model_rankings<'a>(
        &'a self,
        command: ModelRankingRefreshCommand,
    ) -> ModelRankingRefreshFuture<'a> {
        Box::pin(async move {
            if let Some(gate) = &self.gate {
                gate.mark_started();
                gate.wait_until_released().await;
            }
            if self.delay > Duration::ZERO {
                tokio::time::sleep(self.delay).await;
            }
            self.commands.lock().unwrap().push(command);
            let remaining_failures = self.failures_before_success.load(Ordering::SeqCst);
            if remaining_failures > 0 {
                self.failures_before_success.fetch_sub(1, Ordering::SeqCst);
                let message = self
                    .failure
                    .clone()
                    .unwrap_or_else(|| "refresh failed".to_owned());
                return Err(DomainError::new(message.clone()));
            }
            DomainResult::Ok(self.outcome.clone())
        })
    }

    fn record_model_ranking_refresh_audit<'a>(
        &'a self,
        command: ModelRankingRefreshAuditCommand,
    ) -> ModelRankingRefreshAuditFuture<'a> {
        Box::pin(async move {
            self.audits.lock().unwrap().push(command);
            DomainResult::Ok(())
        })
    }
}

#[derive(Debug)]
struct RefreshGate {
    started: AtomicBool,
    started_notify: Notify,
    released: AtomicBool,
    released_notify: Notify,
}

impl RefreshGate {
    fn new() -> Self {
        Self {
            started: AtomicBool::new(false),
            started_notify: Notify::new(),
            released: AtomicBool::new(false),
            released_notify: Notify::new(),
        }
    }

    fn mark_started(&self) {
        self.started.store(true, Ordering::SeqCst);
        self.started_notify.notify_waiters();
    }

    async fn wait_until_started(&self) {
        loop {
            let notified = self.started_notify.notified();
            if self.started.load(Ordering::SeqCst) {
                return;
            }
            notified.await;
        }
    }

    fn release(&self) {
        self.released.store(true, Ordering::SeqCst);
        self.released_notify.notify_waiters();
    }

    async fn wait_until_released(&self) {
        loop {
            let notified = self.released_notify.notified();
            if self.released.load(Ordering::SeqCst) {
                return;
            }
            notified.await;
        }
    }
}
