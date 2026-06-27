const ADMIN_API_LIB: &str = include_str!("../src/lib.rs");

use axum::http::{Method, StatusCode};
use serde_json::Value;

#[test]
fn admin_api_database_runtime_does_not_mount_local_storage_center() {
    for marker in [
        "admin_storage_router_with_store",
        "SqliteAdminStorageStore::new(pool.clone())",
        "PostgresAdminStorageStore::new(pool.clone())",
        "storage_store: Some(storage_store)",
    ] {
        assert!(
            !ADMIN_API_LIB.contains(marker),
            "admin api runtime must not mount local storage marker {marker}; sdkwork-drive owns that surface"
        );
    }
}

#[tokio::test]
async fn default_router_does_not_mount_drive_storage_routes_locally() {
    for path in [
        "/backend/v3/api/storage/providers",
        "/backend/v3/api/storage/buckets",
        "/backend/v3/api/storage/default_buckets",
        "/backend/v3/api/storage/quotas",
        "/backend/v3/api/storage/usage",
        "/backend/v3/api/storage/reconciliation_runs",
        "/backend/v3/api/storage/gc_jobs",
    ] {
        let (status, payload) = contract_call(Method::GET, path).await;

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert_eq!(Value::Null, payload, "{path}");
    }
}

async fn contract_call(method: Method, path: &str) -> (StatusCode, Value) {
    use axum::body::Body;
    use axum::http::Request;
    use tower::ServiceExt;

    let router = sdkwork_clawrouter_admin_api_server::router();
    let response = router
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .expect("contract route should resolve");
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("contract route body should be readable");
    let payload = if body.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&body).unwrap_or(Value::Null)
    };
    (status, payload)
}
