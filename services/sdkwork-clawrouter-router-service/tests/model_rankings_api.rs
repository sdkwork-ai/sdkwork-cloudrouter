mod common;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use common::InternalTrustedSubjectHeaders;
use sdkwork_clawrouter_router_service::domain::{DomainError, DomainResult};
use sdkwork_clawrouter_router_service::ports::{
    ModelRankingRefreshAuditCommand, ModelRankingRefreshAuditFuture, ModelRankingRefreshCommand,
    ModelRankingRefreshFuture, ModelRankingRefreshJobHistoryPage,
    ModelRankingRefreshJobHistoryQuery, ModelRankingRefreshJobHistoryReadFuture,
    ModelRankingRefreshJobHistoryReadStore, ModelRankingRefreshJobItem, ModelRankingRefreshOutcome,
    ModelRankingRefreshRunStatus, ModelRankingRefreshStatus, ModelRankingRefreshStatusQuery,
    ModelRankingRefreshStatusReadFuture, ModelRankingRefreshStatusReadStore,
    ModelRankingRefreshStore, ModelRankingsCacheInvalidation, ModelRankingsCacheInvalidator,
    ModelRankingsQuery, ModelRankingsReadFuture, ModelRankingsReadStore, ModelRankingsSubject,
};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::Notify;
use tower::ServiceExt;

#[tokio::test]
async fn app_model_rankings_route_reports_service_unavailable_when_read_store_is_not_configured() {
    let router = sdkwork_clawrouter_router_service::api::app_model_rankings_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/model_rankings")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(50301, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("database-backed model rankings store is not configured"));
}

#[tokio::test]
async fn admin_model_rankings_route_requires_trusted_subject_before_unconfigured_read_store() {
    let router = sdkwork_clawrouter_router_service::api::admin_model_rankings_router();
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/model_rankings")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
}

#[tokio::test]
async fn admin_model_ranking_status_route_requires_trusted_subject() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_rankings_router_with_read_store(
            Arc::new(StubModelRankingsReadStore),
        );
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/model_rankings/status")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
}

#[tokio::test]
async fn admin_model_ranking_status_route_returns_refresh_observability_snapshot() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_rankings_router_with_read_store(
            Arc::new(StubModelRankingsReadStore),
        );
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/model_rankings/status?rank_scope=commercial-default")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("ready", payload["data"]["status"]);
    assert_eq!(10, payload["data"]["tenantId"]);
    assert_eq!(20, payload["data"]["organizationId"]);
    assert_eq!("commercial-default", payload["data"]["rankScope"]);
    assert_eq!("2026-05-08", payload["data"]["snapshotDate"]);
    assert_eq!(2, payload["data"]["generatedCount"]);
    assert_eq!(10, payload["data"]["sourceCount"]);
    assert_eq!("job-failed", payload["data"]["latestJob"]["id"]);
    assert_eq!("failed", payload["data"]["latestJob"]["status"]);
    assert_eq!(
        "usage aggregate failed",
        payload["data"]["latestJob"]["failureReason"]
    );
}

#[tokio::test]
async fn admin_model_ranking_jobs_route_returns_recent_refresh_execution_history() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_rankings_router_with_read_store(
            Arc::new(StubModelRankingsReadStore),
        );
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(
                    "/backend/v3/api/ai/model_rankings/jobs?rank_scope=commercial-default&limit=20",
                )
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!(
        "model_ranking_refresh",
        payload["data"]["items"][0]["jobName"]
    );
    assert_eq!("failed", payload["data"]["items"][0]["status"]);
    assert_eq!(
        "commercial-default",
        payload["data"]["items"][0]["rankScope"]
    );
    assert_eq!(10, payload["data"]["items"][0]["tenantId"]);
    assert_eq!(20, payload["data"]["items"][0]["organizationId"]);
    assert_eq!(
        "usage aggregate failed",
        payload["data"]["items"][0]["failureReason"]
    );
}

#[tokio::test]
async fn admin_model_ranking_manual_refresh_route_requires_trusted_subject() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_rankings_router_with_read_store_and_refresh_store(
            Arc::new(StubModelRankingsReadStore),
            Arc::new(RecordingModelRankingRefreshStore::new()),
        );
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/model_rankings/refresh")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"rankScope":"commercial-default"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
}

#[tokio::test]
async fn admin_model_ranking_manual_refresh_route_runs_worker_and_returns_result() {
    let refresh_store = Arc::new(RecordingModelRankingRefreshStore::new());
    let read_store = Arc::new(RecordingModelRankingsReadStore::new());
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_rankings_router_with_read_store_and_refresh_store(
            read_store.clone(),
            refresh_store.clone(),
        );
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/model_rankings/refresh")
                .internal_trusted_subject(10, 20, 30)
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"rankScope":"Commercial-Default","snapshotPeriod":"daily","limit":5,"lookbackDays":3,"refreshIntervalSeconds":1800,"cacheMaxAgeSeconds":30}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!(true, payload["data"]["triggered"]);
    assert_eq!("succeeded", payload["data"]["status"]);
    assert_eq!(10, payload["data"]["tenantId"]);
    assert_eq!(20, payload["data"]["organizationId"]);
    assert_eq!("commercial-default", payload["data"]["rankScope"]);
    assert_eq!(7, payload["data"]["generatedCount"]);
    assert_eq!(9, payload["data"]["sourceCount"]);
    assert_eq!(1800, payload["data"]["refreshIntervalSeconds"]);
    assert_eq!(30, payload["data"]["cacheMaxAgeSeconds"]);

    let commands = refresh_store.commands.lock().unwrap();
    assert_eq!(1, commands.len());
    assert_eq!(10, commands[0].tenant_id);
    assert_eq!(20, commands[0].organization_id);
    assert_eq!("commercial-default", commands[0].rank_scope);
    assert_eq!("daily", commands[0].snapshot_period);
    assert_eq!(5, commands[0].limit);
    assert_eq!(1800, commands[0].refresh_interval_seconds);
    assert_eq!(30, commands[0].cache_max_age_seconds);
    let audits = refresh_store.audits.lock().unwrap();
    assert_eq!(1, audits.len());
    assert_eq!("succeeded", audits[0].status);
    assert_eq!(
        2, audits[0].trigger_type,
        "manual refreshes initiated through the backend API must preserve trigger_type=manual for ops audit history"
    );

    let invalidations = read_store.invalidations.lock().unwrap();
    assert_eq!(1, invalidations.len());
    assert_eq!(10, invalidations[0].tenant_id);
    assert_eq!(20, invalidations[0].organization_id);
    assert_eq!(
        Some("commercial-default".to_owned()),
        invalidations[0].rank_scope
    );
}

#[tokio::test]
async fn admin_model_ranking_manual_refresh_route_rejects_concurrent_refresh() {
    let refresh_store = Arc::new(RecordingModelRankingRefreshStore::with_hold_gate());
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_rankings_router_with_read_store_and_refresh_store(
            Arc::new(StubModelRankingsReadStore),
            refresh_store.clone(),
        );
    let first_router = router.clone();
    let first = tokio::spawn(async move {
        first_router
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/backend/v3/api/ai/model_rankings/refresh")
                    .internal_trusted_subject(10, 20, 30)
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"rankScope":"commercial-default"}"#))
                    .unwrap(),
            )
            .await
            .unwrap()
    });
    refresh_store.wait_until_started().await;

    let second = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/model_rankings/refresh")
                .internal_trusted_subject(10, 20, 30)
                .header("content-type", "application/json")
                .body(Body::from(r#"{"rankScope":"commercial-default"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CONFLICT, second.status());
    refresh_store.release();
    let first = first.await.unwrap();
    assert_eq!(StatusCode::OK, first.status());
}

struct StubModelRankingsReadStore;

impl ModelRankingsReadStore for StubModelRankingsReadStore {
    fn load_model_rankings<'a>(
        &'a self,
        _query: ModelRankingsQuery,
        _subject: Option<ModelRankingsSubject>,
    ) -> ModelRankingsReadFuture<'a> {
        Box::pin(async {
            Err(DomainError::new(
                "model ranking list is not used by status route test",
            ))
        })
    }
}

impl ModelRankingRefreshStatusReadStore for StubModelRankingsReadStore {
    fn load_model_ranking_refresh_status<'a>(
        &'a self,
        query: ModelRankingRefreshStatusQuery,
        subject: Option<ModelRankingsSubject>,
    ) -> ModelRankingRefreshStatusReadFuture<'a> {
        Box::pin(async move {
            let subject = subject.unwrap();
            let rank_scope = query
                .rank_scope
                .unwrap_or_else(|| "commercial-default".to_owned());
            DomainResult::Ok(ModelRankingRefreshStatus {
                status: "ready".to_owned(),
                tenant_id: subject.tenant_id,
                organization_id: subject.organization_id,
                rank_scope: rank_scope.clone(),
                snapshot_date: "2026-05-08".to_owned(),
                snapshot_period: "daily".to_owned(),
                window_start: "2026-05-07T00:00:00Z".to_owned(),
                window_end: "2026-05-08T00:00:00Z".to_owned(),
                generated_at: "2026-05-08T00:05:00Z".to_owned(),
                refresh_interval_seconds: 3600,
                next_refresh_at: "2026-05-08T01:05:00Z".to_owned(),
                cache_max_age_seconds: 60,
                generated_count: 2,
                source_count: 10,
                source_tables: vec![
                    "ai_usage".to_owned(),
                    "ai_model".to_owned(),
                    "ai_model_rank_snapshot".to_owned(),
                ],
                latest_job: Some(ModelRankingRefreshJobItem {
                    id: "job-failed".to_owned(),
                    job_name: "model_ranking_refresh".to_owned(),
                    status: "failed".to_owned(),
                    tenant_id: subject.tenant_id,
                    organization_id: subject.organization_id,
                    rank_scope,
                    snapshot_date: "2026-05-08".to_owned(),
                    snapshot_period: "daily".to_owned(),
                    window_start: "2026-05-07T00:00:00Z".to_owned(),
                    window_end: "2026-05-08T00:00:00Z".to_owned(),
                    started_at: "2026-05-08T01:00:00Z".to_owned(),
                    ended_at: "2026-05-08T01:00:01Z".to_owned(),
                    duration_ms: 1000,
                    generated_count: 0,
                    source_count: 0,
                    success_count: 0,
                    failure_count: 1,
                    next_refresh_at: "2026-05-08T02:00:00Z".to_owned(),
                    failure_reason: Some("usage aggregate failed".to_owned()),
                }),
            })
        })
    }
}

impl ModelRankingRefreshJobHistoryReadStore for StubModelRankingsReadStore {
    fn load_model_ranking_refresh_jobs<'a>(
        &'a self,
        query: ModelRankingRefreshJobHistoryQuery,
        subject: Option<ModelRankingsSubject>,
    ) -> ModelRankingRefreshJobHistoryReadFuture<'a> {
        Box::pin(async move {
            let subject = subject.unwrap();
            DomainResult::Ok(ModelRankingRefreshJobHistoryPage {
                items: vec![ModelRankingRefreshJobItem {
                    id: "job-failed".to_owned(),
                    job_name: "model_ranking_refresh".to_owned(),
                    status: "failed".to_owned(),
                    tenant_id: subject.tenant_id,
                    organization_id: subject.organization_id,
                    rank_scope: query
                        .rank_scope
                        .unwrap_or_else(|| "commercial-default".to_owned()),
                    snapshot_date: "2026-05-08".to_owned(),
                    snapshot_period: "daily".to_owned(),
                    window_start: "2026-05-07T00:00:00Z".to_owned(),
                    window_end: "2026-05-08T00:00:00Z".to_owned(),
                    started_at: "2026-05-08T01:00:00Z".to_owned(),
                    ended_at: "2026-05-08T01:00:01Z".to_owned(),
                    duration_ms: 1000,
                    generated_count: 0,
                    source_count: 0,
                    success_count: 0,
                    failure_count: 1,
                    next_refresh_at: "2026-05-08T02:00:00Z".to_owned(),
                    failure_reason: Some("usage aggregate failed".to_owned()),
                }],
            })
        })
    }
}

impl ModelRankingsCacheInvalidator for StubModelRankingsReadStore {}

#[derive(Debug, Default)]
struct RecordingModelRankingsReadStore {
    invalidations: Mutex<Vec<ModelRankingsCacheInvalidation>>,
}

impl RecordingModelRankingsReadStore {
    fn new() -> Self {
        Self::default()
    }
}

impl ModelRankingsReadStore for RecordingModelRankingsReadStore {
    fn load_model_rankings<'a>(
        &'a self,
        query: ModelRankingsQuery,
        subject: Option<ModelRankingsSubject>,
    ) -> ModelRankingsReadFuture<'a> {
        StubModelRankingsReadStore.load_model_rankings(query, subject)
    }
}

impl ModelRankingRefreshStatusReadStore for RecordingModelRankingsReadStore {
    fn load_model_ranking_refresh_status<'a>(
        &'a self,
        query: ModelRankingRefreshStatusQuery,
        subject: Option<ModelRankingsSubject>,
    ) -> ModelRankingRefreshStatusReadFuture<'a> {
        StubModelRankingsReadStore.load_model_ranking_refresh_status(query, subject)
    }
}

impl ModelRankingRefreshJobHistoryReadStore for RecordingModelRankingsReadStore {
    fn load_model_ranking_refresh_jobs<'a>(
        &'a self,
        query: ModelRankingRefreshJobHistoryQuery,
        subject: Option<ModelRankingsSubject>,
    ) -> ModelRankingRefreshJobHistoryReadFuture<'a> {
        StubModelRankingsReadStore.load_model_ranking_refresh_jobs(query, subject)
    }
}

impl ModelRankingsCacheInvalidator for RecordingModelRankingsReadStore {
    fn invalidate_model_rankings_cache(&self, invalidation: ModelRankingsCacheInvalidation) {
        self.invalidations.lock().unwrap().push(invalidation);
    }
}

struct RecordingModelRankingRefreshStore {
    commands: Mutex<Vec<ModelRankingRefreshCommand>>,
    audits: Mutex<Vec<ModelRankingRefreshAuditCommand>>,
    delay: Duration,
    gate: Option<RefreshGate>,
}

impl RecordingModelRankingRefreshStore {
    fn new() -> Self {
        Self::with_delay(Duration::ZERO)
    }

    fn with_delay(delay: Duration) -> Self {
        Self {
            commands: Mutex::new(Vec::new()),
            audits: Mutex::new(Vec::new()),
            delay,
            gate: None,
        }
    }

    fn with_hold_gate() -> Self {
        Self {
            commands: Mutex::new(Vec::new()),
            audits: Mutex::new(Vec::new()),
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

impl ModelRankingRefreshStore for RecordingModelRankingRefreshStore {
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
            self.commands.lock().unwrap().push(command.clone());
            DomainResult::Ok(ModelRankingRefreshOutcome {
                generated_count: 7,
                source_count: 9,
                rank_scope: command.rank_scope,
                snapshot_date: command.snapshot_date,
                snapshot_period: command.snapshot_period,
                window_start: command.window_start,
                window_end: command.window_end,
                next_refresh_at: "2026-05-08T01:00:00Z".to_owned(),
                run_status: ModelRankingRefreshRunStatus::Succeeded,
            })
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
