mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::api::app_dashboard_overview_router_with_read_store;
use sdkwork_clawrouter_router_service::ports::{
    DashboardOverviewQuery, DashboardOverviewReadFuture, DashboardOverviewReadStore,
    DashboardOverviewSnapshot, DashboardOverviewSubject,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn app_dashboard_overview_normalizes_valid_utc_timestamps_before_read_store_access() {
    let read_store = Arc::new(CapturingDashboardOverviewReadStore::default());
    let router = app_dashboard_overview_router_with_read_store(read_store.clone());

    let response = router
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/ai/dashboard/overview?time_range=DAILY&start_time=2026-04-29T01:02:03.987Z&end_time=2026-04-29T02:03:04.000Z")
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
    let payload: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("2000", payload["code"]);

    let captured_query = read_store.captured_query.lock().unwrap().clone().unwrap();
    let captured_subject = read_store.captured_subject.lock().unwrap().unwrap();

    assert_eq!(Some("daily".to_owned()), captured_query.keyword);
    assert_eq!(
        Some("2026-04-29 01:02:03.987".to_owned()),
        captured_query.start_time
    );
    assert_eq!(
        Some("2026-04-29 02:03:04".to_owned()),
        captured_query.end_time
    );
    assert_eq!(10, captured_subject.tenant_id);
    assert_eq!(20, captured_subject.organization_id);
    assert_eq!(30, captured_subject.user_id);
}

#[tokio::test]
async fn app_dashboard_overview_resolves_subject_from_web_request_context_without_legacy_headers() {
    let read_store = Arc::new(CapturingDashboardOverviewReadStore::default());
    let router = app_dashboard_overview_router_with_read_store(read_store.clone());

    let response = router
        .oneshot(common::web_framework_app_request(
            "GET",
            "/app/v3/api/ai/dashboard/overview?time_range=daily",
            Body::empty(),
            "100001",
            Some("30002"),
            "40003",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("2000", payload["code"]);

    let captured_subject = read_store.captured_subject.lock().unwrap().unwrap();
    assert_eq!(100_001, captured_subject.tenant_id);
    assert_eq!(30_002, captured_subject.organization_id);
    assert_eq!(40_003, captured_subject.user_id);
}

#[tokio::test]
async fn app_dashboard_overview_returns_mapping_error_for_non_numeric_web_principal_ids() {
    let read_store = Arc::new(CapturingDashboardOverviewReadStore::default());
    let router = app_dashboard_overview_router_with_read_store(read_store.clone());

    let response = router
        .oneshot(common::web_framework_app_request(
            "GET",
            "/app/v3/api/ai/dashboard/overview?time_range=daily",
            Body::empty(),
            "tenant-bootstrap",
            Some("0"),
            "system",
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::UNPROCESSABLE_ENTITY, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("4220", payload["code"]);
    assert!(read_store.captured_subject.lock().unwrap().is_none());
}

#[derive(Default)]
struct CapturingDashboardOverviewReadStore {
    captured_query: Mutex<Option<DashboardOverviewQuery>>,
    captured_subject: Mutex<Option<DashboardOverviewSubject>>,
}

impl DashboardOverviewReadStore for CapturingDashboardOverviewReadStore {
    fn load_dashboard_overview<'a>(
        &'a self,
        query: DashboardOverviewQuery,
        subject: Option<DashboardOverviewSubject>,
    ) -> DashboardOverviewReadFuture<'a> {
        Box::pin(async move {
            *self.captured_query.lock().unwrap() = Some(query);
            *self.captured_subject.lock().unwrap() = subject;
            Ok(DashboardOverviewSnapshot::default())
        })
    }
}
