use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, Request, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_claw_config::{
    ApiKeySecurityConfig, AppSessionConfig, DatabaseConfig, ProviderSecretMapConfig,
    StartupInstallMode, TrustedSubjectConfig,
};
use sdkwork_claw_http::TrustedRequestSubject;
use sdkwork_claw_test_support::{
    api_key_security_config as test_api_key_security_config,
    app_session_config as test_app_session_config, app_session_dual_token_headers,
    default_trusted_request_subject, seeded_sqlite_catalog, trusted_request_subject,
    trusted_subject_config as test_trusted_subject_config, trusted_subject_signature,
};
use serde_json::json;
use serde_json::Value;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};
use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tower::ServiceExt;

static SQLITE_DB_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Default)]
struct CapturedProviderHealthProbe {
    authorization: Option<String>,
    body: Value,
}

#[tokio::test]
async fn database_config_router_uses_sqlite_catalog_for_backend_model_list() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let router = configured_router_from_database_config(
        catalog.database_config().unwrap(),
        Some(catalog.api_key_security_config().unwrap()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let health = router
        .clone()
        .oneshot(
            Request::builder()
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, health.status());
    let health_body = axum::body::to_bytes(health.into_body(), usize::MAX)
        .await
        .unwrap();
    let health_body = String::from_utf8(health_body.to_vec()).unwrap();
    let health_payload: serde_json::Value = serde_json::from_str(&health_body).unwrap();

    assert_eq!(true, health_payload["database"]["configured"]);
    assert_eq!("sqlite", health_payload["database"]["engine"]);
    assert_eq!(1, health_payload["database"]["maxConnections"]);
    assert!(!health_body.contains(catalog.database_url()));

    let response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/ai/models",
            Body::empty(),
        ))
        .await
        .unwrap();

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, status, "{body_text}");
    let payload: serde_json::Value = serde_json::from_str(&body_text).unwrap();

    assert_eq!("2000", payload["code"]);
    let items = payload["data"]["items"].as_array().unwrap();
    let item = items
        .iter()
        .find(|item| item["model"] == "gpt-4o-mini")
        .expect("gpt-4o-mini should be returned by backend model list");
    assert!(item["id"].as_str().is_some_and(|value| !value.is_empty()));
    assert!(item["vendorId"]
        .as_str()
        .is_some_and(|value| !value.is_empty()));
    assert_eq!("openai", item["vendorCode"]);
    assert_eq!("gpt-4o-mini", item["model"]);
    assert_eq!("GPT-4o mini", item["displayName"]);
    assert_eq!("GPT-4o mini", item["name"]);
    assert_eq!("Chat", item["type"]);
    let global_price = item["regionPrices"]
        .as_array()
        .unwrap()
        .iter()
        .find(|price| price["regionCode"] == "global")
        .expect("global official model price should be returned");
    assert_eq!("0.150000", global_price["priceIn"]);
    assert_eq!("0.600000", global_price["priceOut"]);
    assert_eq!("active", item["status"]);
    assert_eq!("0", item["calls"]);
    assert_eq!(128_000, item["contextTokens"]);
    assert!(item.get("priceAvailability").is_none());
    assert!(items
        .iter()
        .any(|item| item["model"] == "text-embedding-3-small"));
}

#[tokio::test]
async fn database_config_router_requires_admin_subject_for_backend_model_management() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let router = configured_router_from_database_config(
        catalog.database_config().unwrap(),
        Some(catalog.api_key_security_config().unwrap()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/models")
                .header("authorization", catalog.gateway_authorization_header())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("4010", payload["code"]);

    let response = router
        .oneshot(app_session_request(
            "GET",
            "/backend/v3/api/ai/models",
            Body::empty(),
        ))
        .await
        .unwrap();

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, status, "{body_text}");
    let payload: serde_json::Value = serde_json::from_str(&body_text).unwrap();

    assert_eq!("2000", payload["code"]);
    assert_eq!("gpt-4o-mini", payload["data"]["items"][0]["model"]);
    assert_eq!("GPT-4o mini", payload["data"]["items"][0]["displayName"]);
    assert_eq!("GPT-4o mini", payload["data"]["items"][0]["name"]);
    assert_eq!("Chat", payload["data"]["items"][0]["type"]);
    assert!(payload["data"]["items"][0]
        .get("priceAvailability")
        .is_none());
}

#[tokio::test]
async fn database_config_router_rejects_regular_user_session_for_backend_admin_routes() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let router = configured_router_from_database_config(
        catalog.database_config().unwrap(),
        Some(catalog.api_key_security_config().unwrap()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let regular_user_subject = trusted_request_subject(100_001, 0, 31);
    let response = router
        .oneshot(app_session_request_for_subject(
            "GET",
            "/backend/v3/api/ai/models",
            Body::empty(),
            regular_user_subject,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::FORBIDDEN, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("4030", payload["code"]);
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_model_catalog_commands() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let create_vendor_payload = request_json(
        router.clone(),
        app_session_request(
            "POST",
            "/backend/v3/api/ai/model_vendors",
            Body::from(
                r#"{"vendorCode":"acme-ai","name":"Acme AI","status":"active","color":"bg-cyan-700","description":"Acme hosted models"}"#,
            ),
        ),
    )
    .await;
    assert_eq!("2000", create_vendor_payload["code"]);
    assert_eq!(
        "acme_ai",
        create_vendor_payload["data"]["item"]["vendorCode"]
    );
    assert_eq!("Acme AI", create_vendor_payload["data"]["item"]["name"]);
    assert_eq!("active", create_vendor_payload["data"]["item"]["status"]);
    assert_eq!(
        "bg-cyan-700",
        create_vendor_payload["data"]["item"]["color"]
    );
    let create_site_payload = request_json(
        router.clone(),
        app_session_request(
            "POST",
            "/backend/v3/api/sites",
            Body::from(
                r#"{"siteCode":"acme-relay","siteName":"Acme Relay","displayName":"Acme Relay","baseUrl":"https://relay.example.com","status":"active"}"#,
            ),
        ),
    )
    .await;
    assert_eq!("2000", create_site_payload["code"]);
    assert_eq!(
        "acme_relay",
        create_site_payload["data"]["item"]["siteCode"]
    );
    let site_id = create_site_payload["data"]["item"]["id"]
        .as_str()
        .unwrap()
        .to_owned();

    let channels_payload = request_json(
        router.clone(),
        app_session_request(
            "GET",
            &format!("/backend/v3/api/sites/{site_id}/channels"),
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", channels_payload["code"]);
    assert_eq!(
        0,
        channels_payload["data"]["items"].as_array().unwrap().len()
    );

    let test_payload = request_json(
        router.clone(),
        app_session_request(
            "POST",
            &format!("/backend/v3/api/sites/{site_id}/test_connection"),
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", test_payload["code"]);
    assert_eq!("success", test_payload["data"]["status"]);
    assert_eq!("healthy", test_payload["data"]["healthStatus"]);

    let health_payload = request_json(
        router.clone(),
        app_session_request(
            "POST",
            &format!("/backend/v3/api/sites/{site_id}/health_check"),
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", health_payload["code"]);
    assert_eq!("success", health_payload["data"]["status"]);

    let refreshed_sites_payload = request_json(
        router.clone(),
        app_session_request("GET", "/backend/v3/api/sites?q=acme", Body::empty()),
    )
    .await;
    assert_eq!(
        "healthy",
        refreshed_sites_payload["data"]["items"][0]["healthStatus"]
    );

    let delete_site_payload = request_json(
        router.clone(),
        app_session_request(
            "DELETE",
            &format!("/backend/v3/api/sites/{site_id}"),
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", delete_site_payload["code"]);
    assert_eq!(true, delete_site_payload["data"]["deleted"]);

    let recreate_payload = request_json(
        router,
        app_session_request(
            "POST",
            "/backend/v3/api/sites",
            Body::from(
                r#"{"siteCode":"acme-relay","siteName":"Acme Relay","displayName":"Acme Relay","baseUrl":"https://relay.example.com","status":"active"}"#,
            ),
        ),
    )
    .await;
    assert_eq!("2000", recreate_payload["code"]);
    assert_eq!("acme_relay", recreate_payload["data"]["item"]["siteCode"]);
}

#[tokio::test]
async fn database_config_router_rejects_missing_api_key_pepper_for_runtime_catalog() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let error = configured_router_from_database_config(
        catalog.database_config().unwrap(),
        None,
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap_err();

    assert!(error
        .to_string()
        .contains("SDKWORK_CLAW_API_KEY_PEPPER is required"));
}

#[tokio::test]
async fn database_config_router_rejects_missing_trusted_subject_secret_for_runtime_catalog() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let error = configured_router_from_database_config(
        catalog.database_config().unwrap(),
        Some(catalog.api_key_security_config().unwrap()),
        None,
        Some(app_session_config()),
    )
    .await
    .unwrap_err();

    assert!(error
        .to_string()
        .contains("SDKWORK_CLAW_TRUSTED_SUBJECT_SECRET is required"));
}

#[tokio::test]
async fn database_config_router_serves_backend_auth_settings() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let default_payload = request_json(
        router.clone(),
        app_session_request("GET", "/backend/v3/api/system/auth/settings", Body::empty()),
    )
    .await;
    assert_eq!("2000", default_payload["code"]);
    assert_eq!("highlights-only", default_payload["data"]["leftRailMode"]);
    assert_eq!(json!(["password"]), default_payload["data"]["loginMethods"]);
    assert_eq!(false, default_payload["data"]["oauthLoginEnabled"]);
    assert_eq!(json!([]), default_payload["data"]["oauthProviders"]);
    assert_eq!(true, default_payload["data"]["qrLoginEnabled"]);
    assert_eq!(
        false,
        default_payload["data"]["verificationPolicy"]["emailRegistrationVerificationRequired"]
    );
    assert_eq!(
        false,
        default_payload["data"]["verificationPolicy"]["phoneRegistrationVerificationRequired"]
    );

    let update_payload = request_json(
        router.clone(),
        app_session_request_builder("PATCH", "/backend/v3/api/system/auth/settings")
            .header("X-Request-Id", "auth-settings-test-1")
            .body(Body::from(
                r#"{"leftRailMode":"auto","loginMethods":["password","emailCode"],"oauthLoginEnabled":false,"oauthProviders":["github"],"oauthRegion":"overseas","qrLoginEnabled":false,"recoveryMethods":["email"],"registerMethods":["email"],"verificationPolicy":{"emailCodeLoginEnabled":true,"emailRegistrationVerificationRequired":true,"phoneCodeLoginEnabled":false,"phoneRegistrationVerificationRequired":false}}"#,
            ))
            .unwrap(),
    )
    .await;
    assert_eq!("2000", update_payload["code"]);
    assert_eq!("auto", update_payload["data"]["leftRailMode"]);
    assert_eq!(false, update_payload["data"]["oauthLoginEnabled"]);
    assert_eq!(false, update_payload["data"]["qrLoginEnabled"]);
    assert_eq!("overseas", update_payload["data"]["oauthRegion"]);
    assert_eq!(
        true,
        update_payload["data"]["verificationPolicy"]["emailRegistrationVerificationRequired"]
    );
    assert_eq!(
        false,
        update_payload["data"]["verificationPolicy"]["phoneRegistrationVerificationRequired"]
    );

    let persisted_payload = request_json(
        router,
        app_session_request("GET", "/backend/v3/api/system/auth/settings", Body::empty()),
    )
    .await;
    assert_eq!("2000", persisted_payload["code"]);
    assert_eq!("auto", persisted_payload["data"]["leftRailMode"]);
    assert_eq!(
        true,
        persisted_payload["data"]["verificationPolicy"]["emailRegistrationVerificationRequired"]
    );

    let pool = create_sqlite_pool(&database_url).await;
    let snapshot_row = sqlx::query(
        r#"
        SELECT request_id, config_payload
        FROM ops_config_snapshot
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND source_table = 'iam_auth_runtime_settings'
        ORDER BY id DESC
        LIMIT 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    let snapshot_request_id: String = snapshot_row.get("request_id");
    assert_server_request_id(&snapshot_request_id, "auth-settings-test-1");
    let snapshot_payload: String = snapshot_row.get("config_payload");
    let snapshot_payload: Value = serde_json::from_str(&snapshot_payload).unwrap();
    assert_eq!("update_auth_settings", snapshot_payload["action"]);
    assert_eq!("github", snapshot_payload["settings"]["oauthProviders"][0]);
    assert_eq!(
        true,
        snapshot_payload["settings"]["verificationPolicy"]["emailRegistrationVerificationRequired"]
    );
    let audit_row = sqlx::query(
        r#"
        SELECT request_id, action
        FROM ops_audit_log
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND action = 'update_auth_settings'
        ORDER BY id DESC
        LIMIT 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        snapshot_request_id,
        audit_row.get::<String, _>("request_id")
    );
    assert_eq!("update_auth_settings", audit_row.get::<String, _>("action"));
}

#[tokio::test]
async fn database_config_router_rejects_empty_backend_auth_setting_method_lists() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            app_session_request_builder("PATCH", "/backend/v3/api/system/auth/settings")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"loginMethods":[]}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload: Value = serde_json::from_slice(
        &axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("4001", payload["code"]);
    assert!(payload["msg"]
        .as_str()
        .unwrap()
        .contains("loginMethods must include at least one item"));
    assert_eq!(None, payload.get("message"));
}

#[tokio::test]
async fn database_config_router_normalizes_backend_auth_setting_cross_field_policy() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let update_payload = request_json(
        router.clone(),
        app_session_request_builder("PATCH", "/backend/v3/api/system/auth/settings")
            .header("X-Request-Id", "auth-settings-normalize-1")
            .body(Body::from(
                r#"{"leftRailMode":"qr-only","qrLoginEnabled":false,"loginMethods":["password","emailCode"],"verificationPolicy":{"emailCodeLoginEnabled":false,"phoneCodeLoginEnabled":true}}"#,
            ))
            .unwrap(),
    )
    .await;
    assert_eq!("2000", update_payload["code"]);
    assert_eq!("highlights-only", update_payload["data"]["leftRailMode"]);
    assert_eq!(
        json!(["password", "phoneCode"]),
        update_payload["data"]["loginMethods"]
    );
    assert_eq!(
        false,
        update_payload["data"]["verificationPolicy"]["emailCodeLoginEnabled"]
    );
    assert_eq!(
        true,
        update_payload["data"]["verificationPolicy"]["phoneCodeLoginEnabled"]
    );

    let persisted_payload = request_json(
        router,
        app_session_request("GET", "/backend/v3/api/system/auth/settings", Body::empty()),
    )
    .await;
    assert_eq!("2000", persisted_payload["code"]);
    assert_eq!("highlights-only", persisted_payload["data"]["leftRailMode"]);
    assert_eq!(
        json!(["password", "phoneCode"]),
        persisted_payload["data"]["loginMethods"]
    );

    let pool = create_sqlite_pool(&database_url).await;
    let snapshot_row = sqlx::query(
        r#"
        SELECT request_id, config_payload
        FROM ops_config_snapshot
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND source_table = 'iam_auth_runtime_settings'
        ORDER BY id DESC
        LIMIT 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    let snapshot_request_id: String = snapshot_row.get("request_id");
    assert_server_request_id(&snapshot_request_id, "auth-settings-normalize-1");
    let snapshot_payload: String = snapshot_row.get("config_payload");
    let snapshot_payload: Value = serde_json::from_str(&snapshot_payload).unwrap();
    assert_eq!("update_auth_settings", snapshot_payload["action"]);
    assert_eq!(
        "highlights-only",
        snapshot_payload["settings"]["leftRailMode"]
    );
    assert_eq!(
        json!(["password", "phoneCode"]),
        snapshot_payload["settings"]["loginMethods"]
    );
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_announcement_crud() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let create_response = router
        .clone()
        .oneshot(app_session_request(
            "POST",
            "/backend/v3/api/content/announcements",
            Body::from(
                r#"{"title":"Gateway maintenance","target":"all","status":"draft","content":"Maintenance window"}"#,
            ),
        ))
        .await
        .unwrap();
    let create_status = create_response.status();
    let create_body = axum::body::to_bytes(create_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let create_body_text = String::from_utf8(create_body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, create_status, "{create_body_text}");
    let create_payload: serde_json::Value = serde_json::from_str(&create_body_text).unwrap();
    assert_eq!("2000", create_payload["code"]);
    assert_eq!("draft", create_payload["data"]["item"]["status"]);
    let announcement_id = create_payload["data"]["item"]["id"]
        .as_str()
        .unwrap()
        .to_owned();

    let update_response = router
        .clone()
        .oneshot(signed_request(
            "PATCH",
            &format!("/backend/v3/api/content/announcements/{announcement_id}"),
            Body::from(r#"{"status":"published","target":"vip"}"#),
        ))
        .await
        .unwrap();
    let update_status = update_response.status();
    let update_body = axum::body::to_bytes(update_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let update_body_text = String::from_utf8(update_body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, update_status, "{update_body_text}");
    let update_payload: serde_json::Value = serde_json::from_str(&update_body_text).unwrap();
    assert_eq!("published", update_payload["data"]["item"]["status"]);
    assert_eq!("vip", update_payload["data"]["item"]["target"]);

    let list_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/content/announcements",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(list_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());

    let delete_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            &format!("/backend/v3/api/content/announcements/{announcement_id}"),
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, delete_response.status());
    let delete_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(delete_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(true, delete_payload["data"]["deleted"]);
}

#[tokio::test]
async fn database_config_router_does_not_expose_admin_notification_management() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/notification/notifications",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NOT_FOUND, response.status());

    let response = router
        .clone()
        .oneshot(app_session_request(
            "POST",
            "/backend/v3/api/notification/notifications",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NOT_FOUND, response.status());
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_channel_crud() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let create_response = router
        .clone()
        .oneshot(app_session_request(
            "POST",
            "/backend/v3/api/channel",
            Body::from(
                r#"{"name":"OpenAI primary","vendor":"OpenAI","protocol":"OpenAI","accessType":"api-key","credentialRotation":"default","credentials":[{"name":"primary","baseUrl":"https://api.openai.com/v1","secretRef":"vault://providers/openai/account/main","priority":1,"weight":100,"status":"active"}],"models":["openai/gpt-4o-mini"],"capabilities":["llm"],"timeoutMs":60000,"retryPolicy":{"maxAttempts":3,"retryableStatusCodes":[429,503],"backoffMs":25},"weight":80,"status":"active"}"#,
            ),
        ))
        .await
        .unwrap();
    let create_status = create_response.status();
    let create_body = axum::body::to_bytes(create_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let create_body_text = String::from_utf8(create_body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, create_status, "{create_body_text}");
    let create_payload: serde_json::Value = serde_json::from_str(&create_body_text).unwrap();
    assert_eq!("2000", create_payload["code"]);
    assert_eq!("OpenAI primary", create_payload["data"]["item"]["name"]);
    assert_eq!("OpenAI", create_payload["data"]["item"]["vendor"]);
    assert_eq!("active", create_payload["data"]["item"]["status"]);
    assert_eq!(60_000, create_payload["data"]["item"]["timeoutMs"]);
    assert_eq!(
        3,
        create_payload["data"]["item"]["retryPolicy"]["maxAttempts"]
    );
    assert_eq!(
        503,
        create_payload["data"]["item"]["retryPolicy"]["retryableStatusCodes"][1]
    );
    assert!(create_payload["data"]["item"].get("authKey").is_none());
    assert_eq!(
        "ref:***main",
        create_payload["data"]["item"]["credentials"][0]["maskedLabel"]
    );
    let channel_id = create_payload["data"]["item"]["id"].as_str().unwrap();

    let update_response = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/channel",
            Body::from(format!(
                r#"{{"id":"{channel_id}","status":"disabled","weight":25,"models":["openai/gpt-4o-mini"],"capabilities":["llm","image"],"timeoutMs":120000,"retryPolicy":null}}"#
            )),
        ))
        .await
        .unwrap();
    let update_status = update_response.status();
    let update_body = axum::body::to_bytes(update_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let update_body_text = String::from_utf8(update_body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, update_status, "{update_body_text}");
    let update_payload: serde_json::Value = serde_json::from_str(&update_body_text).unwrap();
    assert_eq!("disabled", update_payload["data"]["item"]["status"]);
    assert_eq!(25, update_payload["data"]["item"]["weight"]);
    assert_eq!(120_000, update_payload["data"]["item"]["timeoutMs"]);
    assert_eq!("image", update_payload["data"]["item"]["capabilities"][1]);
    assert!(update_payload["data"]["item"].get("retryPolicy").is_none());

    let list_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/channel/list",
            Body::from("{}"),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(list_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    let listed_items = list_payload["data"]["items"].as_array().unwrap();
    let listed_channel = listed_items
        .iter()
        .find(|item| item["id"].as_str() == Some(channel_id))
        .expect("created channel should be returned by admin channel list");
    assert_eq!("disabled", listed_channel["status"]);
    assert_eq!(120_000, listed_channel["timeoutMs"]);
    assert!(listed_channel.get("retryPolicy").is_none());

    let delete_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            &format!("/backend/v3/api/channel/{channel_id}"),
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, delete_response.status());
    let delete_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(delete_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(true, delete_payload["data"]["deleted"]);
}

#[tokio::test]
async fn database_config_router_admin_channel_test_runs_real_provider_probe_and_records_health() {
    let captured = Arc::new(Mutex::new(Vec::<CapturedProviderHealthProbe>::new()));
    let provider = Router::new()
        .route("/v1/chat/completions", post(capture_provider_health_probe))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let secret_ref = "vault://providers/openai/account/main";
    let router = configured_router_with_provider_secret_map(
        &database_url,
        ProviderSecretMapConfig::from_json(
            json!({secret_ref: "sk-admin-provider-health-probe-secret"}).to_string(),
        )
        .unwrap(),
    )
    .await;

    let create_payload = request_json(
        router.clone(),
        app_session_request(
            "POST",
            "/backend/v3/api/channel",
            Body::from(format!(
                r#"{{"name":"OpenAI primary","vendor":"OpenAI","protocol":"OpenAI","accessType":"api-key","credentialRotation":"default","credentials":[{{"name":"primary","baseUrl":"http://{addr}","secretRef":"{secret_ref}","priority":1,"weight":100,"status":"active"}}],"models":["openai/gpt-4o-mini"],"capabilities":["llm"],"timeoutMs":60000,"weight":80,"status":"active"}}"#
            )),
        ),
    )
    .await;
    assert_eq!("2000", create_payload["code"]);
    let channel_id = create_payload["data"]["item"]["id"].as_str().unwrap();

    let (status, test_payload, body_text) = request_json_with_status(
        router,
        app_session_request_builder(
            "POST",
            &format!("/backend/v3/api/channel/{channel_id}/test"),
        )
        .header("X-Request-Id", "admin-channel-probe-success-1")
        .body(Body::empty())
        .unwrap(),
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!("2000", test_payload["code"]);
    assert_eq!(true, test_payload["data"]["success"]);
    assert_eq!(channel_id, test_payload["data"]["channelId"]);
    assert_eq!("active", test_payload["data"]["status"]);
    let latency = test_payload["data"]["latency"].as_str().unwrap();
    assert!(
        latency.ends_with("ms"),
        "latency must be a measured provider probe duration"
    );
    assert!(!body_text.contains(secret_ref));
    assert!(!body_text.contains("sk-admin-provider-health-probe-secret"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-admin-provider-health-probe-secret".to_owned()),
        captured[0].authorization
    );
    assert_eq!("gpt-4o-mini", captured[0].body["model"]);
    assert_eq!("ping", captured[0].body["messages"][0]["content"]);
    drop(captured);

    let verification_pool = create_sqlite_pool(&database_url).await;
    let row = sqlx::query(
        r#"
        SELECT request_id, health_status, latency_ms, http_status, error_code, error_message_masked
        FROM integration_provider_health_snapshot
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND channel_id = ?
        ORDER BY id DESC
        LIMIT 1
        "#,
    )
    .bind(channel_id)
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    assert_server_request_id(
        &row.get::<String, _>("request_id"),
        "admin-channel-probe-success-1",
    );
    assert_eq!(1_i64, row.get::<i64, _>("health_status"));
    assert!(row.get::<i64, _>("latency_ms") > 0);
    assert_eq!(200_i64, row.get::<i64, _>("http_status"));
    assert_eq!(None, row.get::<Option<String>, _>("error_code"));
    assert_eq!(None, row.get::<Option<String>, _>("error_message_masked"));

    let channel_state = sqlx::query(
        "SELECT health_status, last_latency_ms, consecutive_error_count FROM ai_channel WHERE id = ?",
    )
    .bind(channel_id)
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    assert_eq!(1_i64, channel_state.get::<i64, _>("health_status"));
    assert!(channel_state.get::<i64, _>("last_latency_ms") > 0);
    assert_eq!(
        0_i64,
        channel_state.get::<i64, _>("consecutive_error_count")
    );
    let channel_secret_error_count: i64 = sqlx::query_scalar(
        r#"
        SELECT consecutive_error_count
        FROM ai_channel
        WHERE id = ?
        "#,
    )
    .bind(channel_id)
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    verification_pool.close().await;
    assert_eq!(0, channel_secret_error_count);
}

#[tokio::test]
async fn database_config_router_admin_channel_test_records_masked_provider_failure() {
    let captured = Arc::new(Mutex::new(Vec::<CapturedProviderHealthProbe>::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(
                |State(captured): State<Arc<Mutex<Vec<CapturedProviderHealthProbe>>>>,
                 headers: HeaderMap,
                 Json(body): Json<Value>| async move {
                    captured.lock().unwrap().push(CapturedProviderHealthProbe {
                        authorization: headers
                            .get("authorization")
                            .and_then(|value| value.to_str().ok())
                            .map(str::to_owned),
                        body,
                    });
                    (
                        StatusCode::UNAUTHORIZED,
                        Json(json!({
                            "error": {
                                "code": "invalid_api_key",
                                "message": "bad upstream key sk-admin-provider-health-probe-secret"
                            }
                        })),
                    )
                },
            ),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let secret_ref = "vault://providers/openai/account/main";
    let router = configured_router_with_provider_secret_map(
        &database_url,
        ProviderSecretMapConfig::from_json(
            json!({secret_ref: "sk-admin-provider-health-probe-secret"}).to_string(),
        )
        .unwrap(),
    )
    .await;

    let create_payload = request_json(
        router.clone(),
        app_session_request(
            "POST",
            "/backend/v3/api/channel",
            Body::from(format!(
                r#"{{"name":"OpenAI primary","vendor":"OpenAI","protocol":"OpenAI","accessType":"api-key","credentialRotation":"default","credentials":[{{"name":"primary","baseUrl":"http://{addr}","secretRef":"{secret_ref}","priority":1,"weight":100,"status":"active"}}],"models":["openai/gpt-4o-mini"],"capabilities":["llm"],"timeoutMs":60000,"weight":80,"status":"active"}}"#
            )),
        ),
    )
    .await;
    assert_eq!("2000", create_payload["code"]);
    let channel_id = create_payload["data"]["item"]["id"].as_str().unwrap();

    let verification_pool = create_sqlite_pool(&database_url).await;
    sqlx::query("UPDATE ai_channel SET consecutive_error_count = 4 WHERE id = ?")
        .bind(channel_id)
        .execute(&verification_pool)
        .await
        .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_channel
        SET consecutive_error_count = 5
        WHERE id = ?
        "#,
    )
    .bind(channel_id)
    .execute(&verification_pool)
    .await
    .unwrap();
    verification_pool.close().await;

    let (status, test_payload, body_text) = request_json_with_status(
        router,
        app_session_request_builder(
            "POST",
            &format!("/backend/v3/api/channel/{channel_id}/test"),
        )
        .header("X-Request-Id", "admin-channel-probe-failure-1")
        .body(Body::empty())
        .unwrap(),
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!("2000", test_payload["code"]);
    assert_eq!(false, test_payload["data"]["success"]);
    assert_eq!(channel_id, test_payload["data"]["channelId"]);
    assert_eq!("error", test_payload["data"]["status"]);
    assert!(test_payload["data"]["latency"]
        .as_str()
        .unwrap()
        .ends_with("ms"));
    assert!(!body_text.contains(secret_ref));
    assert!(!body_text.contains("sk-admin-provider-health-probe-secret"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-admin-provider-health-probe-secret".to_owned()),
        captured[0].authorization
    );
    drop(captured);

    let verification_pool = create_sqlite_pool(&database_url).await;
    let row = sqlx::query(
        r#"
        SELECT request_id, health_status, latency_ms, http_status, error_code, error_message_masked
        FROM integration_provider_health_snapshot
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND channel_id = ?
        ORDER BY id DESC
        LIMIT 1
        "#,
    )
    .bind(channel_id)
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    assert_server_request_id(
        &row.get::<String, _>("request_id"),
        "admin-channel-probe-failure-1",
    );
    assert_eq!(2_i64, row.get::<i64, _>("health_status"));
    assert!(row.get::<i64, _>("latency_ms") > 0);
    assert_eq!(401_i64, row.get::<i64, _>("http_status"));
    assert_eq!(
        Some("upstream_http_401".to_owned()),
        row.get::<Option<String>, _>("error_code")
    );
    let error_message = row
        .get::<Option<String>, _>("error_message_masked")
        .unwrap();
    assert!(error_message.contains("upstream health probe returned HTTP 401"));
    assert!(!error_message.contains("sk-admin-provider-health-probe-secret"));

    let channel_errors: i64 =
        sqlx::query_scalar("SELECT consecutive_error_count FROM ai_channel WHERE id = ?")
            .bind(channel_id)
            .fetch_one(&verification_pool)
            .await
            .unwrap();
    let channel_secret_error_count: i64 = sqlx::query_scalar(
        r#"
        SELECT consecutive_error_count
        FROM ai_channel
        WHERE id = ?
        "#,
    )
    .bind(channel_id)
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    verification_pool.close().await;
    assert_eq!(6, channel_errors);
    assert_eq!(6, channel_secret_error_count);
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_provider_secret_crud_without_plaintext() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let create_response = router
        .clone()
        .oneshot(app_session_request(
            "POST",
            "/backend/v3/api/provider_secrets",
            Body::from(
                r#"{"providerCode":"OpenAI","name":"OpenAI production","secretRef":"vault://providers/openai/account/main","authType":"api-key"}"#,
            ),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(create_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("2000", create_payload["code"]);
    assert_eq!("openai", create_payload["data"]["item"]["providerCode"]);
    assert_eq!("ref:***main", create_payload["data"]["item"]["maskedLabel"]);
    assert!(create_payload["data"]["item"].get("secretHash").is_none());
    assert!(create_payload["data"]["item"].get("secretValue").is_none());
    assert!(create_payload["data"]["item"].get("apiKey").is_none());
    let provider_secret_id = create_payload["data"]["item"]["id"].as_str().unwrap();

    let update_response = router
        .clone()
        .oneshot(signed_request(
            "PUT",
            "/backend/v3/api/provider_secrets",
            Body::from(format!(
                r#"{{"id":"{provider_secret_id}","name":"OpenAI rotated","secretRef":"vault://providers/openai/account/rotated","status":"disabled"}}"#
            )),
        ))
        .await
        .unwrap();
    let update_status = update_response.status();
    let update_body = axum::body::to_bytes(update_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let update_body_text = String::from_utf8(update_body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, update_status, "{update_body_text}");
    let update_payload: serde_json::Value = serde_json::from_str(&update_body_text).unwrap();
    assert_eq!("OpenAI rotated", update_payload["data"]["item"]["name"]);
    assert_eq!(
        "ref:***rotated",
        update_payload["data"]["item"]["maskedLabel"]
    );
    assert_eq!("disabled", update_payload["data"]["item"]["status"]);

    let list_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/provider_secrets/list",
            Body::from(r#"{"providerCode":"openai"}"#),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(list_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("disabled", list_payload["data"]["items"][0]["status"]);

    let delete_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            &format!("/backend/v3/api/provider_secrets/{provider_secret_id}"),
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, delete_response.status());
    let delete_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(delete_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(true, delete_payload["data"]["deleted"]);
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_channel_group_crud() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;
    let expected_create_name = format!("{} enterprise", "\u{4e2d}\u{6587}");

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let create_response = router
        .clone()
        .oneshot(app_session_request(
            "POST",
            "/backend/v3/api/ai/channel_groups",
            Body::from(
                r#"{"groupName":"\u4e2d\u6587 enterprise","groupCode":"zh-enterprise","priceReferenceMode":"multiplier","rateMultiplier":1.25,"groupType":"dedicated","capacity":{"total":500},"status":"active"}"#,
            ),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(create_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("2000", create_payload["code"]);
    assert_eq!(
        expected_create_name,
        create_payload["data"]["item"]["groupName"]
            .as_str()
            .unwrap()
    );
    assert_eq!("zh-enterprise", create_payload["data"]["item"]["groupCode"]);
    assert_eq!("openai", create_payload["data"]["item"]["providerCode"]);
    assert_eq!(
        "multiplier",
        create_payload["data"]["item"]["priceReferenceMode"]
    );
    assert_eq!(1.25, create_payload["data"]["item"]["rateMultiplier"]);
    assert_eq!(
        1.0,
        create_payload["data"]["item"]["officialPriceMultiplier"]
    );
    assert_eq!("dedicated", create_payload["data"]["item"]["groupType"]);
    assert_eq!(500.0, create_payload["data"]["item"]["capacity"]["total"]);
    assert_eq!("active", create_payload["data"]["item"]["status"]);
    let group_id = create_payload["data"]["item"]["id"].as_str().unwrap();

    let update_response = router
        .clone()
        .oneshot(signed_request(
            "PATCH",
            &format!("/backend/v3/api/ai/channel_groups/{group_id}"),
            Body::from(
                r#"{"groupName":"OpenAI dedicated","priceReferenceMode":"official_price","officialPriceMultiplier":1.5,"capacity":{"total":750},"status":"disabled"}"#,
            ),
        ))
        .await
        .unwrap();
    let update_status = update_response.status();
    let update_body = axum::body::to_bytes(update_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let update_body_text = String::from_utf8(update_body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, update_status, "{update_body_text}");
    let update_payload: serde_json::Value = serde_json::from_str(&update_body_text).unwrap();
    assert_eq!(
        "OpenAI dedicated",
        update_payload["data"]["item"]["groupName"]
    );
    assert_eq!(
        "official_price",
        update_payload["data"]["item"]["priceReferenceMode"]
    );
    assert_eq!(1.0, update_payload["data"]["item"]["rateMultiplier"]);
    assert_eq!(
        1.5,
        update_payload["data"]["item"]["officialPriceMultiplier"]
    );
    assert_eq!(750.0, update_payload["data"]["item"]["capacity"]["total"]);
    assert_eq!("dedicated", update_payload["data"]["item"]["groupType"]);
    assert_eq!("disabled", update_payload["data"]["item"]["status"]);

    let list_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/ai/channel_groups",
            Body::empty(),
        ))
        .await
        .unwrap();
    let list_status = list_response.status();
    let list_body = axum::body::to_bytes(list_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let list_body_text = String::from_utf8(list_body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, list_status, "{list_body_text}");
    let list_payload: serde_json::Value = serde_json::from_str(&list_body_text).unwrap();
    let list_items = list_payload["data"]["items"].as_array().unwrap();
    let listed_group = list_items
        .iter()
        .find(|item| item["id"].as_str() == Some(group_id))
        .expect("created channel group should be returned by admin channel group list");
    assert_eq!("zh-enterprise", listed_group["groupCode"]);
    assert_eq!("openai", listed_group["providerCode"]);
    assert_eq!("disabled", listed_group["status"]);

    let delete_response = router
        .clone()
        .oneshot(signed_request(
            "DELETE",
            &format!("/backend/v3/api/ai/channel_groups/{group_id}"),
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, delete_response.status());
    let delete_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(delete_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(true, delete_payload["data"]["deleted"]);

    let final_list_response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/ai/channel_groups",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, final_list_response.status());
    let final_list_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(final_list_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    let final_items = final_list_payload["data"]["items"].as_array().unwrap();
    assert!(
        final_items
            .iter()
            .all(|item| item["id"].as_str() != Some(group_id)),
        "deleted channel group must not be returned by admin channel group list"
    );
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_ip_rate_limit_create_and_list() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;
    let expected_name = format!("{} crawler guard", "\u{4e2d}\u{6587}");

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let create_response = router
        .clone()
        .oneshot(app_session_request(
            "POST",
            "/backend/v3/api/router/rate_limits/ip",
            Body::from(
                r#"{"ruleName":"\u4e2d\u6587 crawler guard","targetIp":"10.10.10.9/24","rps":12,"rpm":360,"blockDuration":"15m"}"#,
            ),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(create_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("2000", create_payload["code"]);
    assert_eq!(
        expected_name,
        create_payload["data"]["item"]["ruleName"].as_str().unwrap()
    );
    assert_eq!("10.10.10.0/24", create_payload["data"]["item"]["targetIp"]);
    assert_eq!(12, create_payload["data"]["item"]["rps"]);
    assert_eq!(360, create_payload["data"]["item"]["rpm"]);
    assert_eq!("15m", create_payload["data"]["item"]["blockDuration"]);
    assert_eq!("active", create_payload["data"]["item"]["status"]);

    let list_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/router/rate_limits/ip",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(list_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!(
        "10.10.10.0/24",
        list_payload["data"]["items"][0]["targetIp"]
    );

    let update_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/router/rate_limits/ip",
            Body::from(
                r#"{"ruleName":"Crawler guard updated","targetIp":"10.10.10.88/24","rps":25,"rpm":600,"blockDuration":"1h","status":"inactive"}"#,
            ),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, update_response.status());
    let update_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(update_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("2000", update_payload["code"]);
    assert_eq!(
        create_payload["data"]["item"]["id"],
        update_payload["data"]["item"]["id"]
    );
    assert_eq!(
        "Crawler guard updated",
        update_payload["data"]["item"]["ruleName"]
    );
    assert_eq!("10.10.10.0/24", update_payload["data"]["item"]["targetIp"]);
    assert_eq!(25, update_payload["data"]["item"]["rps"]);
    assert_eq!(600, update_payload["data"]["item"]["rpm"]);
    assert_eq!("1h", update_payload["data"]["item"]["blockDuration"]);
    assert_eq!("inactive", update_payload["data"]["item"]["status"]);

    let final_list_payload = request_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/router/rate_limits/ip",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!(
        1,
        final_list_payload["data"]["items"]
            .as_array()
            .unwrap()
            .len()
    );
    assert_eq!(
        "Crawler guard updated",
        final_list_payload["data"]["items"][0]["ruleName"]
    );
    assert_eq!(25, final_list_payload["data"]["items"][0]["rps"]);
    assert_eq!("inactive", final_list_payload["data"]["items"][0]["status"]);
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_api_key_rate_limit_create_and_list() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let create_response = router
        .clone()
        .oneshot(app_session_request(
            "POST",
            "/backend/v3/api/router/rate_limits/api_keys",
            Body::from(r#"{"keyPrefix":"sk-test","user":"30","rps":7,"rpd":1200,"burst":14}"#),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(create_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("2000", create_payload["code"]);
    assert_eq!("sk-test", create_payload["data"]["item"]["keyPrefix"]);
    assert_eq!("30", create_payload["data"]["item"]["user"]);
    assert_eq!(7, create_payload["data"]["item"]["rps"]);
    assert_eq!(1200, create_payload["data"]["item"]["rpd"]);
    assert_eq!(14, create_payload["data"]["item"]["burst"]);
    assert_eq!("active", create_payload["data"]["item"]["status"]);

    let list_response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/router/rate_limits/api_keys",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(list_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("sk-test", list_payload["data"]["items"][0]["keyPrefix"]);
    assert_eq!(1200, list_payload["data"]["items"][0]["rpd"]);
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_model_rate_limit_create_and_list() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let create_response = router
        .clone()
        .oneshot(app_session_request(
            "POST",
            "/backend/v3/api/system/rate_limits/models",
            Body::from(
                r#"{"model":"gpt-4o-mini","channelGroup":"standard-group","rpm":600,"tpm":120000}"#,
            ),
        ))
        .await
        .unwrap();
    let create_status = create_response.status();
    let create_body = axum::body::to_bytes(create_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let create_body_text = String::from_utf8(create_body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, create_status, "{create_body_text}");
    let create_payload: serde_json::Value = serde_json::from_str(&create_body_text).unwrap();
    assert_eq!("2000", create_payload["code"]);
    assert_eq!("gpt-4o-mini", create_payload["data"]["item"]["model"]);
    assert_eq!(
        "standard-group",
        create_payload["data"]["item"]["channelGroup"]
    );
    assert_eq!(600, create_payload["data"]["item"]["rpm"]);
    assert_eq!(120000, create_payload["data"]["item"]["tpm"]);
    assert_eq!("active", create_payload["data"]["item"]["status"]);

    let list_response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/rate_limits/models",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(list_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("gpt-4o-mini", list_payload["data"]["items"][0]["model"]);
    assert_eq!(
        "standard-group",
        list_payload["data"]["items"][0]["channelGroup"]
    );
    assert_eq!(600, list_payload["data"]["items"][0]["rpm"]);
    assert_eq!(120000, list_payload["data"]["items"][0]["tpm"]);
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_firewall_rule_crud() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    pool.close().await;
    let expected_reason = format!("{} crawler source", "\u{4e2d}\u{6587}");

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let create_response = router
        .clone()
        .oneshot(app_session_request(
            "POST",
            "/backend/v3/api/router/firewall/rules",
            Body::from(
                r#"{"type":"IP blacklist","value":"10.10.10.9/24","reason":"\u4e2d\u6587 crawler source"}"#,
            ),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(create_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("2000", create_payload["code"]);
    assert_eq!("IP blacklist", create_payload["data"]["item"]["type"]);
    assert_eq!("10.10.10.0/24", create_payload["data"]["item"]["value"]);
    assert_eq!(
        expected_reason,
        create_payload["data"]["item"]["reason"].as_str().unwrap()
    );
    assert!(create_payload["data"]["item"]["time"]
        .as_str()
        .unwrap()
        .contains('-'));
    let rule_id = create_payload["data"]["item"]["id"].as_str().unwrap();

    let list_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/router/firewall/rules",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(list_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(1, list_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("10.10.10.0/24", list_payload["data"]["items"][0]["value"]);

    let update_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/router/firewall/rules",
            Body::from(
                r#"{"type":"IP blacklist","value":"10.10.10.88/24","reason":"Crawler source updated"}"#,
            ),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, update_response.status());
    let update_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(update_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("2000", update_payload["code"]);
    assert_eq!(
        create_payload["data"]["item"]["id"],
        update_payload["data"]["item"]["id"]
    );
    assert_eq!("IP blacklist", update_payload["data"]["item"]["type"]);
    assert_eq!("10.10.10.0/24", update_payload["data"]["item"]["value"]);
    assert_eq!(
        "Crawler source updated",
        update_payload["data"]["item"]["reason"]
    );

    let updated_list_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/router/firewall/rules",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, updated_list_response.status());
    let updated_list_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(updated_list_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(
        1,
        updated_list_payload["data"]["items"]
            .as_array()
            .unwrap()
            .len()
    );
    assert_eq!(
        "Crawler source updated",
        updated_list_payload["data"]["items"][0]["reason"]
    );

    let delete_path = format!("/backend/v3/api/router/firewall/rules/{rule_id}");
    let delete_response = router
        .clone()
        .oneshot(signed_request("DELETE", &delete_path, Body::empty()))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, delete_response.status());
    let delete_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(delete_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(true, delete_payload["data"]["deleted"]);

    let final_list_response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/router/firewall/rules",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, final_list_response.status());
    let final_list_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(final_list_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(
        0,
        final_list_payload["data"]["items"]
            .as_array()
            .unwrap()
            .len()
    );
}

#[tokio::test]
async fn database_config_router_serves_backend_sdk_contract_aliases() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    seed_monitoring(&pool).await;
    seed_admin_users(&pool).await;
    seed_admin_record(&pool).await;
    seed_admin_marketing(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    for path in [
        "/backend/v3/api/system/monitor/nodes",
        "/backend/v3/api/system/monitor/alerts",
        "/backend/v3/api/system/monitor/performance",
        "/backend/v3/api/system/dashboard/admin/overview",
        "/backend/v3/api/system/rate_limits/ip",
        "/backend/v3/api/system/rate_limits/api_keys",
        "/backend/v3/api/system/rate_limits/models",
        "/backend/v3/api/system/firewalls/rules",
        "/backend/v3/api/ai/channel_groups",
        "/backend/v3/api/integration/channels",
        "/backend/v3/api/integration/provider_secrets",
        "/backend/v3/api/platform/apps",
        "/backend/v3/api/billing/referrals/stats",
    ] {
        let response = router
            .clone()
            .oneshot(signed_request("GET", path, Body::empty()))
            .await
            .unwrap();
        let status = response.status();
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let body_text = String::from_utf8(body.to_vec()).unwrap();
        assert_eq!(StatusCode::OK, status, "{path}: {body_text}");
        let payload: serde_json::Value = serde_json::from_str(&body_text).unwrap();
        assert_eq!("2000", payload["code"], "{path}");
        if path == "/backend/v3/api/system/dashboard/admin/overview" {
            assert!(
                payload["data"]["userConsumption"].is_array(),
                "{path} must expose userConsumption"
            );
            assert!(
                payload["data"]["multimodal"].is_array(),
                "{path} must expose multimodal"
            );
            assert!(
                payload["data"]["traffic"].is_array(),
                "{path} must expose traffic"
            );
            assert!(
                payload["data"]["modelDistribution"].is_array(),
                "{path} must expose modelDistribution"
            );
            assert!(
                payload["data"]["recentUsage"].is_array(),
                "{path} must expose recentUsage"
            );
        }
    }
}

#[tokio::test]
async fn database_config_router_does_not_serve_appbase_backend_iam_dependency_routes_locally() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    seed_admin_users(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    for (method, path) in [
        ("GET", "/backend/v3/api/iam/users"),
        ("POST", "/backend/v3/api/iam/users"),
        ("PATCH", "/backend/v3/api/iam/users/30"),
        ("GET", "/backend/v3/api/iam/api_keys"),
        ("GET", "/backend/v3/api/iam/organizations"),
        ("POST", "/backend/v3/api/iam/organizations"),
        ("GET", "/backend/v3/api/iam/organizations/tree"),
        ("POST", "/backend/v3/api/iam/departments"),
        ("GET", "/backend/v3/api/iam/departments/tree"),
        ("GET", "/backend/v3/api/iam/roles"),
        ("GET", "/backend/v3/api/iam/permissions"),
        ("GET", "/backend/v3/api/iam/roles/role-admin/permissions"),
        ("GET", "/backend/v3/api/iam/oauth/provider_catalog"),
    ] {
        let response = router
            .clone()
            .oneshot(signed_request(method, path, Body::empty()))
            .await
            .unwrap();
        let status = response.status();
        assert_ne!(StatusCode::OK, status, "{method} {path}");
    }
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_admin_dashboard_overview() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    seed_admin_users(&pool).await;
    seed_admin_record(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/system/dashboard/admin/overview",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();

    assert_eq!("2000", payload["code"]);
    assert_eq!(
        "owner@example.com",
        payload["data"]["userConsumption"][0]["name"]
    );
    assert_eq!(0.0123, payload["data"]["userConsumption"][0]["value"]);
    assert_eq!("text", payload["data"]["multimodal"][0]["name"]);
    assert_eq!(1.0, payload["data"]["multimodal"][0]["value"]);
    assert_eq!("2026-04-29", payload["data"]["traffic"][0]["time"]);
    assert_eq!(1628.0, payload["data"]["traffic"][0]["tokens"]);
    assert_eq!(1.0, payload["data"]["traffic"][0]["requests"]);
    assert_eq!(0.0123, payload["data"]["traffic"][0]["cost"]);
    assert_eq!(
        "gpt-4o-mini",
        payload["data"]["modelDistribution"][0]["name"]
    );
    assert_eq!("trace-100", payload["data"]["recentUsage"][0]["id"]);
    assert_eq!(
        "owner@example.com",
        payload["data"]["recentUsage"][0]["user"]
    );
    assert_eq!(true, payload["data"]["recentUsage"][0]["isApiUser"]);
    assert_eq!("gpt-4o-mini", payload["data"]["recentUsage"][0]["model"]);
    assert_eq!("usage", payload["data"]["recentUsage"][0]["billingMode"]);
    assert_eq!(1200.0, payload["data"]["recentUsage"][0]["usageIn"]);
    assert_eq!(300.0, payload["data"]["recentUsage"][0]["usageOut"]);
    assert_eq!(1.0, payload["data"]["recentUsage"][0]["usageCount"]);
    assert_eq!("success", payload["data"]["recentUsage"][0]["status"]);
    assert_eq!("0.012300", payload["data"]["recentUsage"][0]["cost"]);
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_monitor_reads() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    seed_monitoring(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let nodes_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/router/monitor/nodes",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, nodes_response.status());
    let nodes_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(nodes_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("2000", nodes_payload["code"]);
    assert_eq!("gw-shanghai-01", nodes_payload["data"]["items"][0]["name"]);
    assert_eq!("cn-shanghai", nodes_payload["data"]["items"][0]["region"]);
    assert_eq!("warning", nodes_payload["data"]["items"][0]["status"]);
    assert_eq!(72.5, nodes_payload["data"]["items"][0]["cpu"]);
    assert_eq!(63.0, nodes_payload["data"]["items"][0]["memory"]);

    let alerts_response = router
        .clone()
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/router/monitor/alerts",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, alerts_response.status());
    let alerts_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(alerts_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("critical", alerts_payload["data"]["items"][0]["severity"]);
    assert_eq!("active", alerts_payload["data"]["items"][0]["status"]);
    assert_eq!("gateway", alerts_payload["data"]["items"][0]["source"]);

    let performance_response = router
        .oneshot(signed_request(
            "GET",
            "/backend/v3/api/router/monitor/performance",
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, performance_response.status());
    let performance_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(performance_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(
        2,
        performance_payload["data"]["items"]
            .as_array()
            .unwrap()
            .len()
    );
    assert_eq!("09:00", performance_payload["data"]["items"][0]["time"]);
    assert_eq!(41.0, performance_payload["data"]["items"][0]["cpu"]);
    assert_eq!(58.0, performance_payload["data"]["items"][0]["memory"]);
    assert_eq!(122.0, performance_payload["data"]["items"][0]["network"]);
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_product_owned_backend_iam_api_key_commands() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    seed_admin_users(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    for (method, path, body) in [
        ("POST", "/backend/v3/api/user/list", Body::from("{}")),
        ("POST", "/backend/v3/api/apikey/list", Body::from("{}")),
        ("POST", "/backend/v3/api/user", Body::from("{}")),
        (
            "POST",
            "/backend/v3/api/billing/users/30/balance_adjustments",
            Body::from(r#"{"amount":5,"type":"recharge"}"#),
        ),
    ] {
        let response = router
            .clone()
            .oneshot(signed_request(method, path, body))
            .await
            .unwrap();
        assert_ne!(StatusCode::OK, response.status(), "{method} {path}");
    }

    let create_key_response = router
        .clone()
        .oneshot(signed_request(
            "POST",
            "/backend/v3/api/iam/api_keys",
            Body::from(r#"{"userId":30,"name":"Console Key"}"#),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, create_key_response.status());
    let create_key_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(create_key_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("Console Key", create_key_payload["data"]["key"]["name"]);
    assert!(create_key_payload["data"]["rawKey"]
        .as_str()
        .unwrap()
        .starts_with("sk-claw-"));
    let api_key_id = create_key_payload["data"]["key"]["id"]
        .as_i64()
        .expect("created api key id must be numeric");

    let delete_key_response = router
        .oneshot(signed_request(
            "DELETE",
            format!("/backend/v3/api/iam/api_keys/{api_key_id}").as_str(),
            Body::empty(),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, delete_key_response.status());
    let delete_key_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(delete_key_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(true, delete_key_payload["data"]["deleted"]);
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_admin_marketing() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    seed_admin_users(&pool).await;
    seed_admin_marketing(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let offers_payload = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/promotions/offers", Body::empty()),
    )
    .await;
    assert_eq!("2000", offers_payload["code"]);
    assert_eq!("Welcome credit", offers_payload["data"]["items"][0]["name"]);
    assert_eq!("coupon", offers_payload["data"]["items"][0]["offer_type"]);
    assert!(offers_payload["data"]["items"][0]["offer_no"]
        .as_str()
        .unwrap()
        .starts_with("offer-"));

    let stocks_payload = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/promotions/coupon_stocks",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("Welcome stock", stocks_payload["data"]["items"][0]["name"]);
    assert_eq!(2, stocks_payload["data"]["items"][0]["total_quantity"]);

    let promo_payload = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/promotions/codes", Body::empty()),
    )
    .await;
    assert_eq!(
        "0002",
        promo_payload["data"]["items"][0]["promotion_code_last4"]
    );
    assert_eq!(
        "stock-welcome-001",
        promo_payload["data"]["items"][0]["stock_id"]
    );
    assert!(!promo_payload["data"]["items"][0]
        .as_object()
        .unwrap()
        .contains_key("code_batch_no"));
    assert_eq!("used", promo_payload["data"]["items"][0]["status"]);
    assert_eq!(
        "owner@example.com",
        promo_payload["data"]["items"][0]["owner_user_id"]
    );

    let invalid_reopen_response = router
        .clone()
        .oneshot(signed_request(
            "PATCH",
            "/backend/v3/api/promotions/codes/502/status",
            Body::from(r#"{"status":"available"}"#),
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::CONFLICT, invalid_reopen_response.status());
    let invalid_reopen_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(invalid_reopen_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!("4090", invalid_reopen_payload["code"]);
    assert!(invalid_reopen_payload["msg"]
        .as_str()
        .unwrap()
        .contains("used promotion code cannot be reopened"));

    let promo_after_invalid_update = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/promotions/codes", Body::empty()),
    )
    .await;
    assert_eq!(
        "used",
        promo_after_invalid_update["data"]["items"][0]["status"]
    );
    assert_eq!(
        "owner@example.com",
        promo_after_invalid_update["data"]["items"][0]["owner_user_id"]
    );

    let redemptions_payload = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/promotions/codes/redemptions",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!(
        "0002",
        redemptions_payload["data"]["items"][0]["submitted_code_suffix"]
    );
    assert_eq!(
        "succeeded",
        redemptions_payload["data"]["items"][0]["result_status"]
    );

    let recharges_payload = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/billing/recharges/records",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!(
        "recharge-100",
        recharges_payload["data"]["items"][0]["tradeNo"]
    );
    assert_eq!(
        "1000",
        recharges_payload["data"]["items"][0]["usd_credited"]
    );

    let recharge_payload = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/billing/recharges/records/recharge-100",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("recharge-100", recharge_payload["data"]["item"]["tradeNo"]);
    assert_eq!("30", recharge_payload["data"]["item"]["userId"]);
    assert_eq!("success", recharge_payload["data"]["item"]["status"]);

    let recharge_packages_payload = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/recharges/packages", Body::empty()),
    )
    .await;
    assert_eq!(
        "10.00",
        recharge_packages_payload["data"]["items"][0]["priceAmount"]
    );
    assert_eq!(
        "CNY",
        recharge_packages_payload["data"]["items"][0]["currencyCode"]
    );
    assert_eq!(
        25,
        recharge_packages_payload["data"]["items"][0]["bonusPoints"]
    );
    assert_eq!(
        125,
        recharge_packages_payload["data"]["items"][0]["grantAmount"]
    );
    assert_eq!(125, recharge_packages_payload["data"]["items"][0]["points"]);

    let recharge_settings_payload = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/recharges/settings", Body::empty()),
    )
    .await;
    assert_eq!("2000", recharge_settings_payload["code"]);
    assert_eq!("CNY", recharge_settings_payload["data"]["baseCurrencyCode"]);
    assert_eq!("10", recharge_settings_payload["data"]["basePointsPerCny"]);
    assert_eq!(
        "1",
        recharge_settings_payload["data"]["currencyToCnyRates"]["CNY"]
    );
    assert_eq!(
        "7",
        recharge_settings_payload["data"]["currencyToCnyRates"]["USD"]
    );

    let exchange_rules_payload = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/billing/exchange_rules?source_asset_type=points&target_asset_type=cash&status=active",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", exchange_rules_payload["code"]);
    assert_eq!("exchange-1", exchange_rules_payload["data"][0]["id"]);
    assert_eq!(
        "POINTS",
        exchange_rules_payload["data"][0]["sourceAssetType"]
    );
    assert_eq!("CASH", exchange_rules_payload["data"][0]["targetAssetType"]);
    assert_eq!("120", exchange_rules_payload["data"][0]["rate"]);
    assert_eq!("active", exchange_rules_payload["data"][0]["status"]);

    let update_exchange_rule_payload = request_json(
        router.clone(),
        signed_request_with_header(
            "PUT",
            "/backend/v3/api/billing/exchange_rules",
            Body::from(
                r#"{"sourceAssetType":"points","targetAssetType":"cash","rate":"250.000000","status":"active"}"#,
            ),
            "X-Request-Id",
            "exchange-rule-update-1",
        ),
    )
    .await;
    assert_eq!("2000", update_exchange_rule_payload["code"]);
    assert_eq!(
        "POINTS",
        update_exchange_rule_payload["data"]["item"]["sourceAssetType"]
    );
    assert_eq!(
        "CASH",
        update_exchange_rule_payload["data"]["item"]["targetAssetType"]
    );
    assert_eq!("250", update_exchange_rule_payload["data"]["item"]["rate"]);
    assert_eq!(
        "active",
        update_exchange_rule_payload["data"]["item"]["status"]
    );

    let payment_attempts_payload = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/billing/payments/attempts",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", payment_attempts_payload["code"]);
    assert_eq!(
        "payment-910",
        payment_attempts_payload["data"]["items"][0]["id"]
    );
    assert_eq!(
        "order-900",
        payment_attempts_payload["data"]["items"][0]["orderNo"]
    );
    assert_eq!(
        "provider-7",
        payment_attempts_payload["data"]["items"][0]["provider"]
    );
    assert_eq!(
        "25.50",
        payment_attempts_payload["data"]["items"][0]["amount"]
    );
    assert_eq!(
        "success",
        payment_attempts_payload["data"]["items"][0]["status"]
    );

    let referrals_payload = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/router/referrals/stats",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("Owner", referrals_payload["data"]["items"][0]["inviter"]);
    assert_eq!(3, referrals_payload["data"]["items"][0]["total_invited"]);

    let create_offer_payload = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/promotions/offers",
            Body::from(r#"{"name":"Launch credit","discount_type":"amount","value":"$8.50"}"#),
        ),
    )
    .await;
    assert_eq!(
        "offer-",
        &create_offer_payload["data"]["item"]["offer_no"]
            .as_str()
            .unwrap()[..6]
    );
    assert_eq!(
        "Launch credit",
        create_offer_payload["data"]["item"]["name"]
    );
    assert_eq!("coupon", create_offer_payload["data"]["item"]["offer_type"]);

    let new_offer_id = create_offer_payload["data"]["item"]["id"]
        .as_str()
        .unwrap()
        .to_owned();

    let update_offer_payload = request_json(
        router.clone(),
        signed_request(
            "PATCH",
            format!("/backend/v3/api/promotions/offers/{new_offer_id}").as_str(),
            Body::from(
                r#"{"name":"Launch discount","discount_type":"discount","value":"15%","status":"inactive"}"#,
            ),
        ),
    )
    .await;
    assert_eq!(
        new_offer_id,
        update_offer_payload["data"]["item"]["id"].as_str().unwrap()
    );
    assert_eq!(
        "Launch discount",
        update_offer_payload["data"]["item"]["name"]
    );
    assert_eq!("coupon", update_offer_payload["data"]["item"]["offer_type"]);
    assert_eq!("inactive", update_offer_payload["data"]["item"]["status"]);

    let generate_payload = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/promotions/coupon_stocks",
            Body::from(format!(
                r#"{{"offer_id":"{new_offer_id}","name":"Launch stock","total_quantity":2,"code_prefix":"LAUNCH"}}"#
            )),
        ),
    )
    .await;
    assert_eq!("Launch stock", generate_payload["data"]["item"]["name"]);
    assert_eq!(
        2,
        generate_payload["data"]["codes"].as_array().unwrap().len()
    );
    assert_eq!(
        "0001",
        generate_payload["data"]["codes"][0]["promotion_code_last4"]
    );
    assert_eq!(
        "0002",
        generate_payload["data"]["codes"][1]["promotion_code_last4"]
    );

    let create_recharge_package_payload = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/recharges/packages",
            Body::from(
                r#"{"priceAmount":"12.00","currencyCode":"CNY","bonusPoints":30,"status":"active"}"#,
            ),
        ),
    )
    .await;
    assert_eq!(
        "12.00",
        create_recharge_package_payload["data"]["item"]["priceAmount"]
    );
    assert_eq!(
        "CNY",
        create_recharge_package_payload["data"]["item"]["currencyCode"]
    );
    assert_eq!(
        30,
        create_recharge_package_payload["data"]["item"]["bonusPoints"]
    );
    assert_eq!(
        150,
        create_recharge_package_payload["data"]["item"]["grantAmount"]
    );
    let new_recharge_package_id = create_recharge_package_payload["data"]["item"]["id"]
        .as_str()
        .unwrap()
        .to_owned();

    let update_recharge_settings_payload = request_json(
        router.clone(),
        signed_request(
            "PUT",
            "/backend/v3/api/recharges/settings",
            Body::from(
                r#"{"baseCurrencyCode":"CNY","basePointsPerCny":"10","currencyToCnyRates":{"CNY":"1","USD":"7.5"}}"#,
            ),
        ),
    )
    .await;
    assert_eq!("2000", update_recharge_settings_payload["code"]);
    assert_eq!(
        "10",
        update_recharge_settings_payload["data"]["basePointsPerCny"]
    );
    assert_eq!(
        "7.5",
        update_recharge_settings_payload["data"]["currencyToCnyRates"]["USD"]
    );

    let update_recharge_package_payload = request_json(
        router.clone(),
        signed_request(
            "PATCH",
            format!("/backend/v3/api/recharges/packages/{new_recharge_package_id}").as_str(),
            Body::from(
                r#"{"priceAmount":"20.00","currencyCode":"USD","bonusPoints":50,"status":"inactive"}"#,
            ),
        ),
    )
    .await;
    assert_eq!(
        "20.00",
        update_recharge_package_payload["data"]["item"]["priceAmount"]
    );
    assert_eq!(
        "USD",
        update_recharge_package_payload["data"]["item"]["currencyCode"]
    );
    assert_eq!(
        50,
        update_recharge_package_payload["data"]["item"]["bonusPoints"]
    );
    assert_eq!(
        1550,
        update_recharge_package_payload["data"]["item"]["grantAmount"]
    );

    let delete_recharge_package_payload = request_json(
        router.clone(),
        signed_request(
            "DELETE",
            format!("/backend/v3/api/recharges/packages/{new_recharge_package_id}").as_str(),
            Body::empty(),
        ),
    )
    .await;
    assert_eq!(true, delete_recharge_package_payload["data"]["deleted"]);

    let second_generate_payload = request_json(
        router.clone(),
        signed_request(
            "POST",
            "/backend/v3/api/promotions/coupon_stocks",
            Body::from(format!(
                r#"{{"offer_id":"{new_offer_id}","name":"Launch stock two","total_quantity":2,"code_prefix":"LAUNCH"}}"#
            )),
        ),
    )
    .await;
    assert_eq!(
        "Launch stock two",
        second_generate_payload["data"]["item"]["name"]
    );
    assert_eq!(
        "0003",
        second_generate_payload["data"]["codes"][0]["promotion_code_last4"]
    );
    assert_eq!(
        "0004",
        second_generate_payload["data"]["codes"][1]["promotion_code_last4"]
    );

    let promo_after_generation_payload = request_json(
        router.clone(),
        signed_request("GET", "/backend/v3/api/promotions/codes", Body::empty()),
    )
    .await;
    let first_stock_id = generate_payload["data"]["item"]["id"].as_str().unwrap();
    let second_stock_id = second_generate_payload["data"]["item"]["id"]
        .as_str()
        .unwrap();
    let promo_after_generation_items = promo_after_generation_payload["data"]["items"]
        .as_array()
        .unwrap();
    let generated_launch_codes: Vec<&str> = promo_after_generation_payload["data"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|item| {
            let stock_id = item["stock_id"].as_str();
            stock_id == Some(first_stock_id) || stock_id == Some(second_stock_id)
        })
        .filter_map(|item| item["promotion_code_last4"].as_str())
        .collect();
    let unique_launch_codes: std::collections::BTreeSet<&str> =
        generated_launch_codes.iter().copied().collect();
    assert_eq!(generated_launch_codes.len(), unique_launch_codes.len());
    assert_eq!(vec!["0004", "0003", "0002", "0001"], generated_launch_codes);
    for (code_suffix, expected_stock_id) in [
        ("0001", first_stock_id),
        ("0002", first_stock_id),
        ("0003", second_stock_id),
        ("0004", second_stock_id),
    ] {
        let item = promo_after_generation_items
            .iter()
            .find(|item| item["promotion_code_last4"] == code_suffix)
            .unwrap();
        assert_eq!(expected_stock_id, item["stock_id"]);
    }

    let other_subject = trusted_request_subject(11, 21, 31);
    let other_offer_payload = request_json(
        router.clone(),
        signed_request_for_subject(
            "POST",
            "/backend/v3/api/promotions/offers",
            Body::from(
                r#"{"name":"Regional launch credit","discount_type":"amount","value":"$9.00"}"#,
            ),
            other_subject,
        ),
    )
    .await;
    let other_offer_id = other_offer_payload["data"]["item"]["id"]
        .as_str()
        .unwrap()
        .to_owned();
    let other_generate_payload = request_json(
        router.clone(),
        signed_request_for_subject(
            "POST",
            "/backend/v3/api/promotions/coupon_stocks",
            Body::from(format!(
                r#"{{"offer_id":"{other_offer_id}","name":"Regional launch stock","total_quantity":2,"code_prefix":"LAUNCH"}}"#
            )),
            other_subject,
        ),
    )
    .await;
    assert_eq!(
        "0005",
        other_generate_payload["data"]["codes"][0]["promotion_code_last4"]
    );
    assert_eq!(
        "0006",
        other_generate_payload["data"]["codes"][1]["promotion_code_last4"]
    );

    let new_promo_id = generate_payload["data"]["codes"][0]["id"]
        .as_str()
        .unwrap()
        .to_owned();
    let update_payload = request_json(
        router.clone(),
        signed_request(
            "PATCH",
            format!("/backend/v3/api/promotions/codes/{new_promo_id}/status").as_str(),
            Body::from(r#"{"status":"voided"}"#),
        ),
    )
    .await;
    assert_eq!(true, update_payload["data"]["updated"]);

    let delete_payload = request_json(
        router,
        signed_request(
            "DELETE",
            format!("/backend/v3/api/promotions/offers/{new_offer_id}").as_str(),
            Body::empty(),
        ),
    )
    .await;
    assert_eq!(true, delete_payload["data"]["deleted"]);

    let verification_pool = create_sqlite_pool(&database_url).await;
    let exchange_row = sqlx::query(
        r#"
        SELECT id, CAST(rate AS TEXT) AS rate, request_no
        FROM commerce_exchange_rule
        WHERE tenant_id = '100001'
          AND organization_id = '0'
          AND source_asset_type = 'points'
          AND target_asset_type = 'cash'
        "#,
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let exchange_request_id: String = exchange_row.get("request_no");
    assert_server_request_id(&exchange_request_id, "exchange-rule-update-1");
    let audit_row = sqlx::query(
        r#"
        SELECT request_id, action
        FROM ops_audit_log
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND action = 'update_exchange_rule'
          AND target_uuid = ?
        ORDER BY id DESC
        LIMIT 1
        "#,
    )
    .bind(exchange_row.get::<String, _>("id"))
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    verification_pool.close().await;
    assert_eq!("250", exchange_row.get::<String, _>("rate"));
    assert_eq!(
        exchange_request_id,
        audit_row.get::<String, _>("request_id")
    );
    assert_eq!("update_exchange_rule", audit_row.get::<String, _>("action"));
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_admin_finance() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    seed_admin_users(&pool).await;
    seed_admin_finance(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let transactions_payload = request_json(
        router.clone(),
        signed_request(
            "GET",
            "/backend/v3/api/billing/finance/ledger",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", transactions_payload["code"]);
    assert_eq!(
        "ledger-1000",
        transactions_payload["data"]["items"][0]["id"]
    );
    assert_eq!("30", transactions_payload["data"]["items"][0]["userId"]);
    assert_eq!("recharge", transactions_payload["data"]["items"][0]["type"]);
    assert_eq!("25.50", transactions_payload["data"]["items"][0]["amount"]);
    assert_eq!(
        "125.50",
        transactions_payload["data"]["items"][0]["balance"]
    );
    assert_eq!(
        "Payment success",
        transactions_payload["data"]["items"][0]["description"]
    );
    assert_eq!(
        "success",
        transactions_payload["data"]["items"][0]["status"]
    );

    let billing_payload = request_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/billing/finance/usage_statements",
            Body::empty(),
        ),
    )
    .await;
    assert_eq!("2000", billing_payload["code"]);
    assert_eq!("stmt-202604", billing_payload["data"]["items"][0]["id"]);
    assert_eq!("30", billing_payload["data"]["items"][0]["userId"]);
    assert_eq!("2026-04", billing_payload["data"]["items"][0]["period"]);
    assert_eq!(12000, billing_payload["data"]["items"][0]["totalTokens"]);
    assert_eq!("88.25", billing_payload["data"]["items"][0]["totalCost"]);
    assert_eq!("unpaid", billing_payload["data"]["items"][0]["status"]);
    assert_eq!(
        "2026-05-10 00:00:00",
        billing_payload["data"]["items"][0]["dueDate"]
    );
}

#[tokio::test]
async fn database_config_router_serves_signed_subject_admin_record() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    seed_admin_users(&pool).await;
    seed_admin_record(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let payload = request_json(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/system/records?user=owner%40example.com&token=Production&model=gpt-4o-mini",
            Body::empty(),
        ),
    )
    .await;

    assert_eq!("2000", payload["code"]);
    assert_eq!(1, payload["data"]["total"]);
    assert_eq!("trace-100", payload["data"]["logs"][0]["id"]);
    assert_eq!("owner@example.com", payload["data"]["logs"][0]["user"]);
    assert_eq!(
        "req-admin-record-1",
        payload["data"]["logs"][0]["requestId"]
    );
    assert_eq!("2026-04-29 09:30:00", payload["data"]["logs"][0]["time"]);
    assert_eq!("Production", payload["data"]["logs"][0]["tokenName"]);
    assert_eq!("standard-group", payload["data"]["logs"][0]["group"]);
    assert_eq!("text", payload["data"]["logs"][0]["type"]);
    assert_eq!(
        "gpt-4o-mini-2026-05-13",
        payload["data"]["logs"][0]["model"]
    );
    assert_eq!("842ms", payload["data"]["logs"][0]["totalTime"]);
    assert_eq!("120ms", payload["data"]["logs"][0]["ttft"]);
    assert_eq!(true, payload["data"]["logs"][0]["isStream"]);
    assert_eq!(1200, payload["data"]["logs"][0]["inputTokens"]);
    assert_eq!(128, payload["data"]["logs"][0]["cacheReadTokens"]);
    assert_eq!(300, payload["data"]["logs"][0]["outputTokens"]);
    assert_eq!("0.012300", payload["data"]["logs"][0]["cost"]);
    assert_eq!("1.200000", payload["data"]["logs"][0]["multiplier"]);
    assert_eq!("0.150000", payload["data"]["logs"][0]["baseInputPrice"]);
    assert_eq!("0.600000", payload["data"]["logs"][0]["baseOutputPrice"]);
    assert_eq!("0.030000", payload["data"]["logs"][0]["cacheReadPrice"]);
    assert_eq!("/v1/chat/completions", payload["data"]["logs"][0]["path"]);
    assert_eq!("medium", payload["data"]["logs"][0]["reasoningEffort"]);
    assert_eq!("203.0.113.***", payload["data"]["logs"][0]["ip"]);
}

#[tokio::test]
async fn database_config_router_rejects_admin_record_when_trace_latency_is_missing() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog(&pool).await;
    seed_admin_users(&pool).await;
    seed_admin_record(&pool).await;
    seed_admin_record_missing_latency(&pool).await;
    pool.close().await;

    let router = configured_router_from_database_config(
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
        Some(api_key_security_config()),
        Some(trusted_subject_config()),
        Some(app_session_config()),
    )
    .await
    .unwrap();

    let (status, payload, body_text) = request_json_with_status(
        router,
        signed_request(
            "GET",
            "/backend/v3/api/system/records?page=1&page_size=20",
            Body::empty(),
        ),
    )
    .await;

    assert_eq!(StatusCode::INTERNAL_SERVER_ERROR, status);
    assert_eq!("5000", payload["code"]);
    assert!(
        body_text.contains("missing admin record latency_ms from database row"),
        "{body_text}"
    );
}

#[tokio::test]
async fn optional_database_config_keeps_manifest_fallback_when_catalog_is_not_configured() {
    let router = sdkwork_clawrouter_admin_gateway::router_with_optional_database_config(None)
        .await
        .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/models")
                .header("content-type", "application/json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_IMPLEMENTED, response.status());
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
    path.push(format!("admin-config-{process_id}-{nonce}-{sequence}.db"));
    format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"))
}

fn sqlite_test_database_dir() -> std::path::PathBuf {
    std::env::var_os("CARGO_TARGET_DIR")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("test-dbs")
}

fn trusted_subject_config() -> TrustedSubjectConfig {
    test_trusted_subject_config().unwrap()
}

fn app_session_config() -> AppSessionConfig {
    test_app_session_config().unwrap()
}

fn api_key_security_config() -> ApiKeySecurityConfig {
    test_api_key_security_config().unwrap()
}

fn signed_request(method: &str, path: &str, body: Body) -> Request<Body> {
    signed_request_for_subject(method, path, body, default_trusted_request_subject())
}

fn signed_request_for_subject(
    method: &str,
    path: &str,
    body: Body,
    subject: TrustedRequestSubject,
) -> Request<Body> {
    signed_request_builder_for_subject(method, path, subject)
        .body(body)
        .unwrap()
}

fn signed_request_with_header(
    method: &str,
    path: &str,
    body: Body,
    header_name: &'static str,
    header_value: &'static str,
) -> Request<Body> {
    signed_request_builder_for_subject(method, path, default_trusted_request_subject())
        .header(header_name, header_value)
        .body(body)
        .unwrap()
}

fn signed_request_builder_for_subject(
    method: &str,
    path: &str,
    subject: TrustedRequestSubject,
) -> axum::http::request::Builder {
    let timestamp = current_unix_seconds();
    let timestamp_value = timestamp.to_string();
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
        .header("x-sdkwork-subject-timestamp", timestamp_value)
        .header("x-sdkwork-subject-signature", signature)
}

fn app_session_request(method: &str, path: &str, body: Body) -> Request<Body> {
    app_session_request_for_subject(method, path, body, bootstrap_admin_subject())
}

fn app_session_request_for_subject(
    method: &str,
    path: &str,
    body: Body,
    subject: TrustedRequestSubject,
) -> Request<Body> {
    let issued_at = current_unix_seconds();
    let expires_at = issued_at + 3600;
    let (authorization, access_token) =
        app_session_dual_token_headers(subject, issued_at, expires_at).unwrap();
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .header("authorization", authorization)
        .header("Access-Token", access_token)
        .body(body)
        .unwrap()
}

fn bootstrap_admin_subject() -> TrustedRequestSubject {
    trusted_request_subject(100_001, 0, 1)
}

async fn capture_provider_health_probe(
    State(captured): State<Arc<Mutex<Vec<CapturedProviderHealthProbe>>>>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Json<Value> {
    captured.lock().unwrap().push(CapturedProviderHealthProbe {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    Json(json!({
        "id": "chatcmpl-admin-health",
        "object": "chat.completion",
        "model": "gpt-4o-mini",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "pong"},
                "finish_reason": "stop"
            }
        ]
    }))
}

async fn configured_router_with_provider_secret_map(
    database_url: &str,
    provider_secret_map_config: ProviderSecretMapConfig,
) -> axum::Router {
    sdkwork_clawrouter_admin_gateway::router_with_database_api_key_trusted_subject_app_session_provider_secret_map_config_and_startup_install_mode(
        DatabaseConfig::from_url_with_max_connections(database_url, 1).unwrap(),
        api_key_security_config(),
        trusted_subject_config(),
        app_session_config(),
        provider_secret_map_config,
        StartupInstallMode::Skip,
    )
    .await
    .unwrap()
}

async fn configured_router_from_database_config(
    config: DatabaseConfig,
    api_key_config: Option<ApiKeySecurityConfig>,
    trusted_subject_config: Option<TrustedSubjectConfig>,
    app_session_config: Option<AppSessionConfig>,
) -> Result<axum::Router, sdkwork_clawrouter_admin_gateway::ProductCatalogRouterError> {
    sdkwork_clawrouter_admin_gateway::router_with_database_and_api_key_config_and_startup_install_mode(
        config,
        api_key_config,
        trusted_subject_config,
        app_session_config,
        StartupInstallMode::Skip,
    )
    .await
}

fn app_session_request_builder(method: &str, path: &str) -> axum::http::request::Builder {
    let issued_at = current_unix_seconds();
    let expires_at = issued_at + 3600;
    let (authorization, access_token) =
        app_session_dual_token_headers(bootstrap_admin_subject(), issued_at, expires_at).unwrap();
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .header("authorization", authorization)
        .header("Access-Token", access_token)
}

async fn request_json(router: axum::Router, request: Request<Body>) -> serde_json::Value {
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, status, "{body_text}");
    serde_json::from_str(&body_text).unwrap()
}

async fn request_json_with_status(
    router: axum::Router,
    request: Request<Body>,
) -> (StatusCode, Value, String) {
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    let payload: Value = serde_json::from_str(&body_text).unwrap();
    (status, payload, body_text)
}

fn current_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

fn assert_server_request_id(value: &str, client_header_value: &str) {
    let bytes = value.as_bytes();
    assert_eq!(36, bytes.len(), "request id must be a canonical UUID");
    assert_ne!(
        client_header_value, value,
        "server-generated request id must ignore client X-Request-Id"
    );
    assert_eq!(b'-', bytes[8]);
    assert_eq!(b'-', bytes[13]);
    assert_eq!(b'-', bytes[18]);
    assert_eq!(b'-', bytes[23]);
    assert_eq!(b'4', bytes[14], "generated request id must be UUID v4");
    assert!(
        matches!(bytes[19], b'8' | b'9' | b'a' | b'b'),
        "generated request id must use RFC 4122 variant"
    );
    assert!(bytes.iter().enumerate().all(|(index, byte)| {
        matches!(index, 8 | 13 | 18 | 23) && *byte == b'-'
            || !matches!(index, 8 | 13 | 18 | 23) && byte.is_ascii_hexdigit()
    }));
}

async fn create_sqlite_pool(database_url: &str) -> SqlitePool {
    let options = SqliteConnectOptions::from_str(database_url)
        .unwrap()
        .create_if_missing(true)
        .foreign_keys(true);
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .unwrap()
}

async fn create_schema(pool: &SqlitePool) {
    for statement in [
        r#"CREATE TABLE ai_model_vendor (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            vendor_code TEXT NOT NULL,
            display_name TEXT NOT NULL,
            legal_name TEXT,
            description TEXT,
            website_url TEXT,
            docs_url TEXT,
            logo_media_resource_id TEXT,
            logo_object_blob_id INTEGER,
            logo_resource_snapshot TEXT,
            icon_media_resource_id TEXT,
            icon_object_blob_id INTEGER,
            icon_resource_snapshot TEXT,
            color_token TEXT,
            country_region TEXT,
            vendor_type INTEGER,
            model_families TEXT,
            capabilities TEXT,
            supported_protocols TEXT,
            client_api_compatibility TEXT,
            open_source INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            deleted_by INTEGER,
            sort_order INTEGER NOT NULL
        )"#,
        "CREATE UNIQUE INDEX uk_ai_model_vendor_tenant_code ON ai_model_vendor (tenant_id, organization_id, vendor_code)",
        r#"CREATE TABLE ai_model (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            catalog_key TEXT,
            model TEXT NOT NULL,
            display_name TEXT NOT NULL,
            vendor_id INTEGER,
            vendor_code TEXT NOT NULL,
            vendor_name_snapshot TEXT,
            family_id INTEGER,
            family_code TEXT,
            provider_hint TEXT,
            model_family TEXT,
            model_version TEXT,
            model_aliases TEXT,
            capability INTEGER,
            modalities TEXT,
            input_modalities TEXT,
            output_modalities TEXT,
            icon_media_resource_id TEXT,
            icon_object_blob_id INTEGER,
            icon_resource_snapshot TEXT,
            color_token TEXT,
            docs_url TEXT,
            license_type INTEGER,
            description TEXT,
            capability_intro TEXT,
            limitations TEXT,
            supported_languages TEXT,
            use_cases TEXT,
            training_data_cutoff TEXT,
            context_tokens INTEGER,
            max_input_tokens INTEGER,
            max_output_tokens INTEGER,
            max_duration_seconds INTEGER,
            supports_streaming INTEGER,
            supports_tools INTEGER,
            supports_json_schema INTEGER,
            api_format TEXT,
            performance_profile TEXT,
            default_pricing_id INTEGER,
            release_stage INTEGER NOT NULL DEFAULT 1,
            shelf_state INTEGER NOT NULL DEFAULT 1,
            routing_state INTEGER NOT NULL DEFAULT 1,
            deprecated_at TEXT,
            retired_at TEXT,
            replacement_model TEXT,
            capabilities TEXT NOT NULL DEFAULT '[]',
            status INTEGER NOT NULL,
            deleted_at TEXT,
            deleted_by INTEGER,
            rank_score TEXT
        )"#,
        "CREATE UNIQUE INDEX uk_ai_model_catalog_key ON ai_model (tenant_id, organization_id, catalog_key)",
        r#"CREATE TABLE ai_provider (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-ai-provider',
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            provider_code TEXT NOT NULL,
            default_vendor_code TEXT,
            provider_type TEXT,
            protocol_code TEXT,
            display_name TEXT,
            description TEXT,
            base_url TEXT,
            auth_type INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE integration_provider (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-provider',
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            provider_code TEXT NOT NULL,
            display_name TEXT,
            protocol INTEGER,
            base_url TEXT,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE integration_provider_account (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-provider-account',
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            provider_code TEXT NOT NULL,
            account_code TEXT,
            account_name TEXT,
            auth_type INTEGER,
            credential_profile INTEGER,
            auth_config TEXT,
            secret_ref TEXT,
            secret_hash TEXT,
            masked_label TEXT,
            upstream_balance_amount TEXT,
            upstream_balance_currency TEXT,
            consecutive_error_count INTEGER,
            risk_level INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_site (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            site_code TEXT NOT NULL,
            site_name TEXT NOT NULL,
            display_name TEXT NOT NULL,
            description TEXT,
            base_url TEXT,
            website_url TEXT,
            docs_url TEXT,
            logo_media_resource_id TEXT,
            logo_object_blob_id INTEGER,
            logo_resource_snapshot TEXT,
            color_token TEXT,
            site_type TEXT NOT NULL DEFAULT 'relay',
            owner_kind TEXT,
            region_code TEXT,
            environment INTEGER NOT NULL DEFAULT 1,
            health_status INTEGER NOT NULL DEFAULT 1,
            last_latency_ms INTEGER,
            consecutive_error_count INTEGER NOT NULL DEFAULT 0,
            last_checked_at TEXT,
            last_sync_at TEXT,
            sort_order INTEGER NOT NULL DEFAULT 100
        )"#,
        "CREATE UNIQUE INDEX uk_ai_site_tenant_code ON ai_site (tenant_id, organization_id, site_code)",
        r#"CREATE TABLE ai_site_service (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            site_id INTEGER NOT NULL,
            site_code TEXT NOT NULL,
            service_code TEXT NOT NULL,
            service_name TEXT NOT NULL,
            service_type TEXT NOT NULL DEFAULT 'ai_model_relay',
            protocol_code TEXT,
            base_url TEXT,
            auth_type INTEGER NOT NULL DEFAULT 1,
            credential_profile INTEGER NOT NULL DEFAULT 1,
            auth_config TEXT NOT NULL DEFAULT '{}',
            credential_ref TEXT,
            credential_hash TEXT,
            masked_label TEXT,
            credential_version INTEGER NOT NULL DEFAULT 1,
            region_code TEXT,
            environment INTEGER NOT NULL DEFAULT 1,
            health_status INTEGER NOT NULL DEFAULT 1,
            last_latency_ms INTEGER,
            consecutive_error_count INTEGER NOT NULL DEFAULT 0,
            last_verified_at TEXT,
            last_sync_at TEXT,
            sort_order INTEGER NOT NULL DEFAULT 100
        )"#,
        "CREATE UNIQUE INDEX uk_ai_site_service_site_code ON ai_site_service (tenant_id, organization_id, site_id, service_code)",
        r#"CREATE TABLE ai_channel (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-channel',
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            provider_id INTEGER,
            provider_code TEXT NOT NULL,
            site_id INTEGER,
            site_service_id INTEGER,
            site_code TEXT,
            site_service_code TEXT,
            site_channel_role TEXT,
            channel_code TEXT,
            channel_name TEXT,
            channel_type TEXT,
            protocol_code TEXT,
            auth_type INTEGER,
            credential_rotation_strategy TEXT NOT NULL DEFAULT 'default',
            auth_config TEXT,
            credential_ref TEXT,
            credential_hash TEXT,
            masked_label TEXT,
            base_url TEXT,
            timeout_ms INTEGER,
            retry_policy TEXT,
            circuit_breaker_policy TEXT,
            model_mode INTEGER,
            environment INTEGER,
            region_code TEXT,
            capabilities TEXT,
            proxy_id INTEGER,
            upstream_balance_amount TEXT,
            upstream_balance_currency TEXT,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            priority INTEGER NOT NULL,
            weight INTEGER NOT NULL,
            health_status INTEGER,
            last_latency_ms INTEGER,
            rpm_limit INTEGER,
            consecutive_error_count INTEGER
        )"#,
        r#"CREATE TABLE ai_modality (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            modality_code TEXT NOT NULL,
            display_name TEXT NOT NULL,
            modality_group TEXT,
            description TEXT,
            input_supported INTEGER,
            output_supported INTEGER,
            sort_order INTEGER
        )"#,
        "CREATE UNIQUE INDEX uk_ai_modality_tenant_code ON ai_modality (tenant_id, organization_id, modality_code)",
        r#"CREATE TABLE ai_api_endpoint (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            endpoint_code TEXT NOT NULL,
            protocol_code TEXT NOT NULL,
            display_name TEXT,
            method TEXT,
            path_template TEXT NOT NULL,
            request_schema TEXT,
            response_schema TEXT,
            streaming_supported INTEGER,
            sort_order INTEGER
        )"#,
        "CREATE UNIQUE INDEX uk_ai_api_endpoint_tenant_code ON ai_api_endpoint (tenant_id, organization_id, endpoint_code)",
        r#"CREATE TABLE ai_vendor_modality (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            vendor_id INTEGER,
            vendor_code TEXT NOT NULL,
            modality_id INTEGER,
            modality_code TEXT NOT NULL,
            supported INTEGER,
            sort_order INTEGER
        )"#,
        "CREATE UNIQUE INDEX uk_ai_vendor_modality ON ai_vendor_modality (tenant_id, organization_id, vendor_code, modality_code)",
        r#"CREATE TABLE ai_vendor_api_endpoint (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            vendor_id INTEGER,
            vendor_code TEXT NOT NULL,
            api_endpoint_id INTEGER,
            endpoint_code TEXT NOT NULL,
            supported INTEGER,
            sort_order INTEGER
        )"#,
        "CREATE UNIQUE INDEX uk_ai_vendor_api_endpoint ON ai_vendor_api_endpoint (tenant_id, organization_id, vendor_code, endpoint_code)",
        r#"CREATE TABLE ai_modality_api_endpoint (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            modality_id INTEGER,
            modality_code TEXT NOT NULL,
            api_endpoint_id INTEGER,
            endpoint_code TEXT NOT NULL,
            supported INTEGER,
            sort_order INTEGER
        )"#,
        "CREATE UNIQUE INDEX uk_ai_modality_api_endpoint ON ai_modality_api_endpoint (tenant_id, organization_id, modality_code, endpoint_code)",
        r#"CREATE TABLE ai_model_modality (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            model_id INTEGER,
            catalog_key TEXT NOT NULL,
            model TEXT,
            vendor_code TEXT,
            modality_id INTEGER,
            modality_code TEXT NOT NULL,
            direction TEXT,
            supported INTEGER,
            sort_order INTEGER
        )"#,
        "CREATE UNIQUE INDEX uk_ai_model_modality ON ai_model_modality (tenant_id, organization_id, catalog_key, modality_code, direction)",
        r#"CREATE TABLE ai_model_api_endpoint (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            model_id INTEGER,
            catalog_key TEXT NOT NULL,
            model TEXT,
            vendor_code TEXT,
            api_endpoint_id INTEGER,
            endpoint_code TEXT NOT NULL,
            provider_native_model TEXT,
            default_parameters TEXT,
            supports_streaming INTEGER,
            supported INTEGER,
            sort_order INTEGER
        )"#,
        "CREATE UNIQUE INDEX uk_ai_model_api_endpoint ON ai_model_api_endpoint (tenant_id, organization_id, catalog_key, endpoint_code)",
        r#"CREATE TABLE ai_model_family (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            vendor_id INTEGER,
            vendor_code TEXT NOT NULL,
            family_code TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            docs_url TEXT,
            icon_media_resource_id TEXT,
            icon_object_blob_id INTEGER,
            icon_resource_snapshot TEXT,
            color_token TEXT,
            family_type INTEGER,
            primary_modality INTEGER,
            model_count INTEGER,
            default_model_id INTEGER,
            default_model TEXT,
            sort_order INTEGER
        )"#,
        "CREATE UNIQUE INDEX uk_ai_model_family_tenant_vendor_code ON ai_model_family (tenant_id, organization_id, vendor_code, family_code)",
        r#"CREATE TABLE ai_routing_policy (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-routing-policy',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            policy_code TEXT,
            name TEXT,
            policy_scope INTEGER,
            subject_id INTEGER,
            capability INTEGER,
            default_profile_id INTEGER,
            fallback_mode INTEGER,
            slo_latency_ms INTEGER,
            slo_success_rate TEXT,
            cost_ceiling TEXT,
            currency TEXT
        )"#,
        r#"CREATE TABLE ai_routing_profile (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-routing-profile',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            policy_id INTEGER,
            profile_version INTEGER,
            profile_name TEXT,
            release_status INTEGER,
            traffic_percent TEXT,
            config_hash TEXT,
            published_at TEXT,
            published_by INTEGER,
            rollback_from_profile_id INTEGER
        )"#,
        r#"CREATE TABLE ai_routing_rule (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-routing-rule',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            profile_id INTEGER,
            rule_code TEXT,
            priority INTEGER,
            match_expression TEXT,
            target_model TEXT,
            candidate_channels TEXT,
            fallback_chain TEXT,
            constraints TEXT,
            rate_limit_policy_id INTEGER,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_model_mapping_rule (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-model-mapping-rule',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            scope_type TEXT NOT NULL DEFAULT 'global',
            vendor_id INTEGER,
            vendor_code TEXT,
            channel_id INTEGER,
            channel_code TEXT,
            source_model TEXT NOT NULL DEFAULT '',
            source_catalog_key TEXT,
            source_vendor_code TEXT,
            target_model TEXT NOT NULL DEFAULT '',
            target_catalog_key TEXT,
            target_vendor_code TEXT,
            target_provider_model TEXT,
            target_provider_native_model TEXT,
            mapping_mode TEXT NOT NULL DEFAULT 'alias',
            match_type TEXT NOT NULL DEFAULT 'exact',
            priority INTEGER NOT NULL DEFAULT 100,
            enabled INTEGER NOT NULL DEFAULT 1,
            effective_from TEXT,
            effective_to TEXT,
            description TEXT
        )"#,
        r#"CREATE TABLE ai_model_mapping_rule_binding (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-model-mapping-rule-binding',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            rule_id INTEGER NOT NULL DEFAULT 0,
            rule_uuid TEXT,
            binding_type TEXT NOT NULL DEFAULT 'global',
            binding_id INTEGER,
            binding_code TEXT,
            binding_name_snapshot TEXT,
            sort_order INTEGER NOT NULL DEFAULT 100,
            enabled INTEGER NOT NULL DEFAULT 1
        )"#,
        r#"CREATE TABLE ai_model_mapping_rule_item (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-model-mapping-rule-item',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            rule_id INTEGER NOT NULL DEFAULT 0,
            rule_uuid TEXT,
            source_model TEXT NOT NULL DEFAULT '',
            source_catalog_key TEXT,
            target_model TEXT NOT NULL DEFAULT '',
            target_catalog_key TEXT,
            target_provider_model TEXT,
            target_provider_native_model TEXT,
            sort_order INTEGER NOT NULL DEFAULT 100,
            enabled INTEGER NOT NULL DEFAULT 1
        )"#,
        r#"CREATE TABLE ai_resource (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER NOT NULL DEFAULT 0,
            resource_code TEXT,
            resource_type TEXT,
            display_name TEXT,
            vendor_code TEXT,
            modality_code TEXT,
            api_code TEXT,
            model_code TEXT,
            catalog_key TEXT,
            model TEXT,
            provider_native_model TEXT,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            vendor_id INTEGER,
            modality_id INTEGER,
            api_endpoint_id INTEGER,
            model_id INTEGER,
            resource_schema TEXT,
            metadata_schema TEXT,
            description TEXT,
            sort_order INTEGER
        )"#,
        "CREATE UNIQUE INDEX uk_ai_resource_tenant_code ON ai_resource (tenant_id, organization_id, resource_code)",
        r#"CREATE TABLE ai_resource_group (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
            group_code TEXT,
            group_name TEXT,
            group_type TEXT,
            selection_mode TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_resource_group_item (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            resource_group_id INTEGER NOT NULL,
            resource_group_code TEXT,
            item_type TEXT NOT NULL,
            resource_id INTEGER,
            resource_code TEXT,
            child_resource_group_id INTEGER,
            child_resource_group_code TEXT,
            item_role TEXT,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_channel_resource (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            channel_id INTEGER NOT NULL,
            provider_code TEXT,
            channel_code TEXT,
            resource_id INTEGER,
            resource_code TEXT,
            resource_group_id INTEGER,
            resource_group_code TEXT,
            grant_type TEXT NOT NULL DEFAULT 'allow',
            priority INTEGER,
            weight INTEGER,
            effective_from TEXT,
            effective_to TEXT
        )"#,        r#"CREATE TABLE ai_channel_credential (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER DEFAULT 0,
            metadata TEXT DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            channel_id INTEGER NOT NULL,
            provider_code TEXT,
            channel_code TEXT,
            credential_name TEXT NOT NULL,
            auth_type INTEGER,
            auth_config TEXT NOT NULL DEFAULT '{}',
            credential_ref TEXT,
            credential_hash TEXT,
            masked_label TEXT,
            base_url TEXT,
            priority INTEGER,
            weight INTEGER,
            timeout_ms INTEGER,
            health_status INTEGER,
            last_latency_ms INTEGER,
            consecutive_error_count INTEGER,
            last_verified_at TEXT
        )"#,        r#"CREATE TABLE ai_config_version (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            config_scope TEXT NOT NULL,
            config_version INTEGER NOT NULL DEFAULT 0,
            changed_object_type TEXT,
            changed_object_id INTEGER,
            published_at TEXT
        )"#,
        "CREATE UNIQUE INDEX uk_ai_config_version_scope ON ai_config_version (tenant_id, organization_id, config_scope)",
        r#"CREATE TABLE ai_config_change_event (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            payload_hash TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            retention_until TEXT,
            legal_hold INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            config_scope TEXT NOT NULL,
            changed_object_type TEXT,
            changed_object_id INTEGER,
            config_version INTEGER NOT NULL,
            event_status TEXT NOT NULL DEFAULT 'pending',
            event_payload TEXT,
            published_at TEXT,
            publish_attempts INTEGER NOT NULL DEFAULT 0,
            last_error_message TEXT
        )"#,
        r#"CREATE TABLE integration_provider_health_snapshot (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-health',
            tenant_id INTEGER,
            organization_id INTEGER,
            user_id INTEGER,
            request_id TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT,
            provider_id INTEGER,
            channel_id INTEGER,
            provider_account_id INTEGER,
            check_type INTEGER,
            health_status INTEGER,
            latency_ms INTEGER,
            http_status INTEGER,
            error_code TEXT,
            error_message_masked TEXT,
            quota_snapshot TEXT,
            checked_at TEXT
        )"#,
        r#"CREATE TABLE ai_pricing_plan (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            plan_code TEXT NOT NULL,
            base_price_side INTEGER NOT NULL,
            default_multiplier TEXT NOT NULL,
            default_markup_amount TEXT NOT NULL,
            currency TEXT NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            priority INTEGER NOT NULL,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_routing_decision_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            user_id INTEGER,
            request_id TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            requested_model TEXT,
            resolved_model TEXT
        )"#,
        r#"CREATE TABLE ai_request_trace (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ended_at TEXT,
            api_key_id INTEGER,
            api_key_name_snapshot TEXT,
            channel_group_id INTEGER,
            channel_group_snapshot TEXT,
            owner_name_snapshot TEXT,
            requested_model_catalog_key TEXT,
            provider_native_model TEXT,
            region_code TEXT,
            metadata TEXT,
            request_payload_hash TEXT,
            response_payload_hash TEXT,
            request_bytes INTEGER,
            response_bytes INTEGER,
            requested_model TEXT,
            provider_model TEXT,
            endpoint TEXT,
            request_path TEXT,
            http_method TEXT,
            http_status INTEGER,
            provider_error_code TEXT,
            error_message_masked TEXT,
            error_type INTEGER,
            started_at TEXT,
            latency_ms INTEGER,
            ttft_ms INTEGER,
            streaming INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            cached_tokens INTEGER,
            reasoning_effort TEXT,
            client_ip_masked TEXT
        )"#,
        r#"CREATE TABLE ai_usage_fact (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            owner_name_snapshot TEXT,
            api_key_id INTEGER,
            api_key_name_snapshot TEXT,
            channel_group_id INTEGER,
            channel_group_snapshot TEXT,
            catalog_key TEXT,
            requested_model_catalog_key TEXT,
            model TEXT,
            provider_native_model TEXT,
            region_code TEXT,
            channel_id INTEGER,
            modality INTEGER,
            usage_type INTEGER,
            billing_meter_code TEXT,
            billable_quantity TEXT,
            request_count INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            cached_tokens INTEGER,
            total_tokens INTEGER,
            customer_charge_amount TEXT,
            cost_amount TEXT,
            rate_multiplier TEXT,
            base_input_unit_price TEXT,
            base_output_unit_price TEXT,
            cache_read_unit_price TEXT,
            occurred_at TEXT
        )"#,
        r#"CREATE TABLE iam_user (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            username TEXT NOT NULL,
            display_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            avatar_media_resource_id TEXT,
            avatar_object_blob_id TEXT,
            avatar_resource_snapshot TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, username)
        )"#,
        r#"CREATE TABLE iam_organization (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            parent_id TEXT,
            code TEXT,
            name TEXT,
            path TEXT,
            status TEXT,
            created_at TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE iam_organization_membership (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            membership_kind TEXT NOT NULL,
            employee_no TEXT,
            display_name TEXT,
            is_primary INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            joined_at TEXT NOT NULL,
            left_at TEXT,
            remark TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, organization_id, user_id, membership_kind)
        )"#,
        r#"CREATE TABLE iam_department (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            parent_department_id TEXT,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            department_kind TEXT NOT NULL,
            path TEXT NOT NULL,
            cost_center_code TEXT,
            manager_membership_id TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, organization_id, code)
        )"#,
        r#"CREATE TABLE commerce_account (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            asset_type TEXT NOT NULL,
            currency_code TEXT,
            available_amount TEXT NOT NULL DEFAULT '0',
            frozen_amount TEXT NOT NULL DEFAULT '0',
            version INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, organization_id, owner_user_id, asset_type, currency_code)
        )"#,
        r#"CREATE TABLE commerce_account_ledger_entry (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            account_id TEXT NOT NULL,
            owner_user_id TEXT NOT NULL,
            asset_type TEXT NOT NULL,
            direction TEXT NOT NULL,
            amount TEXT NOT NULL,
            balance_after TEXT NOT NULL,
            business_type TEXT NOT NULL,
            transaction_no TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            source_type TEXT,
            source_id TEXT,
            remark TEXT,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, transaction_no)
        )"#,
        r#"CREATE TABLE promotion_offer (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            offer_no TEXT NOT NULL,
            offer_code TEXT NOT NULL,
            name TEXT NOT NULL,
            offer_type TEXT NOT NULL,
            audience_scope TEXT NOT NULL,
            combinability TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            current_offer_version_id TEXT NOT NULL,
            starts_at TEXT,
            ends_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, offer_no),
            UNIQUE (tenant_id, organization_id, offer_code)
        )"#,
        r#"CREATE TABLE promotion_offer_version (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            offer_id TEXT NOT NULL,
            version_no TEXT NOT NULL,
            lifecycle_status TEXT NOT NULL,
            discount_type TEXT NOT NULL,
            discount_value TEXT NOT NULL,
            minimum_amount TEXT NOT NULL DEFAULT '0',
            maximum_discount_amount TEXT,
            currency_code TEXT,
            rule_json TEXT NOT NULL,
            stack_rule_json TEXT,
            published_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, offer_id, version_no)
        )"#,
        r#"CREATE TABLE promotion_coupon_stock (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            stock_no TEXT NOT NULL,
            name TEXT NOT NULL,
            offer_id TEXT NOT NULL,
            offer_version_id TEXT NOT NULL,
            stock_type TEXT NOT NULL,
            total_quantity INTEGER,
            available_quantity INTEGER NOT NULL DEFAULT 0,
            claimed_quantity INTEGER NOT NULL DEFAULT 0,
            redeemed_quantity INTEGER NOT NULL DEFAULT 0,
            locked_quantity INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            starts_at TEXT,
            expires_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, stock_no)
        )"#,
        r#"CREATE TABLE promotion_code (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            code_no TEXT NOT NULL,
            stock_id TEXT NOT NULL,
            offer_id TEXT NOT NULL,
            offer_version_id TEXT NOT NULL,
            promotion_code TEXT NOT NULL,
            code_type TEXT NOT NULL,
            max_claims INTEGER NOT NULL DEFAULT 1,
            claimed_quantity INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            starts_at TEXT,
            expires_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, code_no),
            UNIQUE (tenant_id, promotion_code)
        )"#,
        r#"CREATE TABLE promotion_user_coupon (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            coupon_no TEXT NOT NULL,
            stock_id TEXT NOT NULL,
            code_id TEXT,
            offer_id TEXT NOT NULL,
            offer_version_id TEXT NOT NULL,
            subject_type TEXT NOT NULL,
            subject_id TEXT NOT NULL,
            owner_user_id TEXT,
            coupon_code TEXT NOT NULL,
            status TEXT NOT NULL,
            claimed_at TEXT,
            valid_from TEXT,
            expires_at TEXT,
            redeemed_at TEXT,
            disabled_at TEXT,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, coupon_no),
            UNIQUE (tenant_id, coupon_code)
        )"#,
        r#"CREATE TABLE commerce_product_spu (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            spu_no TEXT NOT NULL,
            title TEXT NOT NULL,
            subtitle TEXT,
            description TEXT,
            product_type TEXT NOT NULL,
            category_id TEXT,
            sales_status TEXT NOT NULL,
            visible_surfaces TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, spu_no)
        )"#,
        r#"CREATE TABLE commerce_product_spu_category (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            spu_id TEXT NOT NULL,
            category_id TEXT NOT NULL,
            primary_flag INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, spu_id, category_id)
        )"#,
        r#"CREATE TABLE commerce_product_sku (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            spu_id TEXT NOT NULL,
            sku_no TEXT NOT NULL,
            name TEXT NOT NULL,
            title TEXT NOT NULL,
            price_amount TEXT NOT NULL,
            original_price_amount TEXT,
            currency_code TEXT NOT NULL,
            delivery_mode TEXT NOT NULL,
            inventory_tracking TEXT NOT NULL,
            sales_status TEXT NOT NULL,
            spec_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, sku_no)
        )"#,
        r#"CREATE TABLE commerce_recharge_package (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            external_id INTEGER,
            package_no TEXT NOT NULL,
            sku_id TEXT NOT NULL,
            name TEXT NOT NULL,
            price_amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            bonus_points INTEGER NOT NULL,
            status TEXT NOT NULL,
            valid_from TEXT,
            valid_to TEXT,
            sort_weight INTEGER,
            request_no TEXT,
            idempotency_key TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, package_no)
        )"#,
        r#"CREATE TABLE commerce_order (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            order_no TEXT NOT NULL,
            status TEXT NOT NULL,
            subject TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            paid_at TEXT,
            cancelled_at TEXT,
            expired_at TEXT,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, order_no)
        )"#,
        r#"CREATE TABLE commerce_order_item (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            sku_id TEXT NOT NULL,
            title TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price_amount TEXT NOT NULL,
            total_amount TEXT NOT NULL,
            created_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_order_amount_breakdown (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            original_amount TEXT NOT NULL,
            discount_amount TEXT NOT NULL,
            payable_amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, order_id)
        )"#,
        r#"CREATE TABLE commerce_payment_intent (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            status TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_payment_attempt (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            payment_intent_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            out_trade_no TEXT NOT NULL,
            amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            status TEXT NOT NULL,
            callback_payload TEXT,
            created_at TEXT NOT NULL,
            paid_at TEXT,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, provider, out_trade_no)
        )"#,
        r#"CREATE TABLE commerce_payment_method (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            method_key TEXT NOT NULL,
            display_name TEXT NOT NULL,
            provider TEXT NOT NULL,
            status TEXT NOT NULL,
            sort_weight INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, organization_id, method_key)
        )"#,
        r#"CREATE TABLE commerce_exchange_rule (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            rule_no TEXT NOT NULL,
            source_asset_type TEXT NOT NULL,
            target_asset_type TEXT NOT NULL,
            rate TEXT NOT NULL,
            status TEXT NOT NULL,
            remark TEXT,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, organization_id, source_asset_type, target_asset_type)
        )"#,
        r#"CREATE TABLE commerce_invoice (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            invoice_no TEXT NOT NULL,
            title TEXT,
            invoice_type TEXT NOT NULL,
            status TEXT NOT NULL,
            amount_excluding_tax TEXT NOT NULL,
            tax_amount TEXT NOT NULL,
            total_amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            issued_at TEXT,
            cancelled_at TEXT,
            failure_reason TEXT,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, invoice_no)
        )"#,
        r#"CREATE TABLE commerce_invoice_item (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            invoice_id TEXT NOT NULL,
            order_item_id TEXT,
            product_id TEXT,
            sku_id TEXT,
            product_name TEXT NOT NULL,
            specification TEXT,
            quantity TEXT NOT NULL DEFAULT '0',
            unit_price_excluding_tax TEXT NOT NULL DEFAULT '0',
            unit_price_including_tax TEXT NOT NULL DEFAULT '0',
            amount_excluding_tax TEXT NOT NULL DEFAULT '0',
            tax_amount TEXT NOT NULL DEFAULT '0',
            total_amount TEXT NOT NULL DEFAULT '0',
            tax_rate TEXT NOT NULL DEFAULT '0',
            currency_code TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_usage_settlement (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 0,
            settlement_no TEXT,
            usage_fact_id INTEGER,
            account_id TEXT,
            account_ledger_entry_id TEXT,
            order_id INTEGER,
            payment_id INTEGER,
            asset_type TEXT,
            direction TEXT,
            amount TEXT,
            points INTEGER,
            tokens INTEGER,
            currency TEXT,
            settlement_status INTEGER,
            settled_at TEXT,
            failure_code TEXT,
            failure_message TEXT
        )"#,
        r#"CREATE TABLE commerce_usage_statement (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 0,
            statement_no TEXT,
            period TEXT,
            period_start TEXT,
            period_end TEXT,
            owner_type INTEGER,
            owner_id INTEGER,
            total_tokens INTEGER,
            total_requests INTEGER,
            total_cost TEXT,
            currency TEXT,
            statement_status INTEGER,
            generated_at TEXT,
            due_at TEXT,
            paid_at TEXT,
            payment_status INTEGER,
            invoice_id TEXT,
            export_id INTEGER
        )"#,
        r#"CREATE TABLE iam_role (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, code)
        )"#,
        r#"CREATE TABLE iam_user_role (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            organization_id TEXT,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, user_id, role_id, organization_id)
        )"#,
        r#"CREATE TABLE iam_permission (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            resource TEXT NOT NULL,
            action TEXT NOT NULL,
            created_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE iam_role_permission (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            permission_id TEXT NOT NULL,
            created_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE platform_app (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            v INTEGER NOT NULL DEFAULT 0,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            user_id INTEGER,
            name TEXT NOT NULL,
            icon TEXT,
            resource_list TEXT,
            project_id INTEGER,
            description TEXT,
            version TEXT,
            icon_media_resource_id TEXT,
            icon_object_blob_id INTEGER,
            icon_resource_snapshot TEXT,
            access_url TEXT,
            config TEXT NOT NULL DEFAULT '{}',
            status INTEGER NOT NULL DEFAULT 1,
            app_type TEXT,
            platforms TEXT,
            install_platforms TEXT,
            install_skill TEXT,
            install_config TEXT,
            release_notes TEXT,
            package_name TEXT,
            bundle_id TEXT,
            store_url TEXT,
            artifact_media_resource_id TEXT,
            artifact_object_blob_id INTEGER,
            artifact_resource_snapshot TEXT
        )"#,
        "CREATE INDEX idx_app_user_id ON platform_app (user_id)",
        "CREATE INDEX idx_app_project_id ON platform_app (project_id)",
        "CREATE INDEX idx_app_status ON platform_app (status)",
        r#"CREATE TABLE plus_order_worker_dispatch_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            v INTEGER NOT NULL DEFAULT 0,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            user_id INTEGER NOT NULL,
            rating_level TEXT,
            enabled INTEGER NOT NULL DEFAULT 1,
            global_max_in_progress INTEGER NOT NULL DEFAULT 1,
            metadata TEXT NOT NULL DEFAULT '{}',
            CONSTRAINT fk_order_worker_dispatch_profile_user FOREIGN KEY (user_id) REFERENCES iam_user (id)
        )"#,
        "CREATE UNIQUE INDEX uk_order_worker_dispatch_profile_user_id ON plus_order_worker_dispatch_profile (user_id)",
        "CREATE INDEX idx_order_worker_dispatch_profile_enabled ON plus_order_worker_dispatch_profile (enabled)",
        "CREATE INDEX idx_order_worker_dispatch_profile_rating_level ON plus_order_worker_dispatch_profile (rating_level)",
        r#"CREATE TABLE c_category (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            v INTEGER NOT NULL DEFAULT 0,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            name TEXT NOT NULL,
            description TEXT,
            shop_id INTEGER,
            type INTEGER NOT NULL,
            group_name TEXT,
            code TEXT,
            tags TEXT NOT NULL DEFAULT '[]',
            icon TEXT,
            icon_media_resource_id TEXT,
            icon_object_blob_id INTEGER,
            icon_resource_snapshot TEXT,
            sort_weight INTEGER NOT NULL DEFAULT 0,
            parent_id INTEGER,
            path TEXT,
            visible INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1
        )"#,
        r#"CREATE TABLE ai_agent_skill_package (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            v INTEGER NOT NULL DEFAULT 0,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            user_id INTEGER,
            package_key TEXT NOT NULL,
            name TEXT NOT NULL,
            summary TEXT,
            description TEXT,
            icon_media_resource_id TEXT,
            icon_object_blob_id INTEGER,
            icon_resource_snapshot TEXT,
            cover_media_resource_id TEXT,
            cover_object_blob_id INTEGER,
            cover_resource_snapshot TEXT,
            category_id INTEGER,
            enabled INTEGER NOT NULL DEFAULT 1,
            featured INTEGER NOT NULL DEFAULT 0,
            sort_weight INTEGER NOT NULL DEFAULT 0,
            tags TEXT NOT NULL DEFAULT '[]',
            latest_published_at TEXT
        )"#,
        "CREATE UNIQUE INDEX uk_ai_agent_skill_package_key ON ai_agent_skill_package (tenant_id, organization_id, package_key)",
        "CREATE INDEX idx_ai_agent_skill_package_user ON ai_agent_skill_package (user_id)",
        "CREATE INDEX idx_ai_agent_skill_package_category ON ai_agent_skill_package (category_id)",
        "CREATE INDEX idx_ai_agent_skill_package_market ON ai_agent_skill_package (enabled, featured, sort_weight)",
        r#"CREATE TABLE ai_agent_skill (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            v INTEGER NOT NULL DEFAULT 0,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            user_id INTEGER,
            skill_key TEXT NOT NULL,
            name TEXT NOT NULL,
            summary TEXT,
            description TEXT,
            icon_media_resource_id TEXT,
            icon_object_blob_id INTEGER,
            icon_resource_snapshot TEXT,
            cover_media_resource_id TEXT,
            cover_object_blob_id INTEGER,
            cover_resource_snapshot TEXT,
            category_id INTEGER,
            package_id INTEGER,
            provider TEXT,
            version TEXT,
            version_name TEXT,
            runtime TEXT,
            entrypoint TEXT,
            manifest_url TEXT,
            repository_url TEXT,
            homepage_url TEXT,
            documentation_url TEXT,
            license_name TEXT,
            source_type TEXT NOT NULL,
            market_status TEXT NOT NULL,
            visibility TEXT NOT NULL,
            review_status TEXT NOT NULL,
            review_comment TEXT,
            reviewed_by INTEGER,
            reviewed_at TEXT,
            builtin INTEGER NOT NULL DEFAULT 0,
            is_builtin INTEGER NOT NULL DEFAULT 0,
            enabled INTEGER NOT NULL DEFAULT 1,
            featured INTEGER NOT NULL DEFAULT 0,
            recommend_weight INTEGER NOT NULL DEFAULT 0,
            price TEXT,
            currency TEXT NOT NULL DEFAULT 'CNY',
            install_count INTEGER NOT NULL DEFAULT 0,
            rating_avg TEXT NOT NULL DEFAULT '0',
            rating_count INTEGER NOT NULL DEFAULT 0,
            tags TEXT NOT NULL DEFAULT '[]',
            capabilities TEXT NOT NULL DEFAULT '[]',
            config_schema TEXT NOT NULL DEFAULT '{}',
            default_config TEXT NOT NULL DEFAULT '{}',
            latest_published_at TEXT
        )"#,
        "CREATE UNIQUE INDEX uk_ai_agent_skill_key ON ai_agent_skill (tenant_id, organization_id, skill_key)",
        "CREATE INDEX idx_ai_agent_skill_package ON ai_agent_skill (package_id)",
        "CREATE INDEX idx_ai_agent_skill_category ON ai_agent_skill (category_id)",
        "CREATE INDEX idx_ai_agent_skill_market ON ai_agent_skill (enabled, visibility, review_status, market_status, featured, recommend_weight)",
        r#"CREATE TABLE iam_user_login_event (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT,
            auth_method INTEGER,
            auth_provider TEXT,
            login_result INTEGER,
            risk_level INTEGER,
            failure_reason_code TEXT,
            client_ip_hash TEXT,
            client_ip_masked TEXT,
            client_ip_region TEXT,
            device_fingerprint_hash TEXT,
            device_label TEXT,
            user_agent_hash TEXT,
            mfa_verified INTEGER,
            session_id_hash TEXT,
            occurred_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )"#,
        r#"CREATE TABLE ai_channel_group (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-channel-group',
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            group_code TEXT NOT NULL,
            group_name TEXT,
            description TEXT,
            provider_code TEXT,
            group_type INTEGER,
            environment INTEGER,
            pricing_plan_id INTEGER,
            pricing_plan_code TEXT NOT NULL,
            price_reference_mode INTEGER,
            billing_type INTEGER,
            capacity_limit TEXT,
            allowed_origin TEXT,
            metadata TEXT,
            rate_multiplier TEXT NOT NULL,
            official_price_multiplier TEXT NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            deleted_by INTEGER,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel_group_member (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            channel_group_id INTEGER NOT NULL,
            channel_id INTEGER NOT NULL,
            priority INTEGER NOT NULL DEFAULT 100,
            weight INTEGER NOT NULL DEFAULT 100,
            enabled INTEGER NOT NULL DEFAULT 1,
            effective_from TEXT,
            effective_to TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel_group_resource (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            channel_group_id INTEGER NOT NULL,
            resource_id INTEGER,
            resource_code TEXT,
            resource_group_id INTEGER,
            resource_group_code TEXT,
            grant_type TEXT NOT NULL DEFAULT 'allow',
            priority INTEGER,
            effective_from TEXT,
            effective_to TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        "CREATE UNIQUE INDEX uk_ai_channel_group_member ON ai_channel_group_member (tenant_id, organization_id, channel_group_id, channel_id)",
        "CREATE UNIQUE INDEX uk_ai_channel_group_resource ON ai_channel_group_resource (tenant_id, organization_id, channel_group_id, resource_code, resource_group_code)",
        "CREATE UNIQUE INDEX uk_ai_channel_resource ON ai_channel_resource (tenant_id, organization_id, channel_id, resource_code, resource_group_code)",
        r#"CREATE TABLE iam_gateway_api_key (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-api-key',
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            channel_group_id INTEGER NOT NULL,
            name TEXT,
            key_prefix TEXT NOT NULL,
            key_display_masked TEXT,
            key_hash TEXT NOT NULL,
            hash_alg TEXT NOT NULL DEFAULT 'HMAC_SHA256',
            secret_version INTEGER NOT NULL DEFAULT 1,
            idempotency_key TEXT NOT NULL,
            policy_id INTEGER,
            quota_policy_id INTEGER,
            rate_limit_policy_id INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            deleted_at TEXT,
            revoked_at TEXT,
            revoked_by INTEGER,
            expire_at TEXT,
            last_used_at TEXT,
            last_revealed_at TEXT,
            updated_at TEXT,
            metadata TEXT NOT NULL DEFAULT '{}'
        )"#,
        r#"CREATE TABLE iam_gateway_api_key_channel_group (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'gateway-api-key-channel-group-uuid',
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL DEFAULT 0,
            api_key_id INTEGER NOT NULL,
            channel_group_id INTEGER NOT NULL,
            channel_group_code TEXT,
            binding_role TEXT NOT NULL DEFAULT 'route',
            routing_strategy TEXT NOT NULL DEFAULT 'auto',
            priority INTEGER NOT NULL DEFAULT 100,
            weight INTEGER NOT NULL DEFAULT 100,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE iam_gateway_access_policy (
            id INTEGER PRIMARY KEY,
            allowed_capabilities TEXT,
            ip_allowlist TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE ai_quota_policy (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-quota-policy',
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            policy_code TEXT,
            name TEXT,
            subject_type INTEGER,
            subject_id INTEGER,
            subject_ref_hash TEXT,
            subject_ref_masked TEXT,
            scope_type INTEGER,
            scope_id INTEGER,
            group_id INTEGER,
            channel_group_id INTEGER,
            model TEXT,
            quota_period INTEGER,
            quota_unit INTEGER,
            quota_limit TEXT,
            requests_per_second INTEGER,
            requests_per_minute INTEGER,
            requests_per_day INTEGER,
            tokens_per_minute INTEGER,
            burst_limit TEXT,
            block_duration_seconds INTEGER,
            reset_mode INTEGER,
            exhausted_at TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            deleted_by INTEGER,
            effective_from TEXT,
            effective_to TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel_group_metric_snapshot (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'seed-group-metric',
            tenant_id INTEGER,
            organization_id INTEGER,
            provider_code TEXT,
            channel_group_id INTEGER NOT NULL,
            account_available_count INTEGER,
            account_total_count INTEGER,
            channel_available_count INTEGER,
            channel_total_count INTEGER,
            capacity_used TEXT,
            capacity_limit TEXT,
            usage_amount_today TEXT,
            usage_amount_total TEXT,
            snapshot_at TEXT,
            health_status INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status INTEGER NOT NULL
        )"#,
        r#"CREATE TABLE commerce_refund (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            payment_attempt_id TEXT NOT NULL,
            refund_no TEXT NOT NULL,
            amount TEXT NOT NULL,
            status TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, refund_no)
        )"#,
        r#"CREATE TABLE iam_gateway_risk_rule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            rule_name TEXT,
            rule_category INTEGER,
            rule_type INTEGER,
            scope_type INTEGER,
            scope_id INTEGER,
            target_type INTEGER,
            target_value TEXT,
            target_value_hash TEXT,
            target_value_masked TEXT,
            target_value_cipher_ref TEXT,
            match_mode INTEGER,
            reason TEXT,
            action INTEGER,
            priority INTEGER,
            requests_per_second INTEGER,
            requests_per_minute INTEGER,
            requests_per_day INTEGER,
            tokens_per_minute INTEGER,
            burst_limit TEXT,
            block_duration_seconds INTEGER,
            effective_from TEXT,
            effective_to TEXT,
            hit_count INTEGER,
            last_hit_at TEXT
        )"#,
        r#"CREATE TABLE ai_pricing_plan_binding (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            pricing_plan_id INTEGER NOT NULL,
            pricing_plan_code TEXT,
            subject_type INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            subject_code TEXT,
            binding_source INTEGER,
            multiplier_override TEXT,
            priority INTEGER,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_model_pricing (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            model_id INTEGER,
            catalog_key TEXT,
            model TEXT NOT NULL,
            vendor_code TEXT,
            region_code TEXT,
            price_side INTEGER NOT NULL,
            pricing_scope INTEGER NOT NULL DEFAULT 1,
            billing_type INTEGER,
            billing_mode INTEGER,
            billing_meter_id INTEGER,
            billing_meter_code TEXT NOT NULL,
            price_item_type INTEGER,
            unit INTEGER,
            unit_size TEXT,
            metering_mode INTEGER,
            quantity_source INTEGER,
            minimum_quantity TEXT,
            quantity_step TEXT,
            included_quantity TEXT,
            unit_price TEXT NOT NULL,
            currency TEXT NOT NULL,
            rounding_mode INTEGER,
            min_charge_amount TEXT,
            pricing_formula_mode INTEGER,
            price_origin INTEGER,
            reference_multiplier TEXT,
            markup_amount TEXT,
            price_version TEXT,
            source_url TEXT,
            observed_at TEXT,
            provider_code TEXT,
            channel_id INTEGER,
            pricing_plan_id INTEGER,
            pricing_plan_code TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            deleted_by INTEGER,
            effective_from TEXT,
            effective_to TEXT,
            priority INTEGER NOT NULL
        )"#,
        "CREATE UNIQUE INDEX uk_ai_model_pricing_uuid ON ai_model_pricing (uuid)",
        r#"CREATE TABLE ai_billing_meter (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            meter_code TEXT NOT NULL,
            display_name TEXT NOT NULL,
            description TEXT,
            modality INTEGER,
            usage_type INTEGER,
            billing_mode INTEGER NOT NULL,
            default_unit INTEGER NOT NULL,
            default_unit_size TEXT NOT NULL,
            quantity_precision INTEGER,
            quantity_source INTEGER,
            aggregation_mode INTEGER,
            result_selector TEXT,
            supports_tier INTEGER,
            supports_expression INTEGER,
            allow_negative_quantity INTEGER,
            canonical_price_item_type INTEGER,
            sort_order INTEGER
        )"#,
        "CREATE UNIQUE INDEX uk_ai_billing_meter_tenant_code ON ai_billing_meter (tenant_id, organization_id, meter_code)",
        r#"CREATE TABLE ai_model_capability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            model_id INTEGER,
            catalog_key TEXT,
            model TEXT,
            vendor_code TEXT,
            capability INTEGER,
            capability_code TEXT,
            modality INTEGER,
            input_modalities TEXT,
            output_modalities TEXT,
            endpoint_formats TEXT,
            parameter_name TEXT,
            parameter_schema TEXT,
            supported INTEGER,
            limit_unit TEXT,
            limit_value TEXT,
            schema_version TEXT,
            sort_order INTEGER,
            description TEXT
        )"#,
        "CREATE UNIQUE INDEX uk_ai_model_capability_uuid ON ai_model_capability (uuid)",
        r#"CREATE TABLE ai_pricing_import_snapshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            user_id INTEGER,
            request_id TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT NOT NULL DEFAULT '{}',
            import_source INTEGER,
            source_name TEXT,
            source_hash TEXT,
            data_format TEXT,
            row_count INTEGER,
            accepted_count INTEGER,
            rejected_count INTEGER,
            currency TEXT,
            observed_at TEXT
        )"#,
        r#"CREATE TABLE ai_model_rank_snapshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            source_type TEXT,
            source_id INTEGER,
            source_version INTEGER,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            rebuild_version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            snapshot_date TEXT,
            snapshot_period INTEGER,
            rank_scope TEXT,
            model_id INTEGER,
            catalog_key TEXT NOT NULL,
            model TEXT,
            vendor_code TEXT,
            region_code TEXT NOT NULL,
            vendor_name_snapshot TEXT,
            provider_code TEXT,
            modality INTEGER,
            rank_no INTEGER,
            previous_rank_no INTEGER,
            base_volume INTEGER,
            cost_indicator INTEGER,
            context_size_text TEXT,
            is_new INTEGER,
            color_token TEXT,
            pricing_text TEXT,
            license_type INTEGER,
            strengths TEXT,
            request_count INTEGER,
            token_count INTEGER,
            cost_amount TEXT,
            currency TEXT,
            latency_p50_ms INTEGER,
            latency_p95_ms INTEGER,
            success_rate TEXT,
            win_rate TEXT,
            trend_score TEXT,
            rank_payload TEXT
        )"#,
        "CREATE UNIQUE INDEX uk_ai_model_rank_snapshot_uuid ON ai_model_rank_snapshot (uuid)",
        "CREATE UNIQUE INDEX uk_ai_model_rank_snapshot_scope_catalog_key ON ai_model_rank_snapshot (tenant_id, organization_id, snapshot_date, snapshot_period, rank_scope, vendor_code, region_code, catalog_key)",
        "CREATE INDEX idx_ai_model_rank_snapshot_tenant_rank ON ai_model_rank_snapshot (tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, rank_no)",
        r#"CREATE TABLE ai_model_catalog_source (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            source_code TEXT NOT NULL,
            vendor_code TEXT,
            region_code TEXT,
            provider_code TEXT,
            source_name TEXT NOT NULL,
            source_url TEXT,
            source_kind INTEGER NOT NULL,
            trust_level INTEGER NOT NULL,
            parser_kind TEXT NOT NULL,
            refresh_interval_seconds INTEGER,
            last_observed_at TEXT,
            last_success_at TEXT,
            catalog_version TEXT,
            source_hash TEXT,
            raw_payload_ref TEXT,
            normalized_payload_hash TEXT,
            schema_version TEXT,
            error_message_masked TEXT
        )"#,
        "CREATE UNIQUE INDEX uk_ai_model_catalog_source_tenant_code ON ai_model_catalog_source (tenant_id, organization_id, source_code)",
        r#"CREATE TABLE ai_model_catalog_sync_run (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            payload_hash TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            retention_until TEXT,
            legal_hold INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            source_type TEXT,
            source_id INTEGER,
            source_version INTEGER,
            source_code TEXT NOT NULL,
            vendor_code TEXT,
            region_code TEXT,
            provider_code TEXT,
            run_status INTEGER NOT NULL,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            observed_at TEXT,
            catalog_version TEXT,
            source_hash TEXT,
            observed_vendor_count INTEGER,
            observed_model_count INTEGER,
            observed_meter_count INTEGER,
            observed_price_count INTEGER,
            accepted_count INTEGER,
            rejected_count INTEGER,
            skipped_count INTEGER,
            change_summary TEXT,
            error_message_masked TEXT
        )"#,
        r#"CREATE TABLE content_announcement (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            title TEXT,
            content TEXT,
            target_scope INTEGER,
            audience_filter TEXT,
            announcement_type INTEGER,
            pinned INTEGER,
            published_at TEXT,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ops_gateway_instance (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            instance_code TEXT,
            deployment_mode INTEGER,
            region TEXT,
            cell TEXT,
            version_name TEXT,
            host_name TEXT,
            ip_address_hash TEXT,
            ip_address_masked TEXT,
            node_name TEXT,
            pod_name TEXT,
            container_id_hash TEXT,
            desktop_device_hash TEXT,
            runtime_type INTEGER,
            orchestrator INTEGER,
            started_at TEXT,
            last_heartbeat_at TEXT,
            health_status INTEGER,
            config_hash TEXT
        )"#,
        r#"CREATE TABLE ops_gateway_heartbeat (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            payload_hash TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            retention_until TEXT,
            legal_hold INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            instance_id INTEGER,
            heartbeat_at TEXT,
            cpu_percent TEXT,
            memory_percent TEXT,
            disk_percent TEXT,
            network_in_bytes INTEGER,
            network_out_bytes INTEGER,
            active_connections INTEGER,
            uptime_seconds INTEGER,
            open_file_count INTEGER,
            thread_count INTEGER,
            payload TEXT
        )"#,
        r#"CREATE TABLE ops_alert_event (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            payload_hash TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            retention_until TEXT,
            legal_hold INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            alert_no TEXT,
            severity INTEGER,
            source TEXT,
            title TEXT,
            message TEXT,
            alert_status INTEGER,
            first_seen_at TEXT,
            last_seen_at TEXT,
            resolved_at TEXT,
            resolved_by INTEGER
        )"#,
        r#"CREATE TABLE ops_metric_snapshot (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            source_type TEXT,
            source_id INTEGER,
            source_version INTEGER,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            rebuild_version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            metric_scope INTEGER,
            metric_name TEXT,
            metric_period INTEGER,
            period_start TEXT,
            period_end TEXT,
            dimension_key TEXT,
            dimension_value TEXT,
            metric_value TEXT,
            metric_unit TEXT,
            payload TEXT
        )"#,
        r#"CREATE TABLE ops_referral_stat_snapshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            source_type TEXT,
            source_id INTEGER,
            source_version INTEGER,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            rebuild_version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            inviter_user_id INTEGER,
            inviter_name_snapshot TEXT,
            inviter_email_snapshot TEXT,
            invitation_code_id INTEGER,
            invitation_code TEXT,
            invite_link TEXT,
            snapshot_period TEXT,
            period_start TEXT,
            period_end TEXT,
            total_invited_count INTEGER,
            direct_invited_count INTEGER,
            secondary_invited_count INTEGER,
            paid_invitee_count INTEGER,
            total_revenue_amount TEXT,
            reward_awarded_amount TEXT,
            reward_pending_amount TEXT,
            currency TEXT,
            snapshot_at TEXT
        )"#,
        r#"CREATE TABLE ops_notification_message (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            app_id TEXT,
            scope_type INTEGER NOT NULL DEFAULT 1,
            message_code TEXT,
            message_type INTEGER,
            title TEXT,
            summary TEXT,
            content TEXT,
            severity INTEGER,
            priority INTEGER NOT NULL DEFAULT 0,
            show_as_popup INTEGER NOT NULL DEFAULT 0,
            action_url TEXT,
            published_at TEXT,
            expire_at TEXT
        )"#,
        r#"CREATE TABLE ops_notification_recipient (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            message_id INTEGER NOT NULL,
            app_id TEXT,
            recipient_type INTEGER NOT NULL,
            recipient_value TEXT,
            recipient_user_id INTEGER,
            recipient_role_code TEXT
        )"#,
        r#"CREATE TABLE ops_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            operator_id INTEGER,
            action TEXT,
            target_type INTEGER,
            target_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            retention_until TEXT,
            legal_hold INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            operator_type INTEGER,
            operator_name_snapshot TEXT,
            target_uuid TEXT,
            client_ip_hash TEXT,
            user_agent_hash TEXT,
            before_hash TEXT,
            after_hash TEXT,
            change_summary TEXT,
            risk_level INTEGER,
            approval_id INTEGER
        )"#,
        r#"CREATE TABLE ops_config_snapshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            payload_hash TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            retention_until TEXT,
            legal_hold INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            snapshot_no TEXT,
            config_scope INTEGER,
            config_type INTEGER,
            source_table TEXT,
            source_ids TEXT,
            config_payload TEXT,
            config_hash TEXT,
            published_at TEXT,
            published_by INTEGER,
            rollback_from_snapshot_id INTEGER
        )"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_catalog(pool: &SqlitePool) {
    for statement in [
        "INSERT INTO ai_model_vendor (id, tenant_id, organization_id, vendor_code, display_name, status, sort_order) VALUES (1, 100001, 0, 'openai', 'OpenAI', 1, 1)",
        r#"INSERT INTO ai_model
            (id, catalog_key, model, display_name, vendor_code, capabilities, status, rank_score)
            VALUES (1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'GPT-4o mini', 'openai', '["chat"]', 1, '100.0')"#,
        "INSERT INTO ai_provider (id, tenant_id, organization_id, provider_code, default_vendor_code, provider_type, protocol_code, base_url, status) VALUES (2, 100001, 0, 'openrouter', 'openai', 'relay_aggregator', 'openai_v1', 'http://provider-proxy.internal/openrouter-template', 1)",
        "INSERT INTO ai_channel (id, tenant_id, organization_id, provider_id, provider_code, channel_code, channel_name, channel_type, base_url, credential_ref, status, priority, weight, health_status) VALUES (3001, 100001, 0, 2, 'openrouter', 'openrouter-main', 'OpenRouter Main', 'relay', 'http://provider-proxy.internal/openrouter', 'vault://providers/openrouter/account/main', 1, 10, 100, 1)",
        "INSERT INTO ai_channel_credential (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code, credential_name, auth_config, credential_ref, credential_hash, base_url, priority, weight, health_status, status) VALUES (300101, 'channel-credential-openrouter-main', 100001, 0, 3001, 'openrouter', 'openrouter-main', 'primary', '{}', 'vault://providers/openrouter/account/main', 'hash:openrouter-main', 'http://provider-proxy.internal/openrouter', 1, 100, 1, 1)",
        r#"INSERT INTO ai_routing_profile
            (id, uuid, tenant_id, organization_id, policy_id, profile_version, profile_name, release_status, traffic_percent, config_hash, status)
            VALUES (9301, 'routing-profile-standard-group-admin-api-test', 100001, 0, 9300, 1, 'Standard Group Profile', 2, '100.000000', 'standard-group-profile-hash', 1)"#,
        r#"INSERT INTO ai_routing_policy
            (id, uuid, tenant_id, organization_id, policy_code, name, policy_scope, subject_id, capability, default_profile_id, fallback_mode, status)
            VALUES (9300, 'routing-policy-standard-group-admin-api-test', 100001, 0, 'standard-group-policy', 'Standard Group Policy', 5, 100001, NULL, 9301, 1, 1)"#,
        r#"INSERT INTO ai_routing_rule
            (id, uuid, tenant_id, organization_id, profile_id, rule_code, priority, match_expression, target_model, candidate_channels, fallback_chain, constraints, status)
            VALUES (9302, 'routing-rule-standard-group-default-admin-api-test', 100001, 0, 9301, 'standard-group-default', 1, '{"catalogKey":"*"}', NULL, '[{"channel_id":3001,"weight":100}]', '[]', '{}', 1)"#,
        "INSERT INTO ai_pricing_plan (id, plan_code, base_price_side, default_multiplier, default_markup_amount, currency, status, priority) VALUES (1, 'standard', 1, '1.200000', '0.000000', 'USD', 1, 1)",
        "INSERT INTO ai_channel_group (id, tenant_id, organization_id, group_code, group_name, provider_code, group_type, pricing_plan_code, billing_type, rate_multiplier, official_price_multiplier, status) VALUES (10, 100001, 0, 'standard-group', 'Standard Group', 'openai', 2, 'standard', 1, '1.000000', '1.100000', 1)",
        "INSERT INTO ai_channel_group_member (id, tenant_id, organization_id, channel_group_id, channel_id, priority, weight, enabled, status) VALUES (600, 100001, 0, 10, 3001, 1, 100, 1, 1)",
        "INSERT INTO ai_channel_group_metric_snapshot (id, uuid, tenant_id, organization_id, provider_code, channel_group_id, account_available_count, account_total_count, channel_available_count, channel_total_count, capacity_used, capacity_limit, usage_amount_today, usage_amount_total, snapshot_at, health_status, status) VALUES (800, 'channel-group-metric-standard-admin-api-test', 100001, 0, 'openrouter', 10, 1, 1, 1, 1, '37.500000', '1000.000000', '12.500000', '37.500000', '2026-04-29 00:00:00', 1, 1)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_code, status, sort_order) VALUES (9101, 'resource-vendor-openai-admin-api-test', 100001, 0, 'vendor.openai', 'vendor', 'OpenAI', 'openai', 1, 1)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, modality_code, status, sort_order) VALUES (9102, 'resource-modality-llm-admin-api-test', 100001, 0, 'modality.llm', 'modality', 'LLM', 'llm', 1, 2)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, api_code, status, sort_order) VALUES (9103, 'resource-api-openai-chat-admin-api-test', 100001, 0, 'api.openai.chat_completions', 'api_endpoint', 'OpenAI Chat Completions', 'openai.chat_completions', 1, 3)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_code, modality_code, api_code, catalog_key, model, provider_native_model, status, sort_order) VALUES (9104, 'resource-model-openai-gpt-4o-mini-admin-api-test', 100001, 0, 'model.openai.gpt-4o-mini.chat', 'model_api', 'GPT-4o mini Chat', 'openai', 'chat', 'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini', 1, 4)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, modality_code, status, sort_order) VALUES (9105, 'resource-modality-image-admin-api-test', 100001, 0, 'modality.image', 'modality', 'Image', 'image', 1, 5)",
        "INSERT INTO ai_resource_group (id, uuid, tenant_id, organization_id, group_code, group_name, group_type, selection_mode, status, sort_order) VALUES (9201, 'resource-group-openrouter-openai-admin-api-test', 100001, 0, 'bundle.openrouter.openai.standard', 'OpenRouter OpenAI Standard', 'relay_bundle', 'manual', 1, 1)",
        "INSERT INTO ai_resource_group_item (id, uuid, tenant_id, organization_id, resource_group_id, resource_group_code, item_type, resource_id, resource_code, item_role, status, sort_order) VALUES (9202, 'resource-group-item-openrouter-gpt-4o-mini-admin-api-test', 100001, 0, 9201, 'bundle.openrouter.openai.standard', 'resource', 9104, 'model.openai.gpt-4o-mini.chat', 'include', 1, 1)",
        "INSERT INTO ai_channel_resource (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code, resource_group_id, resource_group_code, grant_type, priority, status) VALUES (9203, 'channel-resource-openrouter-openai-admin-api-test', 100001, 0, 3001, 'openrouter', 'openrouter-main', 9201, 'bundle.openrouter.openai.standard', 'allow', 1, 1)",
        "INSERT INTO ai_channel_group_resource (id, uuid, tenant_id, organization_id, channel_group_id, resource_group_id, resource_group_code, grant_type, priority, status) VALUES (9204, 'channel-group-resource-openrouter-openai-admin-api-test', 100001, 0, 10, 9201, 'bundle.openrouter.openai.standard', 'allow', 1, 1)",
        "INSERT INTO iam_gateway_api_key (id, tenant_id, organization_id, user_id, channel_group_id, key_prefix, key_hash, idempotency_key, status) VALUES (100, 100001, 0, 30, 10, 'sk-test', 'hash:sk-test', 'seed-api-key-100', 1)",
        "INSERT INTO iam_gateway_api_key_channel_group (id, uuid, tenant_id, organization_id, user_id, api_key_id, channel_group_id, channel_group_code, binding_role, routing_strategy, priority, weight, status) VALUES (1000, 'gateway-api-key-channel-group-standard-admin-api-test', 100001, 0, 30, 100, 10, 'standard-group', 'route', 'auto', 100, 100, 1)",
        r#"INSERT INTO iam_user (id, tenant_id, username, display_name, email, phone, avatar_media_resource_id, avatar_object_blob_id, avatar_resource_snapshot, status, created_at, updated_at) VALUES ('1', '100001', 'bootstrap-admin', 'Bootstrap Admin', 'bootstrap-admin@example.com', '', 'media-bootstrap-admin-avatar', 'iam-user-avatar:bootstrap-admin', '{"kind":"image","source":"provider_asset","uri":"iam-user-avatar:bootstrap-admin"}', 'active', '2026-04-01 08:00:00', '2026-04-29 08:30:00')"#,
        "INSERT INTO iam_organization (id, tenant_id, parent_id, code, name, path, status, created_at, updated_at) VALUES ('0', '100001', NULL, 'root', 'SDKWork Operations', '/0', 'active', '2026-04-01 08:00:00', '2026-04-29 08:30:00')",
        "INSERT INTO iam_organization_membership (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, left_at, remark, created_at, updated_at) VALUES ('member-1-admin', '100001', '0', '1', 'admin', 'Bootstrap Admin', 1, 'active', '2026-04-01 08:00:00', NULL, 'seed bootstrap admin membership', '2026-04-01 08:00:00', '2026-04-29 08:30:00')",
        "INSERT INTO ai_model_pricing (id, catalog_key, model, vendor_code, region_code, price_side, billing_meter_code, unit_price, currency, status, priority) VALUES (1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 'global', 1, 'llm_input_token', '0.150000', 'USD', 1, 1)",
        "INSERT INTO ai_model_pricing (id, catalog_key, model, vendor_code, region_code, price_side, billing_meter_code, unit_price, currency, provider_code, channel_id, status, priority) VALUES (2, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 'global', 2, 'llm_input_token', '0.110000', 'USD', 'openrouter', 3001, 1, 1)",
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_admin_users(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO iam_user
            (id, tenant_id, username, display_name, email, phone, avatar_media_resource_id, avatar_object_blob_id, avatar_resource_snapshot, status, created_at, updated_at)
            VALUES ('30', '100001', 'owner', 'Owner', 'owner@example.com', '', 'media-owner-avatar', 'iam-user-avatar:owner', '{"kind":"image","source":"provider_asset","uri":"iam-user-avatar:owner"}', 'active', '2026-04-01 08:00:00', '2026-04-29 08:30:00')"#,
        r#"INSERT INTO iam_organization_membership
            (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, left_at, remark, created_at, updated_at)
            VALUES ('member-30-admin', '100001', '0', '30', 'admin', 'Owner', 1, 'active', '2026-04-01 08:00:00', NULL, 'seed admin membership', '2026-04-01 08:00:00', '2026-04-29 08:30:00')"#,
        r#"INSERT INTO commerce_account
            (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code, available_amount, frozen_amount, version, status, created_at, updated_at)
            VALUES ('account-400', '100001', '0', '30', 'cash', 'USD', '25.5000', '0', 0, 'active', '2026-04-01 08:00:00', '2026-04-29 08:30:00')"#,
        r#"INSERT INTO iam_role
            (id, tenant_id, code, name, status, created_at, updated_at)
            VALUES ('role-admin', '100001', 'admin', 'Admin', 'active', '2026-04-01 08:00:00', '2026-04-01 08:00:00')"#,
        r#"INSERT INTO iam_permission
            (id, code, name, resource, action, created_at)
            VALUES ('permission-iam-read', 'iam.read', 'Read IAM', 'iam', 'read', '2026-04-01 08:00:00')"#,
        r#"INSERT INTO iam_role_permission
            (id, tenant_id, role_id, permission_id, created_at)
            VALUES ('role-admin-permission-iam-read', '100001', 'role-admin', 'permission-iam-read', '2026-04-01 08:00:00')"#,
        r#"INSERT INTO iam_user_role
            (id, tenant_id, user_id, role_id, organization_id, created_at)
            VALUES ('user-role-30-admin', '100001', '30', 'role-admin', '0', '2026-04-01 08:00:00')"#,
        r#"INSERT INTO iam_user_login_event
            (id, uuid, tenant_id, organization_id, user_id, request_id, auth_method, auth_provider, login_result, risk_level, mfa_verified, session_id_hash, occurred_at, created_at)
            VALUES (1, 'login-30', 100001, 0, 30, 'request-login-30', 2, 'trusted-subject-exchange', 1, 0, 1, 'session-hash-30', '2026-04-29 09:00:00', '2026-04-29 08:59:00')"#,
        r#"UPDATE iam_gateway_api_key
            SET name = 'Production',
                key_display_masked = 'sk-test********ABCD',
                last_used_at = '2026-04-29 09:05:00',
                updated_at = '2026-04-29 09:05:00'
            WHERE id = 100"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_admin_marketing(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO promotion_offer
            (id, tenant_id, organization_id, offer_no, offer_code, name, offer_type, audience_scope, combinability, priority, status, current_offer_version_id, starts_at, ends_at, created_at, updated_at)
            VALUES ('coupon-template-1', '100001', '0', 'offer-coupon-template-1', 'welcome-template', 'Welcome credit', 'coupon', 'all', 'exclusive', 0, 'active', 'coupon-template-1-version-v1', '2026-04-01 08:00:00', '2099-01-01 00:00:00', '2026-04-01 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO promotion_offer_version
            (id, tenant_id, organization_id, offer_id, version_no, lifecycle_status, discount_type, discount_value, minimum_amount, maximum_discount_amount, currency_code, rule_json, stack_rule_json, published_at, created_at, updated_at)
            VALUES ('coupon-template-1-version-v1', '100001', '0', 'coupon-template-1', 'v1', 'published', 'fixed_amount', '5.00', '0', NULL, 'USD', '{}', NULL, '2026-04-01 08:00:00', '2026-04-01 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO promotion_coupon_stock
            (id, tenant_id, organization_id, stock_no, name, offer_id, offer_version_id, stock_type, total_quantity, available_quantity, claimed_quantity, redeemed_quantity, locked_quantity, status, starts_at, expires_at, created_at, updated_at)
            VALUES ('stock-welcome-001', '100001', '0', 'stock-WELCOME-001', 'Welcome stock', 'coupon-template-1', 'coupon-template-1-version-v1', 'code_claim', 2, 1, 0, 1, 0, 'active', '2026-04-29 09:00:00', NULL, '2026-04-29 09:00:00', '2026-04-29 09:00:00')"#,
        r#"INSERT INTO promotion_code
            (id, tenant_id, organization_id, code_no, stock_id, offer_id, offer_version_id, promotion_code, code_type, max_claims, claimed_quantity, status, starts_at, expires_at, created_at, updated_at)
            VALUES ('501', '100001', '0', 'code-WELCOME-001-0001', 'stock-welcome-001', 'coupon-template-1', 'coupon-template-1-version-v1', 'WELCOME-0001', 'single_use', 1, 0, 'active', '2026-04-29 09:00:00', NULL, '2026-04-29 09:00:00', '2026-04-29 09:00:00')"#,
        r#"INSERT INTO promotion_code
            (id, tenant_id, organization_id, code_no, stock_id, offer_id, offer_version_id, promotion_code, code_type, max_claims, claimed_quantity, status, starts_at, expires_at, created_at, updated_at)
            VALUES ('502', '100001', '0', 'code-WELCOME-001-0002', 'stock-welcome-001', 'coupon-template-1', 'coupon-template-1-version-v1', 'WELCOME-0002', 'single_use', 1, 1, 'active', '2026-04-29 09:00:00', NULL, '2026-04-29 09:00:00', '2026-04-29 09:30:00')"#,
        r#"INSERT INTO promotion_user_coupon
            (id, tenant_id, organization_id, coupon_no, stock_id, code_id, offer_id, offer_version_id, subject_type, subject_id, owner_user_id, coupon_code, status, claimed_at, valid_from, expires_at, redeemed_at, disabled_at, request_no, idempotency_key, created_at, updated_at)
            VALUES ('user-coupon-502', '100001', '0', 'WELCOME-0002-user-coupon', 'stock-welcome-001', '502', 'coupon-template-1', 'coupon-template-1-version-v1', 'user', '30', '30', 'WELCOME-0002', 'redeemed', '2026-04-29 09:00:00', '2026-04-29 09:00:00', NULL, '2026-04-29 09:30:00', NULL, 'WELCOME-502', 'WELCOME-502', '2026-04-29 09:00:00', '2026-04-29 09:30:00')"#,
        r#"INSERT INTO commerce_payment_method
            (id, tenant_id, organization_id, method_key, display_name, provider, status, sort_weight, created_at, updated_at)
            VALUES ('payment-method-7', '100001', '0', '7', 'provider-7', 'provider-7', 'active', 1, '2026-04-01 08:00:00', '2026-04-01 08:00:00')"#,
        r#"INSERT INTO commerce_product_spu
            (id, tenant_id, organization_id, spu_no, title, subtitle, description, product_type, sales_status, visible_surfaces, created_at, updated_at)
            VALUES ('recharge-product-10-20-801', '100001', '0', 'recharge-product-801', 'Starter Recharge Pack', '', 'seed recharge product', 'points_recharge', 'active', '["app","console","admin"]', '2026-04-29 10:00:00', '2026-04-29 10:00:00')"#,
        r#"INSERT INTO commerce_product_spu_category
            (id, tenant_id, organization_id, spu_id, category_id, primary_flag, sort_order, status, created_at, updated_at)
            VALUES ('recharge-product-category-10-20-801', '100001', '0', 'recharge-product-10-20-801', 'commerce-recharge', 1, 0, 'active', '2026-04-29 10:00:00', '2026-04-29 10:00:00')"#,
        r#"INSERT INTO commerce_product_sku
            (id, tenant_id, organization_id, spu_id, sku_no, name, title, price_amount, original_price_amount, currency_code, delivery_mode, inventory_tracking, sales_status, spec_json, created_at, updated_at)
            VALUES ('recharge-sku-10-20-801', '100001', '0', 'recharge-product-10-20-801', 'recharge-sku-801', 'Starter Recharge Pack', 'Starter Recharge Pack', '10.00', '10.00', 'CNY', 'points_credit', 'untracked', 'active', '{}', '2026-04-29 10:00:00', '2026-04-29 10:00:00')"#,
        r#"INSERT INTO commerce_recharge_package
            (id, tenant_id, organization_id, external_id, package_no, sku_id, name, price_amount, currency_code, bonus_points, status, valid_from, valid_to, sort_weight, request_no, idempotency_key, created_at, updated_at)
            VALUES ('recharge-package-10-20-801', '100001', '0', 801, 'recharge-package-801', 'recharge-sku-10-20-801', 'Starter Recharge Pack', '10.00', 'CNY', 25, 'active', NULL, NULL, 1, 'recharge-package-801', 'recharge-package-801', '2026-04-29 10:00:00', '2026-04-29 10:00:00')"#,
        r#"INSERT INTO commerce_exchange_rule
            (id, tenant_id, organization_id, rule_no, source_asset_type, target_asset_type, rate, status, remark, request_no, idempotency_key, created_at, updated_at)
            VALUES ('exchange-1', '100001', '0', 'POINTS_TO_CASH', 'points', 'cash', '120.000000', 'active', 'Points to cash rate', 'exchange-1', 'exchange-1', '2026-04-29 10:00:00', '2026-04-29 10:00:00')"#,
        r#"INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, subject, currency_code, request_no, idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
            VALUES ('order-900', '100001', '0', '30', 'order-900', 'paid', 'points_recharge', 'USD', 'order-900', 'order-900', '2026-04-29 09:00:00', '2026-04-29 09:10:00', NULL, NULL, '2026-04-29 09:10:00')"#,
        r#"INSERT INTO commerce_payment_intent
            (id, tenant_id, organization_id, owner_user_id, order_id, provider, amount, currency_code, status, request_no, idempotency_key, created_at, updated_at)
            VALUES ('payment-intent-910', '100001', '0', '30', 'order-900', '7', '25.50', 'USD', 'succeeded', 'order-900', 'order-900', '2026-04-29 09:00:00', '2026-04-29 09:10:00')"#,
        r#"INSERT INTO commerce_payment_attempt
            (id, tenant_id, organization_id, owner_user_id, payment_intent_id, order_id, provider, out_trade_no, amount, currency_code, status, callback_payload, created_at, paid_at, updated_at)
            VALUES ('payment-910', '100001', '0', '30', 'payment-intent-910', 'order-900', '7', 'recharge-100', '25.50', 'USD', 'succeeded', '{"points":1000}', '2026-04-29 09:00:00', '2026-04-29 09:10:00', '2026-04-29 09:10:00')"#,
        r#"INSERT INTO ops_referral_stat_snapshot
            (id, uuid, tenant_id, organization_id, source_type, source_id, source_version, status, created_at, updated_at, rebuild_version, metadata, inviter_user_id, inviter_name_snapshot, inviter_email_snapshot, invitation_code_id, invitation_code, invite_link, snapshot_period, period_start, period_end, total_invited_count, direct_invited_count, secondary_invited_count, paid_invitee_count, total_revenue_amount, reward_awarded_amount, reward_pending_amount, currency, snapshot_at)
            VALUES (801, 'referral-801', 100001, 0, 'daily', 30, 1, 1, '2026-04-29 10:00:00', '2026-04-29 10:00:00', 0, '{}', 30, 'Owner', 'owner@example.com', 1, 'OWNER', 'https://claw.local/invite/OWNER', 'daily', '2026-04-29 00:00:00', '2026-04-29 23:59:59', 3, 2, 1, 1, '120.00', '12.00', '1.00', 'USD', '2026-04-29 10:00:00')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_admin_finance(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO commerce_account_ledger_entry
            (id, tenant_id, organization_id, account_id, owner_user_id, asset_type, direction, amount, balance_after, business_type, transaction_no, request_no, idempotency_key, source_type, source_id, remark, created_at)
            VALUES ('ledger-1000', '100001', '0', 'account-400', '30', 'cash', 'credit', '25.50', '125.50', 'recharge', 'pay-txn-900', 'pay-txn-900', 'pay-txn-900', 'payment', 'payment-910', 'Payment success', '2026-04-29 09:10:00')"#,
        r#"INSERT INTO commerce_account_ledger_entry
            (id, tenant_id, organization_id, account_id, owner_user_id, asset_type, direction, amount, balance_after, business_type, transaction_no, request_no, idempotency_key, source_type, source_id, remark, created_at)
            VALUES ('ledger-1001', '100001', '0', 'account-400', '30', 'cash', 'debit', '5.00', '120.50', 'refund', 'refund-txn-920', 'refund-txn-920', 'refund-txn-920', 'refund', 'refund-920', 'Refund completed', '2026-04-29 08:55:00')"#,
        r#"INSERT INTO commerce_invoice
            (id, tenant_id, organization_id, owner_user_id, invoice_no, title, invoice_type, status, amount_excluding_tax, tax_amount, total_amount, currency_code, issued_at, cancelled_at, failure_reason, request_no, idempotency_key, created_at, updated_at)
            VALUES ('invoice-1200', '100001', '0', '30', 'INV-202604', 'April usage', 'standard', 'draft', '80.00', '8.25', '88.25', 'USD', '2026-04-29 10:00:00', NULL, NULL, 'invoice-1200', 'invoice-1200', '2026-04-29 10:00:00', '2026-04-29 10:00:00')"#,
        r#"INSERT INTO commerce_usage_statement
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, statement_no, period, period_start, period_end, owner_type, owner_id, total_tokens, total_requests, total_cost, currency, statement_status, generated_at, due_at, payment_status, invoice_id)
            VALUES (1300, 'statement-1300', 100001, 0, 1, 1, '2026-04-29 10:00:00', '2026-04-29 10:00:00', 0, 'stmt-202604', '2026-04', '2026-04-01 00:00:00', '2026-04-30 23:59:59', 1, 30, 12000, 80, '88.25', 'USD', 1, '2026-04-29 10:00:00', '2026-05-10 00:00:00', 1, 'invoice-1200')"#,
        r#"INSERT INTO commerce_usage_settlement
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, settlement_no, account_id, account_ledger_entry_id, order_id, payment_id, asset_type, direction, amount, points, tokens, currency, settlement_status, settled_at)
            VALUES (1400, 'settlement-1400', 100001, 0, 1, 1, '2026-04-29 10:00:00', '2026-04-29 10:00:00', 0, 'settlement-1400', 'account-400', 'ledger-1000', 900, 910, 'points', 'debit', '88.25', 0, 12000, 'USD', 1, '2026-04-29 10:00:00')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_admin_record(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO ai_routing_decision_log
            (id, uuid, tenant_id, organization_id, user_id, request_id, status, created_at, requested_model, resolved_model)
            VALUES (100, 'decision-100', 100001, 0, 30, 'req-admin-record-1', 1, '2026-04-29 09:30:00', 'gpt-4o-mini', 'gpt-4o-mini')"#,
        r#"INSERT INTO ai_request_trace
            (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at, api_key_name_snapshot, channel_group_snapshot, owner_name_snapshot, requested_model_catalog_key, requested_model, provider_model, provider_native_model, region_code, endpoint, request_path, http_status, provider_error_code, error_type, started_at, latency_ms, ttft_ms, streaming, prompt_tokens, completion_tokens, cached_tokens, reasoning_effort, client_ip_masked)
            VALUES (100, 'trace-100', 100001, 0, 30, 'req-admin-record-1', 'trace-admin-record-1', 1, '2026-04-29 09:29:59', 'Production', 'standard-group', 'owner@example.com', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini-2026-05-13', 'global', '/v1/chat/completions', '/v1/chat/completions', 200, NULL, NULL, '2026-04-29 09:30:00', 842, 120, 1, 1000, 240, 100, 'medium', '203.0.113.***')"#,
        r#"INSERT INTO ai_usage_fact
            (id, uuid, tenant_id, organization_id, user_id, request_id, status, created_at, owner_name_snapshot, api_key_name_snapshot, channel_group_snapshot, catalog_key, requested_model_catalog_key, model, provider_native_model, region_code, modality, request_count, prompt_tokens, completion_tokens, cached_tokens, total_tokens, customer_charge_amount, cost_amount, rate_multiplier, base_input_unit_price, base_output_unit_price, cache_read_unit_price, occurred_at)
            VALUES (200, 'usage-200', 100001, 0, 30, 'req-admin-record-1', 1, '2026-04-29 09:30:01', 'owner@example.com', 'Production', 'standard-group', 'openai/gpt-4o-mini', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini-2026-05-13', 'global', 1, 1, 1200, 300, 128, 1628, '0.012300', '0.010000', '1.200000', '0.150000', '0.600000', '0.030000', '2026-04-29 09:30:01')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_admin_record_missing_latency(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO ai_routing_decision_log
            (id, uuid, tenant_id, organization_id, user_id, request_id, status, created_at, requested_model, resolved_model)
            VALUES (101, 'decision-101', 100001, 0, 30, 'req-admin-record-missing-latency', 1, '2026-04-29 09:31:00', 'gpt-4o-mini', 'gpt-4o-mini')"#,
        r#"INSERT INTO ai_request_trace
            (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at, api_key_name_snapshot, channel_group_snapshot, owner_name_snapshot, requested_model_catalog_key, requested_model, provider_model, provider_native_model, region_code, endpoint, request_path, http_status, provider_error_code, error_type, started_at, latency_ms, ttft_ms, streaming, prompt_tokens, completion_tokens, cached_tokens, reasoning_effort, client_ip_masked)
            VALUES (101, 'trace-101', 100001, 0, 30, 'req-admin-record-missing-latency', 'trace-admin-record-missing-latency', 1, '2026-04-29 09:30:59', 'Production', 'standard-group', 'owner@example.com', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini-2026-05-13', 'global', '/v1/chat/completions', '/v1/chat/completions', 503, 'upstream_http_503', NULL, '2026-04-29 09:31:00', NULL, NULL, 0, 0, 0, 0, '-', '203.0.113.***')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_monitoring(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO ops_gateway_instance
            (id, uuid, tenant_id, organization_id, status, instance_code, region, host_name, ip_address_masked, node_name, health_status, started_at, last_heartbeat_at)
            VALUES (1, 'gw-node-1', 100001, 0, 1, 'gw-shanghai-01', 'cn-shanghai', 'gw-shanghai-host', '10.***.0.8', 'gw-shanghai-01', 2, '2026-04-24 05:00:00', '2026-04-29 09:00:00')"#,
        r#"INSERT INTO ops_gateway_heartbeat
            (id, uuid, tenant_id, organization_id, instance_id, heartbeat_at, cpu_percent, memory_percent, network_in_bytes, network_out_bytes, uptime_seconds)
            VALUES (1, 'heartbeat-1-old', 100001, 0, 1, '2026-04-29 08:55:00', '65.0', '60.0', 2048, 4096, 444000)"#,
        r#"INSERT INTO ops_gateway_heartbeat
            (id, uuid, tenant_id, organization_id, instance_id, heartbeat_at, cpu_percent, memory_percent, network_in_bytes, network_out_bytes, uptime_seconds)
            VALUES (2, 'heartbeat-1', 100001, 0, 1, '2026-04-29 09:00:00', '72.5', '63.0', 4096, 8192, 446400)"#,
        r#"INSERT INTO ops_alert_event
            (id, uuid, tenant_id, organization_id, status, alert_no, severity, source, title, message, alert_status, first_seen_at, last_seen_at)
            VALUES (1, 'alert-1', 100001, 0, 1, 'ALERT-001', 3, 'gateway', 'High error rate', '5xx error rate exceeded threshold', 1, '2026-04-29 08:58:00', '2026-04-29 09:00:00')"#,
        r#"INSERT INTO ops_metric_snapshot
            (id, uuid, tenant_id, organization_id, status, metric_scope, metric_name, metric_period, period_start, metric_value)
            VALUES (1, 'metric-1', 100001, 0, 1, 10, 'cpu_percent', 2, '2026-04-29 09:00:00', '41.0')"#,
        r#"INSERT INTO ops_metric_snapshot
            (id, uuid, tenant_id, organization_id, status, metric_scope, metric_name, metric_period, period_start, metric_value)
            VALUES (2, 'metric-2', 100001, 0, 1, 10, 'memory_percent', 2, '2026-04-29 09:00:00', '58.0')"#,
        r#"INSERT INTO ops_metric_snapshot
            (id, uuid, tenant_id, organization_id, status, metric_scope, metric_name, metric_period, period_start, metric_value)
            VALUES (3, 'metric-3', 100001, 0, 1, 10, 'network_mbps', 2, '2026-04-29 09:00:00', '122.0')"#,
        r#"INSERT INTO ops_metric_snapshot
            (id, uuid, tenant_id, organization_id, status, metric_scope, metric_name, metric_period, period_start, metric_value)
            VALUES (4, 'metric-4', 100001, 0, 1, 10, 'cpu_percent', 2, '2026-04-29 09:01:00', '42.0')"#,
        r#"INSERT INTO ops_metric_snapshot
            (id, uuid, tenant_id, organization_id, status, metric_scope, metric_name, metric_period, period_start, metric_value)
            VALUES (5, 'metric-5', 100001, 0, 1, 10, 'memory_percent', 2, '2026-04-29 09:01:00', '59.0')"#,
        r#"INSERT INTO ops_metric_snapshot
            (id, uuid, tenant_id, organization_id, status, metric_scope, metric_name, metric_period, period_start, metric_value)
            VALUES (6, 'metric-6', 100001, 0, 1, 10, 'network_mbps', 2, '2026-04-29 09:01:00', '124.0')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}
