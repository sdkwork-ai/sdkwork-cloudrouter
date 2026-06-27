use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use serde_json::Value;
use tower::ServiceExt;

async fn call(method: Method, uri: &str) -> (StatusCode, Value) {
    let response = sdkwork_clawrouter_admin_gateway::router()
        .oneshot(
            Request::builder()
                .method(method)
                .uri(uri)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload = serde_json::from_slice(&body).unwrap_or(Value::Null);
    (status, payload)
}

#[tokio::test]
async fn backend_contract_routes_return_standard_not_implemented_envelope() {
    let cases = [
        (Method::GET, "/backend/v3/api/ai/models", "fetchModels"),
        (
            Method::POST,
            "/backend/v3/api/ai/models/refresh",
            "syncVendorsAndModels",
        ),
        (
            Method::PATCH,
            "/backend/v3/api/content/announcements/notice-001",
            "updateAnnouncement",
        ),
    ];

    for (method, path, operation) in cases {
        let (status, payload) = call(method, path).await;

        assert_eq!(StatusCode::NOT_IMPLEMENTED, status, "{path}");
        assert_eq!("5010", payload["code"], "{path}");
        assert_eq!("Not implemented", payload["msg"], "{path}");
        assert_eq!(operation, payload["data"]["operation"], "{path}");
        assert_eq!("backend", payload["data"]["apiSurface"], "{path}");
        assert_eq!(path, payload["data"]["apiPath"], "{path}");
    }
}

#[tokio::test]
async fn unknown_backend_route_still_returns_not_found() {
    let response = sdkwork_clawrouter_admin_gateway::router()
        .oneshot(
            Request::builder()
                .uri("/backend/v3/api/not-in-contract")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
}

#[tokio::test]
async fn default_router_does_not_mount_commerce_backend_routes_locally() {
    for path in [
        "/backend/v3/api/payments/providers",
        "/backend/v3/api/commerce_reports/payment_reconciliation",
    ] {
        let (status, payload) = call(Method::GET, path).await;

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert_eq!(Value::Null, payload, "{path}");
    }
}

#[tokio::test]
async fn default_router_does_not_mount_appbase_backend_iam_routes_locally() {
    for path in [
        "/backend/v3/api/iam/organizations",
        "/backend/v3/api/iam/organizations/tree",
        "/backend/v3/api/iam/departments",
        "/backend/v3/api/iam/departments/tree",
        "/backend/v3/api/iam/roles",
        "/backend/v3/api/iam/permissions",
        "/backend/v3/api/iam/roles/role-admin/permissions",
        "/backend/v3/api/iam/users",
        "/backend/v3/api/iam/api_keys",
        "/backend/v3/api/iam/oauth/provider_catalog",
    ] {
        let (status, payload) = call(Method::GET, path).await;

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert_eq!(Value::Null, payload, "{path}");
    }
}

#[tokio::test]
async fn default_router_does_not_mount_messaging_foundation_routes_locally() {
    for path in [
        "/backend/v3/api/messaging/provider_accounts",
        "/backend/v3/api/messaging/sender_identities",
        "/backend/v3/api/messaging/templates",
        "/backend/v3/api/messaging/route_rules",
        "/backend/v3/api/messaging/send_requests",
        "/backend/v3/api/messaging/verification_policies",
    ] {
        let (status, payload) = call(Method::GET, path).await;

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert_eq!(Value::Null, payload, "{path}");
    }
}
