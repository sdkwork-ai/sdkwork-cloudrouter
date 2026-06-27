use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use sdkwork_claw_config::DatabaseConfig;
use sdkwork_claw_test_support::{
    api_key_security_config, app_session_config, app_session_dual_token_headers,
    default_trusted_request_subject, payment_webhook_config, trusted_subject_config,
};
use serde_json::Value;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use tower::ServiceExt;

static SQLITE_DB_SEQUENCE: AtomicU64 = AtomicU64::new(0);

async fn call(method: Method, uri: &str) -> (StatusCode, Value) {
    let response = sdkwork_clawrouter_app_api_server::router()
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
async fn default_router_does_not_mount_appbase_app_api_key_routes_locally() {
    let cases = [
        (Method::GET, "/app/v3/api/iam/api_keys"),
        (Method::POST, "/app/v3/api/iam/api_keys"),
        (Method::PATCH, "/app/v3/api/iam/api_keys/key-1"),
        (Method::DELETE, "/app/v3/api/iam/api_keys/key-1"),
    ];

    for (method, path) in cases {
        let (status, payload) = call(method, path).await;

        assert_eq!(StatusCode::NOT_FOUND, status, "{path}");
        assert_eq!(Value::Null, payload, "{path}");
    }
}

#[tokio::test]
async fn default_router_mounts_sdk_reference_documentation_route() {
    let _guard = env_guard().lock().unwrap();
    clear_generator_env();

    let response = sdkwork_clawrouter_app_api_server::router()
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
async fn database_config_router_mounts_sdk_reference_generation_route() {
    let _guard = env_guard().lock().unwrap();
    clear_generator_env();

    let router =
        sdkwork_clawrouter_app_api_server::router_with_database_config_api_key_trusted_subject_and_app_session_config(
            DatabaseConfig::from_url_with_max_connections(unique_sqlite_url().as_str(), 1).unwrap(),
            api_key_security_config().unwrap(),
            trusted_subject_config().unwrap(),
            app_session_config().unwrap(),
            payment_webhook_config().unwrap(),
        )
        .await
        .unwrap();

    let issued_at = 1_700_000_000_i64;
    let expires_at = issued_at + 3_600;
    let (authorization, access_token) =
        app_session_dual_token_headers(default_trusted_request_subject(), issued_at, expires_at)
            .unwrap();

    let response = router
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
    let response = sdkwork_clawrouter_app_api_server::router()
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
                "title": "Claw Router App API",
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
            "name": "SdkworkClawRouterAppClient",
            "version": "0.1.0",
            "language": "typescript",
            "sdkType": "app",
            "apiSpecPath": "/app/v3/api/openapi.json",
            "baseUrl": "https://api.sdkwork.com",
            "apiPrefix": "/app/v3/api",
            "packageName": "@sdkwork/clawrouter-app-sdk"
        }
    })
    .to_string()
}

fn unique_sqlite_url() -> String {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let sequence = SQLITE_DB_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let process_id = std::process::id();
    let mut path = sqlite_test_database_dir();
    std::fs::create_dir_all(&path).unwrap();
    path.push(format!(
        "app-contract-routes-{process_id}-{sequence}-{nonce}.sqlite"
    ));
    format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"))
}

fn sqlite_test_database_dir() -> std::path::PathBuf {
    std::env::var_os("CARGO_TARGET_DIR")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("test-dbs")
}

fn clear_generator_env() {
    for name in [
        "SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL",
        "SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY",
        "SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY_FILE",
        "PORTAL_TOOL_API_SDK_GENERATOR_BASE_URL",
        "PORTAL_TOOL_API_SDK_GENERATOR_API_KEY",
        "PORTAL_TOOL_API_SDK_GENERATOR_API_KEY_FILE",
    ] {
        std::env::remove_var(name);
    }
}

fn env_guard() -> &'static Mutex<()> {
    static ENV_GUARD: OnceLock<Mutex<()>> = OnceLock::new();
    ENV_GUARD.get_or_init(|| Mutex::new(()))
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
        let response = sdkwork_clawrouter_app_api_server::router()
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
        let response = sdkwork_clawrouter_app_api_server::router()
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
            .join("../../crates/sdkwork-routes-clawrouter-app-api/src/routes.rs"),
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
        let response = sdkwork_clawrouter_app_api_server::router()
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
    let response = sdkwork_clawrouter_app_api_server::router()
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
