use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_claw_config::DatabaseConfig;
use sdkwork_claw_http::TrustedRequestSubject;
use sdkwork_claw_test_support::{
    api_key_security_config, app_session_config, default_trusted_request_subject,
    seeded_sqlite_catalog, trusted_subject_config, trusted_subject_signature,
};
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};
use tower::ServiceExt;

#[tokio::test]
async fn payment_runtime_snapshot_route_is_mounted_on_backend_admin_router() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let router = sdkwork_clawrouter_admin_gateway::router_with_database_and_api_key_config(
        DatabaseConfig::from_url_with_max_connections(catalog.database_url(), 1).unwrap(),
        Some(api_key_security_config().unwrap()),
        Some(trusted_subject_config().unwrap()),
        Some(app_session_config().unwrap()),
    )
    .await
    .unwrap();

    let (status, payload) = request_value(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/payments/runtime/snapshot?environment=sandbox",
            Body::empty(),
        ),
    )
    .await;

    assert_eq!(StatusCode::NOT_FOUND, status);
    assert_eq!("4040", payload["code"]);
    assert!(payload["msg"]
        .as_str()
        .unwrap()
        .contains("payment provider runtime snapshot was not found"));
}

async fn request_value(router: axum::Router, request: Request<Body>) -> (StatusCode, Value) {
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    (status, serde_json::from_slice(&body).unwrap())
}

fn signed_request(method: &str, path: &str, body: Body) -> Request<Body> {
    signed_request_builder(method, path, default_trusted_request_subject())
        .body(body)
        .unwrap()
}

fn signed_request_builder(
    method: &str,
    path: &str,
    subject: TrustedRequestSubject,
) -> axum::http::request::Builder {
    let timestamp = current_unix_seconds();
    let signature = trusted_subject_signature(subject, timestamp, method, path).unwrap();
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .header("x-sdkwork-subject-tenant-id", subject.tenant_id.to_string())
        .header(
            "x-sdkwork-subject-organization-id",
            subject.organization_id.to_string(),
        )
        .header("x-sdkwork-subject-user-id", subject.user_id.to_string())
        .header("x-sdkwork-subject-timestamp", timestamp.to_string())
        .header("x-sdkwork-subject-signature", signature)
}

fn current_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}
