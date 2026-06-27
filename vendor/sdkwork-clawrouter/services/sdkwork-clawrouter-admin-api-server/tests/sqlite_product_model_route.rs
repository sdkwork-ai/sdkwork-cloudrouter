use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_claw_http::TrustedRequestSubject;
use sdkwork_claw_test_support::{
    seeded_sqlite_catalog, trusted_request_subject, trusted_subject_signature,
};
use std::time::{SystemTime, UNIX_EPOCH};
use tower::ServiceExt;

#[tokio::test]
async fn sqlite_product_catalog_route_serves_real_backend_model_list() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();

    let router = sdkwork_clawrouter_admin_api_server::router_with_sqlite_product_catalog(pool)
        .await
        .unwrap();
    let response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/ai/models?api_key_id=100&billing_meter=llm_input_token&vendor_code=openai",
            Body::empty(),
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("2000", payload["code"]);
    let items = payload["data"]["items"]
        .as_array()
        .expect("model list items must be an array");
    let transcribe_model = items
        .iter()
        .find(|item| item["model"] == "gpt-4o-mini-transcribe")
        .unwrap_or_else(|| {
            panic!("expected gpt-4o-mini-transcribe in bundled catalog model list, got: {items:?}")
        });
    assert_eq!(
        "1.320000",
        transcribe_model["priceAvailability"]["customerUnitPrice"]
    );
}

fn bootstrap_admin_subject() -> TrustedRequestSubject {
    trusted_request_subject(100_001, 0, 1)
}

fn signed_request(method: &str, path: &str, body: Body) -> Request<Body> {
    signed_request_builder(method, path, bootstrap_admin_subject())
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
        .header("x-sdkwork-tenant-id", subject.tenant_id.to_string())
        .header(
            "x-sdkwork-organization-id",
            subject.organization_id.to_string(),
        )
        .header("x-sdkwork-user-id", subject.user_id.to_string())
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
        .unwrap()
        .as_secs() as i64
}
