mod common;
use common::InternalTrustedSubjectHeaders;
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::ports::{
    AdminDashboardQuery, AdminDashboardReadFuture, AdminDashboardReadStore, AdminDashboardSnapshot,
    AdminDashboardSubject,
};
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn admin_dashboard_route_serializes_active_users_as_int64_string() {
    let router = sdkwork_clawrouter_router_service::api::admin_dashboard_router_with_read_store(
        Arc::new(TestAdminDashboardStore),
    );

    let response = router
        .oneshot(
            Request::builder()
                .uri("/backend/v3/api/system/dashboard/admin/overview")
                .internal_trusted_subject(10, 20, 30)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let payload = json_payload(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("2", payload["data"]["activeUsers"]);
}

async fn json_payload(response: axum::response::Response) -> Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

struct TestAdminDashboardStore;

impl AdminDashboardReadStore for TestAdminDashboardStore {
    fn load_dashboard<'a>(&'a self, query: AdminDashboardQuery) -> AdminDashboardReadFuture<'a> {
        Box::pin(async move {
            assert_eq!(
                AdminDashboardSubject {
                    tenant_id: 100001,
                    organization_id: 0,
                    operator_id: 30,
                    operator_type: 1,
                },
                query.subject
            );

            Ok(AdminDashboardSnapshot {
                active_users: 2,
                ..AdminDashboardSnapshot::default()
            })
        })
    }
}
