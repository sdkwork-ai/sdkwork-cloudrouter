use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use sdkwork_cloudrouter_test_support::{
    app_session_dual_token_headers, default_trusted_request_subject,
};
use serde_json::Value;
use std::sync::OnceLock;
use tower::ServiceExt;

async fn call(method: Method, uri: &str) -> (StatusCode, Value) {
    let response = sdkwork_cloudrouter_standalone_gateway::router()
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
async fn default_router_returns_contract_fallback_for_product_api_keys_without_database_runtime() {
    let cases = [
        (Method::GET, "/app/v3/api/iam/api_keys"),
        (Method::POST, "/app/v3/api/iam/api_keys"),
        (Method::PATCH, "/app/v3/api/iam/api_keys/key-1"),
        (Method::DELETE, "/app/v3/api/iam/api_keys/key-1"),
    ];

    for (method, path) in cases {
        let method_for_call = method.clone();
        let (status, payload) = call(method_for_call, path).await;

        assert_eq!(
            StatusCode::NOT_IMPLEMENTED,
            status,
            "{method} {path} should use contract fallback without database-backed handlers"
        );
        assert_ne!(Value::Null, payload, "{path}");
        assert_eq!(
            payload.get("status").and_then(Value::as_u64),
            Some(501),
            "{path}"
        );
    }
}

#[tokio::test]
async fn default_router_mounts_sdk_reference_documentation_route() {
    let _guard = env_guard().await;
    clear_generator_env();

    let response = sdkwork_cloudrouter_standalone_gateway::router()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("content-type", "application/json")
                .body(Body::from(sdk_reference_request_body()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);

    assert_eq!(StatusCode::OK, status, "{payload}");
    assert_eq!(payload.get("code").and_then(Value::as_str), Some("2000"));

    clear_generator_env();
}

#[tokio::test]
async fn default_router_serves_sdk_reference_documentation_with_app_session_auth() {
    let _guard = env_guard().await;
    clear_generator_env();

    // SDK reference 文档路由为纯函数本地产品路由：数据库配置装配路径要求
    // PostgreSQL（SQLite 仅限客户端本地），因此该路由在默认路由上以
    // app session 双令牌认证直接验证。
    let issued_at = 1_700_000_000_i64;
    let expires_at = issued_at + 3_600;
    let (authorization, access_token) =
        app_session_dual_token_headers(default_trusted_request_subject(), issued_at, expires_at)
            .unwrap();

    let response = sdkwork_cloudrouter_standalone_gateway::router()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/sdk_reference/documentation")
                .header("authorization", authorization)
                .header("access-token", access_token)
                .header("content-type", "application/json")
                .body(Body::from(sdk_reference_request_body()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);

    assert_eq!(StatusCode::OK, status, "{payload}");
    assert_eq!(payload.get("code").and_then(Value::as_str), Some("2000"));

    clear_generator_env();
}

#[tokio::test]
async fn app_promotion_code_redemption_route_is_not_product_local_without_appbase_store() {
    let response = sdkwork_cloudrouter_standalone_gateway::router()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/app/v3/api/promotions/codes/redemptions")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"code":"WELCOME"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);

    assert_eq!(StatusCode::NOT_FOUND, status);
    assert_eq!(Value::Null, payload);
}

fn sdk_reference_request_body() -> String {
    serde_json::json!({
        "spec": {
            "openapi": "3.1.0",
            "info": {
                "title": "Cloud Router App API",
                "version": "0.1.0"
            },
            "paths": {
                "/app/v3/api/ai/models": {
                    "get": {
                        "operationId": "models.list",
                        "responses": {
                            "200": {
                                "description": "ok"
                            }
                        }
                    }
                }
            }
        },
        "language": "typescript",
        "config": {
            "name": "SdkworkCloudRouterAppClient",
            "version": "0.1.0",
            "language": "typescript",
            "sdkType": "app",
            "apiSpecPath": "/app/v3/api/openapi.json",
            "baseUrl": "https://api.sdkwork.com",
            "apiPrefix": "/app/v3/api",
            "packageName": "@sdkwork/cloudrouter-app-sdk"
        }
    })
    .to_string()
}

fn clear_generator_env() {
    for name in [
        "SDKWORK_CLOUDROUTER_TOOL_API_SDK_GENERATOR_BASE_URL",
        "SDKWORK_CLOUDROUTER_TOOL_API_SDK_GENERATOR_API_KEY",
        "SDKWORK_CLOUDROUTER_TOOL_API_SDK_GENERATOR_API_KEY_FILE",
        "PORTAL_TOOL_API_SDK_GENERATOR_BASE_URL",
        "PORTAL_TOOL_API_SDK_GENERATOR_API_KEY",
        "PORTAL_TOOL_API_SDK_GENERATOR_API_KEY_FILE",
    ] {
        std::env::remove_var(name);
    }
}

/// Serializes the tests that mutate process-wide generator environment
/// variables. The guard is owned rather than borrowed so it does not hold a
/// `MutexGuard` borrowed from a `'static` mutex across an await point, which is
/// what `clippy::await_holding_lock` rejects; the lock is still released when the
/// returned guard drops at the end of the test body.
async fn env_guard() -> tokio::sync::OwnedMutexGuard<()> {
    static ENV_GUARD: OnceLock<std::sync::Arc<tokio::sync::Mutex<()>>> = OnceLock::new();
    ENV_GUARD
        .get_or_init(|| std::sync::Arc::new(tokio::sync::Mutex::new(())))
        .clone()
        .lock_owned()
        .await
}

#[tokio::test]
async fn default_router_does_not_serve_appbase_owned_commerce_routes_without_appbase_store() {
    let cases = [
        (Method::POST, "/app/v3/api/promotions/codes/redemptions"),
        (Method::GET, "/app/v3/api/accounts/current/summary"),
        (Method::GET, "/app/v3/api/wallet/accounts"),
        (Method::GET, "/app/v3/api/wallet/tokens"),
        (Method::GET, "/app/v3/api/recharges/packages"),
        (Method::POST, "/app/v3/api/recharges/orders"),
        (Method::GET, "/app/v3/api/recharges/orders/ORDER-1"),
        (
            Method::GET,
            "/app/v3/api/payments/attempts/payment-attempt-1",
        ),
    ];

    for (method, path) in cases {
        let mut builder = Request::builder().method(method).uri(path);
        let body = if path.ends_with("/promotions/codes/redemptions") {
            builder = builder.header("content-type", "application/json");
            Body::from(r#"{"code":"WELCOME"}"#)
        } else {
            Body::empty()
        };
        let response = sdkwork_cloudrouter_standalone_gateway::router()
            .oneshot(builder.body(body).unwrap())
            .await
            .unwrap();
        let status = response.status();
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let payload: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert_eq!(Value::Null, payload, "{path}");
    }

    for (method, path) in [
        (Method::GET, "/app/v3/api/wallet/operations/request-1"),
        (Method::POST, "/app/v3/api/wallet/exchanges"),
        (Method::POST, "/app/v3/api/wallet/tokens/deductions"),
        (Method::POST, "/app/v3/api/checkout/preflight/estimates"),
        (Method::POST, "/app/v3/api/promotions/codes/usage"),
        (Method::POST, "/app/v3/api/invoices/invoice-1/submissions"),
    ] {
        let response = sdkwork_cloudrouter_standalone_gateway::router()
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(path)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(StatusCode::NOT_FOUND, response.status(), "{path}");
    }
}

#[tokio::test]
async fn default_router_does_not_mount_appbase_app_iam_routes_locally() {
    for path in [
        "/app/v3/api/auth/registrations",
        "/app/v3/api/auth/sessions",
        "/app/v3/api/auth/sessions/current",
        "/app/v3/api/auth/sessions/refresh",
        "/app/v3/api/auth/verification_codes",
        "/app/v3/api/auth/verification_codes/verify",
        "/app/v3/api/iam/users/current",
        "/app/v3/api/iam/organizations",
        "/app/v3/api/iam/organizations/tree",
        "/app/v3/api/iam/organization_memberships",
        "/app/v3/api/iam/departments",
        "/app/v3/api/iam/departments/tree",
        "/app/v3/api/iam/department_assignments",
        "/app/v3/api/iam/positions",
        "/app/v3/api/iam/position_assignments",
        "/app/v3/api/iam/role_bindings",
        "/app/v3/api/iam/roles",
        "/app/v3/api/system/iam/runtime",
        "/app/v3/api/system/iam/verification_policy",
    ] {
        let (status, payload) = call(Method::GET, path).await;

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert_eq!(Value::Null, payload, "{path}");
    }
}

#[test]
fn route_crate_source_does_not_construct_product_local_appbase_runtime_stores_by_default() {
    let source = std::fs::read_to_string(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../crates/sdkwork-routes-cloudrouter-app-api/src/routes.rs"),
    )
    .expect("read route crate source");

    for marker in [
        "SqliteAppIamDirectoryReadStore",
        "PostgresAppIamDirectoryReadStore",
        "app_user_profile_router",
    ] {
        assert!(
            !source.contains(marker),
            "default app route crate must not construct product-local foundation runtime marker {marker}",
        );
    }
}

#[tokio::test]
async fn default_router_does_not_mount_appstore_foundation_routes_locally() {
    let cases = [
        (Method::GET, "/app/v3/api/platform/apps/store"),
        (Method::GET, "/app/v3/api/platform/apps/categories"),
        (Method::GET, "/app/v3/api/platform/apps/installed"),
    ];

    for (method, path) in cases {
        let (status, payload) = call(method, path).await;

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert_eq!(Value::Null, payload, "{path}");
    }
}

#[tokio::test]
async fn default_router_does_not_mount_commerce_foundation_routes_locally() {
    for path in [
        "/app/v3/api/wallet/exchange_rate",
        "/app/v3/api/payments/attempts/payment-attempt-1",
        "/app/v3/api/wallet/points/exchanges/rules",
    ] {
        let (status, payload) = call(Method::GET, path).await;

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert_eq!(Value::Null, payload, "{path}");
    }

    let (status, payload) = call(Method::POST, "/app/v3/api/wallet/exchange_rate").await;
    assert_eq!(StatusCode::NOT_FOUND, status);
    assert_eq!(Value::Null, payload);
}

#[tokio::test]
async fn default_router_does_not_mount_commerce_membership_foundation_routes_locally() {
    for path in [
        "/app/v3/api/memberships/current",
        "/app/v3/api/memberships/packages",
    ] {
        let (status, payload) = call(Method::GET, path).await;

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert_eq!(Value::Null, payload, "{path}");
    }

    for path in ["/app/v3/api/memberships/purchases"] {
        let response = sdkwork_cloudrouter_standalone_gateway::router()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri(path)
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"packageId":1}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        let status = response.status();
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let payload: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert_eq!(Value::Null, payload, "{path}");
    }
    let (status, payload) = call(Method::POST, "/app/v3/api/memberships/purchases").await;
    assert_eq!(StatusCode::NOT_FOUND, status);
    assert_eq!(Value::Null, payload);
}

#[tokio::test]
async fn app_skills_route_is_not_exposed_by_default_router() {
    let (status, payload) = call(Method::GET, "/app/v3/api/ecosystem/skills").await;

    assert_eq!(StatusCode::NOT_FOUND, status);
    assert_eq!(Value::Null, payload);
}

#[tokio::test]
async fn unknown_app_route_still_returns_not_found() {
    let response = sdkwork_cloudrouter_standalone_gateway::router()
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/not-in-contract")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
}
