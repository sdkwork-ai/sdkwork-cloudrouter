use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use serde_json::Value;
use tower::ServiceExt;

const INTERNAL_TENANT_HEADER: &str = concat!("x-sdkwork-", "tenant-id");
const INTERNAL_ORGANIZATION_HEADER: &str = concat!("x-sdkwork-", "organization-id");
const INTERNAL_USER_HEADER: &str = concat!("x-sdkwork-", "user-id");

async fn call(method: Method, uri: &str, body: Body) -> (StatusCode, String) {
    let response = sdkwork_clawrouter_app_api_server::router()
        .oneshot(
            Request::builder()
                .method(method)
                .uri(uri)
                .body(body)
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    (status, String::from_utf8(body.to_vec()).unwrap())
}

#[tokio::test]
async fn product_app_router_does_not_mount_appbase_session_exchange_routes() {
    for path in [
        "/app/v3/api/auth/sessions",
        "/app/v3/api/auth/session",
        "/app/v3/api/auth/verification_codes",
        "/app/v3/api/auth/verification_codes/verify",
    ] {
        let (status, body_text) = call(
            Method::POST,
            path,
            Body::from(r#"{"grantType":"session_bridge"}"#),
        )
        .await;

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert!(body_text.is_empty(), "{path}");
    }
}

#[tokio::test]
async fn product_app_router_does_not_mount_appbase_current_user_route() {
    let (status, body_text) =
        call(Method::GET, "/app/v3/api/iam/users/current", Body::empty()).await;

    assert_eq!(StatusCode::NOT_FOUND, status);
    assert_eq!(
        Value::Null,
        serde_json::from_str(&body_text).unwrap_or(Value::Null)
    );
}

#[tokio::test]
async fn removed_session_routes_do_not_accept_direct_internal_subject_headers() {
    let response = sdkwork_clawrouter_app_api_server::router()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/auth/sessions")
                .header(INTERNAL_TENANT_HEADER, "999")
                .header(INTERNAL_ORGANIZATION_HEADER, "999")
                .header(INTERNAL_USER_HEADER, "999")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"grantType":"session_bridge"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    assert!(body_text.is_empty());
    assert!(!body_text.contains(INTERNAL_TENANT_HEADER));
    assert!(!body_text.contains("999"));
}
