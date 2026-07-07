use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, Request, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_claw_config::{
    ApiKeySecurityConfig, DatabaseConfig, DeploymentMode, ProviderSecretMapConfig,
};
use sdkwork_claw_test_support::{
    api_key_security_config as test_api_key_security_config,
    app_session_config as test_app_session_config, app_session_dual_token_headers,
    assert_server_generated_request_id, payment_webhook_config as test_payment_webhook_config,
    trusted_request_subject, trusted_subject_config as test_trusted_subject_config,
};
use sdkwork_clawrouter_router_service::application::{
    ApiKeySecretCodec, Pbkdf2Sha256PasswordHasher,
};
use sdkwork_clawrouter_router_service::infrastructure::crypto::RingAeadApiKeySecretCodec;
use serde_json::json;
use serde_json::Value;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};
use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, Once};
use std::time::{Duration as StdDuration, SystemTime, UNIX_EPOCH};
use tokio::time::{sleep, Duration};
use tower::ServiceExt;

const API_KEYS_PATH: &str = "/app/v3/api/iam/api_keys";
const TEST_SUBJECT_TENANT_ID: i64 = 100_001;
const TEST_SUBJECT_ORGANIZATION_ID: i64 = 0;
const TEST_SUBJECT_USER_ID: i64 = 30;

static SQLITE_DB_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Default)]
struct CapturedProviderHealthProbe {
    authorization: Option<String>,
    body: Value,
}

#[tokio::test]
async fn database_config_app_api_keys_are_mounted_locally() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;

    let response = router
        .clone()
        .oneshot(
            session_authorization_header(
                Request::builder().method("GET").uri(API_KEYS_PATH),
                TEST_SUBJECT_TENANT_ID,
                TEST_SUBJECT_ORGANIZATION_ID,
                TEST_SUBJECT_USER_ID,
            )
            .body(Body::empty())
            .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status(), "GET {API_KEYS_PATH}");
}

#[tokio::test]
async fn database_config_app_model_catalog_refreshes_runtime_snapshot_after_database_change() {
    let _refresh_interval = EnvOverride::set(
        "SDKWORK_CLAW_PROVIDER_CATALOG_REFRESH_INTERVAL_MILLIS",
        "25",
    );
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    pool.close().await;

    let router = configured_router_with_catalog_refresh(&database_url).await;
    let (_, initial_payload, _) = request_json(
        router.clone(),
        Request::builder()
            .method("GET")
            .uri("/app/v3/api/ai/models")
            .body(Body::empty())
            .unwrap(),
    )
    .await;
    assert!(!model_catalog_contains(&initial_payload, "gpt-4o-refresh"));

    let update_pool = create_sqlite_pool(&database_url).await;
    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name, vendor_code, capabilities, release_stage, shelf_state, routing_state, status, rank_score)
        VALUES
            (99, 'model-refresh-99', 0, 0, 'openai/gpt-4o-refresh', 'gpt-4o-refresh', 'GPT-4o refresh', 'openai', '["chat"]', 1, 1, 1, 1, '90.0')
        "#,
    )
    .execute(&update_pool)
    .await
    .unwrap();
    let refresh_resource_id = sqlx::query(
        r#"
        INSERT INTO ai_resource
            (uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_code, modality_code, api_code, catalog_key, model, provider_native_model, status, sort_order)
        VALUES
            ('resource-model-openai-gpt-4o-refresh-chat-app-api-test', 100001, 0, 'model.openai.gpt-4o-refresh.chat', 'model_api', 'GPT-4o refresh Chat', 'openai', 'chat', 'openai.chat_completions', 'openai/gpt-4o-refresh', 'gpt-4o-refresh', 'gpt-4o-refresh', 1, 99)
        "#,
    )
    .execute(&update_pool)
    .await
    .unwrap()
    .last_insert_rowid();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource
            (uuid, tenant_id, organization_id, channel_id, provider_code, channel_code, resource_id, resource_code, grant_type, priority, status)
        VALUES
            ('channel-resource-openroutes-gpt-4o-refresh-app-api-test', 100001, 0, 3001, 'openrouter', 'openrouter-main', ?1, 'model.openai.gpt-4o-refresh.chat', 'allow', 1, 1)
        "#,
    )
    .bind(refresh_resource_id)
    .execute(&update_pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_resource
            (uuid, tenant_id, organization_id, channel_group_id, resource_id, resource_code, grant_type, priority, status)
        VALUES
            ('channel-group-resource-openroutes-gpt-4o-refresh-app-api-test', 100001, 0, 10, ?1, 'model.openai.gpt-4o-refresh.chat', 'allow', 1, 1)
        "#,
    )
    .bind(refresh_resource_id)
    .execute(&update_pool)
    .await
    .unwrap();
    update_pool.close().await;

    let mut refreshed_payload = Value::Null;
    for _ in 0..40 {
        let (_, payload, _) = request_json(
            router.clone(),
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/models")
                .body(Body::empty())
                .unwrap(),
        )
        .await;
        if model_catalog_contains(&payload, "gpt-4o-refresh") {
            return;
        }
        refreshed_payload = payload;
        sleep(Duration::from_millis(50)).await;
    }

    panic!("refreshed app model catalog did not include gpt-4o-refresh: {refreshed_payload}");
}

#[tokio::test]
async fn database_config_dashboard_scopes_metrics_to_app_session_subject() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_app_user_data(&pool).await;
    seed_dashboard_data(&pool).await;
    pool.close().await;

    let (status, payload, body_text) = request_json(
        configured_router(&database_url).await,
        session_request(
            "GET",
            "/app/v3/api/ai/dashboard/overview?time_range=daily&start_time=2026-04-29T00:00:00Z&end_time=2026-04-29T23:59:59Z",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;

    assert_eq!(StatusCode::OK, status, "{body_text}");
    assert_eq!("2000", payload["code"]);
    assert_eq!(7, payload["data"]["summary"]["requestCount"]);
    assert_eq!(1.25, payload["data"]["summary"]["usedCredits"]);
    assert_eq!(10, payload["data"]["summary"]["totalRequestCount"]);
    assert_eq!(3.0, payload["data"]["summary"]["totalUsedCredits"]);
    assert_eq!(1, payload["data"]["summary"]["errorCount"]);
    assert_eq!(2, payload["data"]["summary"]["imageRequests"]);
    assert_eq!("2026-04-29", payload["data"]["chartData"][0]["time"]);
    assert_eq!(5.0, payload["data"]["chartData"][0]["llm (Text)"]);
    assert_eq!(
        2.0,
        payload["data"]["chartData"][0]["image (Midjourney/DALL-E)"]
    );
    let top_models = payload["data"]["topModels"].as_array().unwrap();
    assert!(!top_models.is_empty());
    assert!(top_models.iter().any(|item| item["name"] == "qwen3.7-max"));
    assert_eq!(
        "Planned model upgrade",
        payload["data"]["announcements"][0]["text"]
    );
    assert!(!body_text.contains("99.000000"));
    assert!(!body_text.contains("other-user-request"));
}

#[tokio::test]
async fn database_config_billing_redeem_persists_points_and_history_for_subject() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_app_user_data(&pool).await;
    seed_billing_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;

    let (redeem_status, redeem_payload, redeem_body_text) = request_json(
        router.clone(),
        session_request_builder(
            "POST",
            "/app/v3/api/promotions/codes/redemptions",
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        )
        .header("content-type", "application/json")
        .header("Idempotency-Key", "redeem-idem-standard-1")
        .header(
            "Sdkwork-Request-Hash",
            app_write_request_hash("promotions.codes.redeem", r#"{"code":"WELCOME"}"#),
        )
        .header("Sdkwork-Request-No", "redeem-request-standard-1")
        .body(Body::from(r#"{"code":"WELCOME"}"#))
        .unwrap(),
    )
    .await;

    assert_eq!(StatusCode::OK, redeem_status);
    assert_eq!("2000", redeem_payload["code"]);
    assert_eq!("Promotion code redeemed", redeem_payload["data"]["message"]);
    assert_eq!("5.00", redeem_payload["data"]["amount"]);
    assert_eq!(50, redeem_payload["data"]["creditedPoints"]);
    assert_eq!(150, redeem_payload["data"]["balance"]);
    assert!(!redeem_body_text.contains("OTHERUSER"));

    let (history_status, history_payload, history_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/promotions/user_coupons",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;

    assert_eq!(StatusCode::OK, history_status);
    assert_eq!("2000", history_payload["code"]);
    assert_eq!(1, history_payload["data"].as_array().unwrap().len());
    assert_eq!("5.00", history_payload["data"][0]["amount"]);
    assert_eq!("success", history_payload["data"][0]["status"]);
    assert!(!history_body_text.contains("OTHERUSER"));

    let (points_status, points_payload, _points_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/wallet/points",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, points_status);
    assert_eq!("2000", points_payload["code"]);
    assert_eq!(150, points_payload["data"]["availablePoints"]);
    assert_eq!(0, points_payload["data"]["frozenPoints"]);

    let (points_history_status, points_history_payload, points_history_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/wallet/points/history",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, points_history_status);
    assert_eq!("2000", points_history_payload["code"]);
    assert_eq!(1, points_history_payload["data"].as_array().unwrap().len());
    assert_eq!(50, points_history_payload["data"][0]["amount"]);
    assert_eq!("in", points_history_payload["data"][0]["direction"]);
    assert_eq!(150, points_history_payload["data"][0]["balanceAfter"]);
    assert!(!points_history_body_text.contains("other-points-account"));

    let verification_pool = create_sqlite_pool(&database_url).await;
    let available_points: i64 = sqlx::query_scalar(
        "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE tenant_id = '100001' AND organization_id = '0' AND owner_user_id = '30' AND asset_type = 'points'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let other_available_points: i64 = sqlx::query_scalar(
        "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE tenant_id = '100001' AND organization_id = '0' AND owner_user_id = '31' AND asset_type = 'points'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let claimed_count: i64 = sqlx::query_scalar(
        "SELECT claimed_quantity FROM promotion_coupon_stock WHERE id = 'stock-welcome'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    verification_pool.close().await;

    assert_eq!(150, available_points);
    assert_eq!(900, other_available_points);
    assert_eq!(1, claimed_count);
}

#[tokio::test]
async fn database_config_billing_redeem_replays_same_idempotency_key_via_appbase_store() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_app_user_data(&pool).await;
    seed_billing_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    for _ in 0..2 {
        let (status, payload, body_text) = request_json(
            router.clone(),
            session_request_builder(
                "POST",
                "/app/v3/api/promotions/codes/redemptions",
                TEST_SUBJECT_TENANT_ID,
                TEST_SUBJECT_ORGANIZATION_ID,
                TEST_SUBJECT_USER_ID,
            )
            .header("content-type", "application/json")
            .header("Idempotency-Key", "redeem-idem-1")
            .header("Sdkwork-Request-No", "redeem-request-1")
            .body(Body::from(r#"{"code":"WELCOME"}"#))
            .unwrap(),
        )
        .await;

        assert_eq!(StatusCode::OK, status, "{body_text}");
        assert_eq!("2000", payload["code"], "{body_text}");
        assert_eq!(50, payload["data"]["creditedPoints"], "{body_text}");
        assert_eq!(150, payload["data"]["balance"], "{body_text}");
    }

    let verification_pool = create_sqlite_pool(&database_url).await;
    let ledger_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM commerce_account_ledger_entry WHERE tenant_id = '100001' AND organization_id = '0' AND owner_user_id = '30' AND asset_type = 'points'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let coupon_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM promotion_user_coupon WHERE tenant_id = '100001' AND organization_id = '0' AND owner_user_id = '30'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let available_points: i64 = sqlx::query_scalar(
        "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE tenant_id = '100001' AND organization_id = '0' AND owner_user_id = '30' AND asset_type = 'points'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    verification_pool.close().await;

    assert_eq!(1, ledger_count);
    assert_eq!(1, coupon_count);
    assert_eq!(150, available_points);
}

#[tokio::test]
async fn database_config_wallet_accounts_uses_appbase_commerce_store() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_app_user_data(&pool).await;
    seed_billing_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let (status, payload, body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/wallet/accounts",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!("2000", payload["code"]);
    let accounts = payload["data"].as_array().unwrap();
    assert_eq!(2, accounts.len());
    let points_account = accounts
        .iter()
        .find(|account| account["id"] == "owner-points-account")
        .expect("owner points account");
    assert_eq!("points", points_account["assetType"]);
    assert_eq!("100", points_account["availableAmount"]);
    assert_eq!("0", points_account["frozenAmount"]);
    let token_account = accounts
        .iter()
        .find(|account| account["id"] == "owner-token-account")
        .expect("owner token account");
    assert_eq!("token", token_account["assetType"]);
    assert_eq!("120", token_account["availableAmount"]);
    assert_eq!("8", token_account["frozenAmount"]);
    assert!(!body_text.contains("other-points-account"));
    assert!(!body_text.contains("other-token-account"));

    let (token_status, token_payload, token_body_text) = request_json(
        router,
        session_request(
            "GET",
            "/app/v3/api/wallet/tokens",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;

    assert_eq!(StatusCode::OK, token_status, "{token_body_text}");
    assert_eq!("2000", token_payload["code"], "{token_body_text}");
    assert_eq!(120, token_payload["data"]["availableTokens"]);
    assert_eq!(8, token_payload["data"]["frozenTokens"]);
    assert!(!token_body_text.contains("other-token-account"));
}

#[tokio::test]
async fn database_config_billing_reads_return_empty_defaults_when_optional_read_models_are_absent()
{
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_app_user_data(&pool).await;
    for table in [
        "promotion_coupon_ledger_entry",
        "promotion_discount_application",
        "promotion_user_coupon",
        "promotion_code",
        "promotion_coupon_stock",
        "promotion_offer_version",
        "promotion_offer",
        "commerce_billing_history",
        "commerce_idempotency_key",
        "commerce_account_ledger_entry",
        "commerce_account",
        "commerce_order_amount_breakdown",
        "commerce_order_item",
        "commerce_payment_attempt",
        "commerce_payment_intent",
        "commerce_order",
        "commerce_recharge_package",
        "commerce_payment_method",
        "commerce_product_spu",
        "commerce_product_sku",
        "iam_user_security_setting",
        "iam_user_login_event",
        "ai_usage",
    ] {
        sqlx::query(&format!("DROP TABLE {table}"))
            .execute(&pool)
            .await
            .unwrap();
    }
    pool.close().await;

    let router = configured_router(&database_url).await;

    for uri in [
        "/app/v3/api/promotions/user_coupons",
        "/app/v3/api/wallet/points/history",
    ] {
        let (status, payload, body_text) = request_json(
            router.clone(),
            session_request("GET", uri, Body::empty(), 100001, 0, 30),
        )
        .await;
        assert_eq!(StatusCode::OK, status, "{uri}: {body_text}");
        assert_eq!("2000", payload["code"], "{uri}: {body_text}");
        assert_eq!(
            0,
            payload["data"].as_array().unwrap().len(),
            "{uri}: {body_text}"
        );
    }

    let (recharge_packages_status, recharge_packages_payload, recharge_packages_body_text) =
        request_json(
            router.clone(),
            session_request(
                "GET",
                "/app/v3/api/recharges/packages",
                Body::empty(),
                TEST_SUBJECT_TENANT_ID,
                TEST_SUBJECT_ORGANIZATION_ID,
                TEST_SUBJECT_USER_ID,
            ),
        )
        .await;
    assert_eq!(
        StatusCode::OK,
        recharge_packages_status,
        "{recharge_packages_body_text}"
    );
    assert_eq!(
        "2000", recharge_packages_payload["code"],
        "{recharge_packages_body_text}"
    );
    let default_recharge_packages = recharge_packages_payload["data"]["items"]
        .as_array()
        .unwrap();
    assert_eq!(
        9,
        default_recharge_packages.len(),
        "{recharge_packages_body_text}"
    );
    for (price_amount, points) in [
        ("5.00", 50),
        ("10.00", 100),
        ("20.00", 200),
        ("30.00", 300),
        ("50.00", 500),
        ("100.00", 1000),
        ("200.00", 2000),
        ("500.00", 5000),
        ("1000.00", 10000),
    ] {
        assert!(
            default_recharge_packages
                .iter()
                .any(|package| package["priceAmount"] == price_amount
                    && package["currencyCode"] == "CNY"
                    && package["points"] == points),
            "{price_amount}: {recharge_packages_body_text}"
        );
    }

    let (billing_history_status, billing_history_payload, billing_history_body_text) =
        request_json(
            router.clone(),
            session_request(
                "GET",
                "/app/v3/api/billing/history",
                Body::empty(),
                TEST_SUBJECT_TENANT_ID,
                TEST_SUBJECT_ORGANIZATION_ID,
                TEST_SUBJECT_USER_ID,
            ),
        )
        .await;
    assert_eq!(
        StatusCode::OK,
        billing_history_status,
        "{billing_history_body_text}"
    );
    assert_eq!(
        "2000", billing_history_payload["code"],
        "{billing_history_body_text}"
    );
    assert_eq!(
        0,
        billing_history_payload["data"]["items"]
            .as_array()
            .unwrap()
            .len(),
        "{billing_history_body_text}"
    );

    let (points_status, points_payload, points_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/wallet/points",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, points_status, "{points_body_text}");
    assert_eq!("2000", points_payload["code"], "{points_body_text}");
    assert_eq!(0, points_payload["data"]["availablePoints"]);
    assert_eq!(0, points_payload["data"]["frozenPoints"]);

    let (summary_status, summary_payload, summary_body_text) = request_json(
        router,
        session_request(
            "GET",
            "/app/v3/api/accounts/current/summary",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, summary_status, "{summary_body_text}");
    assert_eq!("2000", summary_payload["code"], "{summary_body_text}");
    assert_eq!("30", summary_payload["data"]["id"]);
    assert_eq!(0.0, summary_payload["data"]["availableCredits"]);
    assert_eq!(0.0, summary_payload["data"]["monthlyConsumption"]);
    assert_eq!(
        0,
        summary_payload["data"]["consumptionByService"]
            .as_array()
            .unwrap()
            .len()
    );
    assert_eq!(
        0,
        summary_payload["data"]["loginLogs"]
            .as_array()
            .unwrap()
            .len()
    );
    assert_eq!(false, summary_payload["data"]["security"]["mfaEnabled"]);
}

#[tokio::test]
async fn database_config_payment_aggregate_create_uses_sqlite_runtime_store_and_is_idempotent() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let request_body = json!({
        "merchantOrderNo": "aggregate-order-1001",
        "amount": {"currency": "CNY", "value": "88.50"},
        "subject": "standard checkout",
        "providerCode": "stripe",
        "paymentMethod": "card",
        "scene": "web"
    })
    .to_string();

    let (create_status, create_payload, create_body_text) = request_json(
        router.clone(),
        session_request_builder("POST", "/payments/v3/payment_intents", 100001, 0, 30)
            .header("content-type", "application/json")
            .header("Idempotency-Key", "aggregate-create-idem-1001")
            .body(Body::from(request_body.clone()))
            .unwrap(),
    )
    .await;
    let first_intent_id = create_payload["data"]["item"]["id"]
        .as_str()
        .unwrap()
        .to_owned();

    assert_eq!(StatusCode::OK, create_status, "{create_body_text}");
    assert_eq!("2000", create_payload["code"], "{create_body_text}");
    assert_eq!(
        "aggregate-order-1001",
        create_payload["data"]["item"]["merchantOrderNo"]
    );
    assert_eq!("stripe", create_payload["data"]["item"]["providerCode"]);
    assert_eq!(
        "requires_confirmation",
        create_payload["data"]["item"]["status"]
    );

    let (duplicate_status, duplicate_payload, duplicate_body_text) = request_json(
        router.clone(),
        session_request_builder("POST", "/payments/v3/payment_intents", 100001, 0, 30)
            .header("content-type", "application/json")
            .header("Idempotency-Key", "aggregate-create-idem-1001")
            .body(Body::from(request_body))
            .unwrap(),
    )
    .await;

    assert_eq!(StatusCode::OK, duplicate_status, "{duplicate_body_text}");
    assert_eq!(
        first_intent_id,
        duplicate_payload["data"]["item"]["id"].as_str().unwrap()
    );

    let (refund_status, refund_payload, refund_body_text) = request_json(
        router,
        session_request_builder("POST", "/payments/v3/refunds", 100001, 0, 30)
            .header("content-type", "application/json")
            .header("Idempotency-Key", "aggregate-refund-idem-1001")
            .body(Body::from(
                json!({
                    "paymentIntentId": first_intent_id,
                    "merchantRefundNo": "aggregate-refund-1001",
                    "amount": {"currency": "CNY", "value": "10.00"},
                    "reason": "customer requested refund",
                    "items": [
                        {
                            "orderItemId": "aggregate-order-item-1001-1",
                            "quantity": 1,
                            "refundAmount": {"currency": "CNY", "value": "7.00"},
                            "taxRefundAmount": {"currency": "CNY", "value": "1.00"},
                            "shippingRefundAmount": {"currency": "CNY", "value": "0.00"}
                        },
                        {
                            "orderItemId": "aggregate-order-item-1001-2",
                            "quantity": 1,
                            "refundAmount": {"currency": "CNY", "value": "2.00"}
                        }
                    ]
                })
                .to_string(),
            ))
            .unwrap(),
    )
    .await;

    assert_eq!(
        StatusCode::UNPROCESSABLE_ENTITY,
        refund_status,
        "{refund_body_text}"
    );
    assert_eq!("4220", refund_payload["code"], "{refund_body_text}");
    assert!(refund_payload["msg"]
        .as_str()
        .unwrap()
        .contains("CreateRefund"));

    let pool = create_sqlite_pool(&database_url).await;
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_payment_intent WHERE tenant_id = '100001' AND organization_id = '0' AND owner_user_id = '30' AND merchant_order_no = 'aggregate-order-1001' AND subject = 'standard checkout' AND provider_code = 'stripe' AND payment_method = 'card' AND scene_code = 'web' AND idempotency_key = 'aggregate-create-idem-1001'"
        )
        .await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_payment_attempt WHERE tenant_id = '100001' AND provider = 'stripe' AND out_trade_no = 'aggregate-order-1001'"
        )
        .await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_payment_route_decision WHERE tenant_id = '100001' AND provider_code = 'stripe' AND method_code = 'card' AND scene_code = 'web'"
        )
        .await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_refund WHERE tenant_id = '100001' AND refund_no = 'aggregate-refund-1001' AND status = 'failed'"
        )
        .await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_refund_attempt WHERE tenant_id = '100001' AND out_refund_no = 'aggregate-refund-1001' AND status = 'FAILED'"
        )
        .await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_refund_event WHERE tenant_id = '100001' AND event_type = 'refund.failed'"
        )
        .await
    );
    assert_eq!(
        2,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_refund_item WHERE tenant_id = '100001' AND refund_id = (SELECT id FROM commerce_refund WHERE refund_no = 'aggregate-refund-1001')"
        )
        .await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_refund_item WHERE order_item_id = 'aggregate-order-item-1001-1' AND refund_amount = '7.00'"
        )
        .await
    );
    pool.close().await;
}

#[tokio::test]
async fn database_config_app_routing_routes_require_session_scope_and_redact_sensitive_data() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_app_routing_runtime_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let unauthenticated_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/routing/api_keys")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::UNAUTHORIZED, unauthenticated_response.status());

    let (channels_status, channels_payload, channels_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/ai/routing/channels",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, channels_status, "{channels_body_text}");
    assert_eq!("2000", channels_payload["code"]);
    assert_eq!(
        "OpenAI Primary",
        channels_payload["data"]["items"][0]["name"]
    );
    assert_eq!(
        "vault-label-openai-main",
        channels_payload["data"]["items"][0]["apiKey"]
    );
    assert_eq!(
        "llm",
        channels_payload["data"]["items"][0]["capabilities"][0]
    );
    assert_eq!(
        true,
        channels_payload["data"]["items"][0]["models"]
            .as_array()
            .is_some_and(Vec::is_empty)
    );
    assert!(!channels_body_text.contains("vault://providers/openai/main"));
    assert!(!channels_body_text.contains("Other Tenant Channel"));

    let (keys_status, keys_payload, keys_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/ai/routing/api_keys",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, keys_status);
    assert_eq!("Owner Key", keys_payload["data"]["items"][0]["name"]);
    assert_eq!(
        "sk-owner********ABCD",
        keys_payload["data"]["items"][0]["displayKey"]
    );
    assert_eq!(
        "sk-owner-secret",
        keys_payload["data"]["items"][0]["copyableKey"]
    );
    assert_eq!("5", keys_payload["data"]["items"][0]["totalUsage"]);
    assert!(!keys_body_text.contains("Other User Key"));
    assert!(!keys_body_text.contains("hash:owner"));

    let (traces_status, traces_payload, traces_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/ai/routing/request_traces",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, traces_status);
    assert_eq!("4005", traces_payload["data"]["items"][0]["id"]);
    assert_eq!("gpt-4o-mini", traces_payload["data"]["items"][0]["model"]);
    assert_eq!(
        "OpenAI Primary",
        traces_payload["data"]["items"][0]["channel"]
    );
    assert_eq!(200, traces_payload["data"]["items"][0]["status"]);
    assert!(!traces_body_text.contains("other-user-runtime-request"));

    let (usage_status, usage_payload, usage_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/ai/routing/usage",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, usage_status);
    assert_eq!(1, usage_payload["data"]["chartData"][0]["requests"]);
    assert_eq!("gpt-4o-mini", usage_payload["data"]["modelStats"][0]["m"]);
    assert_eq!("1", usage_payload["data"]["modelStats"][0]["req"]);
    assert_eq!("100.0%", usage_payload["data"]["modelStats"][0]["sr"]);
    assert!(!usage_body_text.contains("other-user-runtime-request"));

    let (strategy_status, strategy_payload, strategy_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/ai/routing/strategy",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, strategy_status);
    assert_eq!("2000", strategy_payload["code"]);
    assert_eq!("weighted", strategy_payload["data"]["strategy"]);
    assert_eq!(
        "gpt-4",
        strategy_payload["data"]["mappingRules"][0]["sourceModel"]
    );
    assert_eq!(
        "azure-gpt4-32k",
        strategy_payload["data"]["mappingRules"][0]["targetModel"]
    );
    assert!(!strategy_body_text.contains("other-tenant-model"));

    let (update_status, update_payload, update_body_text) = request_json(
        router.clone(),
        session_request_builder("PUT", "/app/v3/api/ai/routing/strategy", 100001, 0, 30)
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::json!({
                    "strategy": "cost",
                    "mappingRules": [
                        {
                            "id": "rule-custom",
                            "sourceModel": "gpt-4o",
                            "targetModel": "openai-gpt-4o-low-cost"
                        }
                    ]
                })
                .to_string(),
            ))
            .unwrap(),
    )
    .await;
    assert_eq!(
        StatusCode::OK,
        update_status,
        "routing channel update failed: {update_body_text}"
    );
    assert_eq!("2000", update_payload["code"]);
    assert_eq!(true, update_payload["data"]["success"]);
    assert!(!update_body_text.contains("other-tenant-model"));

    let (updated_strategy_status, updated_strategy_payload, updated_strategy_body_text) =
        request_json(
            router.clone(),
            session_request(
                "GET",
                "/app/v3/api/ai/routing/strategy",
                Body::empty(),
                TEST_SUBJECT_TENANT_ID,
                TEST_SUBJECT_ORGANIZATION_ID,
                TEST_SUBJECT_USER_ID,
            ),
        )
        .await;
    assert_eq!(StatusCode::OK, updated_strategy_status);
    assert_eq!("cost", updated_strategy_payload["data"]["strategy"]);
    assert_eq!(
        "gpt-4o",
        updated_strategy_payload["data"]["mappingRules"][0]["sourceModel"]
    );
    assert_eq!(
        "openai-gpt-4o-low-cost",
        updated_strategy_payload["data"]["mappingRules"][0]["targetModel"]
    );
    assert_eq!(
        1,
        updated_strategy_payload["data"]["mappingRules"]
            .as_array()
            .unwrap()
            .len()
    );
    assert!(!updated_strategy_body_text.contains("azure-gpt4-32k"));
    assert!(!updated_strategy_body_text.contains("other-tenant-model"));

    let (repeat_update_status, repeat_update_payload, repeat_update_body_text) = request_json(
        router.clone(),
        session_request_builder("PUT", "/app/v3/api/ai/routing/strategy", 100001, 0, 30)
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::json!({
                    "strategy": "cost",
                    "mappingRules": [
                        {
                            "id": "rule-custom",
                            "sourceModel": "gpt-4o",
                            "targetModel": "openai-gpt-4o-low-cost"
                        }
                    ]
                })
                .to_string(),
            ))
            .unwrap(),
    )
    .await;
    assert_eq!(StatusCode::OK, repeat_update_status);
    assert_eq!("2000", repeat_update_payload["code"]);
    assert_eq!(true, repeat_update_payload["data"]["success"]);
    assert!(!repeat_update_body_text.contains("UNIQUE constraint failed"));
    assert!(!repeat_update_body_text.contains("ai_routing_rule"));

    let (collision_update_status, collision_update_payload, collision_update_body_text) =
        request_json(
            router.clone(),
            session_request_builder("PUT", "/app/v3/api/ai/routing/strategy", 100001, 0, 30)
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "strategy": "weighted",
                        "mappingRules": [
                            {
                                "id": "rule-slash",
                                "sourceModel": "openai/gpt-4",
                                "targetModel": "openai-gpt-4-primary"
                            },
                            {
                                "id": "rule-colon",
                                "sourceModel": "openai:gpt-4",
                                "targetModel": "openai-gpt-4-secondary"
                            }
                        ]
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await;
    assert_eq!(StatusCode::OK, collision_update_status);
    assert_eq!("2000", collision_update_payload["code"]);
    assert_eq!(true, collision_update_payload["data"]["success"]);
    assert!(!collision_update_body_text.contains("UNIQUE constraint failed"));
    assert!(!collision_update_body_text.contains("ai_routing_rule"));

    let verification_pool = create_sqlite_pool(&database_url).await;
    let active_profile_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_routing_profile WHERE tenant_id = 100001 AND organization_id = 0 AND policy_id = 4020 AND deleted_at IS NULL",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let active_rule_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_routing_rule WHERE tenant_id = 100001 AND organization_id = 0 AND status = 1 AND deleted_at IS NULL",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let current_default_profile_id: i64 = sqlx::query_scalar(
        "SELECT default_profile_id FROM ai_routing_policy WHERE tenant_id = 100001 AND organization_id = 0 AND policy_code = 'console-routing-default'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    verification_pool.close().await;
    assert_eq!(4, active_profile_count);
    assert_eq!(5, active_rule_count);
    assert!(current_default_profile_id > 4021);
}

#[tokio::test]
async fn database_config_app_routing_channel_commands_persist_and_scope_without_secret_leakage() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_app_routing_runtime_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let unauthenticated_create = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/ai/routing/channels")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "name": "Unauthenticated Channel",
                        "vendor": "OpenAI",
                        "protocol": "OpenAI",
                        "accessType": "Standard API Key",
                        "baseUrl": "https://unauthenticated.example/v1",
                        "secretRef": "vault://providers/openai/unauthenticated",
                        "capabilities": ["llm"],
                        "weight": 25,
                        "status": "active"
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::UNAUTHORIZED, unauthenticated_create.status());

    let invalid_base_url_body = serde_json::json!({
        "name": "Invalid Base URL Channel",
        "vendor": "OpenAI",
        "protocol": "OpenAI",
        "accessType": "Standard API Key",
        "baseUrl": "file:///etc/passwd",
        "secretRef": "vault://providers/openai/invalid-base-url",
        "capabilities": ["llm"],
        "weight": 25,
        "status": "active"
    });
    let (invalid_base_url_status, invalid_base_url_payload, invalid_base_url_body_text) =
        request_json(
            router.clone(),
            session_request_builder("POST", "/app/v3/api/ai/routing/channels", 100001, 0, 30)
                .header("content-type", "application/json")
                .body(Body::from(invalid_base_url_body.to_string()))
                .unwrap(),
        )
        .await;
    assert_eq!(StatusCode::BAD_REQUEST, invalid_base_url_status);
    assert_eq!("4001", invalid_base_url_payload["code"]);
    assert!(invalid_base_url_body_text
        .contains("channel baseUrl must be an absolute http or https URL"));

    let create_body = serde_json::json!({
        "name": "Console Created OpenAI",
        "vendor": "OpenAI",
        "protocol": "OpenAI",
        "accessType": "Standard API Key",
        "baseUrl": "https://console-created.example/v1",
        "secretRef": "vault://providers/openai/console-created",
        "capabilities": ["llm", "image"],
        "weight": 75,
        "status": "active"
    });
    let (create_status, create_payload, create_body_text) = request_json(
        router.clone(),
        session_request_builder("POST", "/app/v3/api/ai/routing/channels", 100001, 0, 30)
            .header("content-type", "application/json")
            .header("X-Request-Id", "app-routing-channel-create-1")
            .body(Body::from(create_body.to_string()))
            .unwrap(),
    )
    .await;
    assert_eq!(StatusCode::OK, create_status);
    assert_eq!("2000", create_payload["code"]);
    assert_eq!(
        "Console Created OpenAI",
        create_payload["data"]["item"]["name"]
    );
    assert_eq!("OpenAI", create_payload["data"]["item"]["vendor"]);
    let created_capabilities = create_payload["data"]["item"]["capabilities"]
        .as_array()
        .unwrap();
    assert!(created_capabilities
        .iter()
        .any(|capability| capability == "llm"));
    assert!(created_capabilities
        .iter()
        .any(|capability| capability == "image"));
    assert_eq!(
        true,
        create_payload["data"]["item"]["models"]
            .as_array()
            .is_some_and(Vec::is_empty)
    );
    assert_eq!(
        "ref:***console-created",
        create_payload["data"]["item"]["apiKey"]
    );
    assert!(!create_body_text.contains("vault://providers/openai/console-created"));
    assert!(!create_body_text.contains("secretRef"));
    let created_channel_id = create_payload["data"]["item"]["id"]
        .as_str()
        .unwrap()
        .to_owned();

    let (list_after_create_status, list_after_create_payload, list_after_create_body_text) =
        request_json(
            router.clone(),
            session_request(
                "GET",
                "/app/v3/api/ai/routing/channels",
                Body::empty(),
                TEST_SUBJECT_TENANT_ID,
                TEST_SUBJECT_ORGANIZATION_ID,
                TEST_SUBJECT_USER_ID,
            ),
        )
        .await;
    assert_eq!(StatusCode::OK, list_after_create_status);
    let created_item = list_after_create_payload["data"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["id"] == created_channel_id)
        .unwrap();
    assert_eq!("Console Created OpenAI", created_item["name"]);
    assert!(!list_after_create_body_text.contains("vault://providers/openai/console-created"));
    assert!(!list_after_create_body_text.contains("Other Tenant Channel"));

    let update_body = serde_json::json!({
        "name": "Console Updated OpenAI",
        "vendor": "OpenAI",
        "protocol": "OpenAI",
        "accessType": "Standard API Key",
        "baseUrl": "https://console-updated.example/v1",
        "secretRef": "vault://providers/openai/console-updated",
        "capabilities": ["llm"],
        "weight": 88
    });
    let (update_status, update_payload, update_body_text) = request_json(
        router.clone(),
        session_request_builder(
            "PUT",
            &format!("/app/v3/api/ai/routing/channels/{created_channel_id}"),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        )
        .header("content-type", "application/json")
        .header("X-Request-Id", "app-routing-channel-update-1")
        .body(Body::from(update_body.to_string()))
        .unwrap(),
    )
    .await;
    assert_eq!(StatusCode::OK, update_status);
    assert_eq!(
        "Console Updated OpenAI",
        update_payload["data"]["item"]["name"]
    );
    assert_eq!(88, update_payload["data"]["item"]["weight"]);
    assert_eq!(
        1,
        update_payload["data"]["item"]["capabilities"]
            .as_array()
            .unwrap()
            .len()
    );
    assert_eq!(
        "ref:***console-updated",
        update_payload["data"]["item"]["apiKey"]
    );
    assert!(!update_body_text.contains("vault://providers/openai/console-updated"));

    let provider_update_body = serde_json::json!({
        "vendor": "Cohere",
        "protocol": "OpenAI",
        "accessType": "Standard API Key",
        "baseUrl": "https://console-cohere.example/v1",
        "weight": 89
    });
    let (provider_update_status, provider_update_payload, provider_update_body_text) =
        request_json(
            router.clone(),
            session_request_builder(
                "PUT",
                &format!("/app/v3/api/ai/routing/channels/{created_channel_id}"),
                TEST_SUBJECT_TENANT_ID,
                TEST_SUBJECT_ORGANIZATION_ID,
                TEST_SUBJECT_USER_ID,
            )
            .header("content-type", "application/json")
            .header("X-Request-Id", "app-routing-channel-update-new-provider-1")
            .body(Body::from(provider_update_body.to_string()))
            .unwrap(),
        )
        .await;
    assert_eq!(StatusCode::OK, provider_update_status);
    assert_eq!(
        "cohere",
        provider_update_payload["data"]["item"]["providerCode"]
    );
    assert_eq!(89, provider_update_payload["data"]["item"]["weight"]);
    assert!(!provider_update_body_text.contains("vault://providers/openai/console-updated"));

    let (disable_status, disable_payload, _) = request_json(
        router.clone(),
        session_request_builder(
            "PUT",
            &format!("/app/v3/api/ai/routing/channels/{created_channel_id}/status"),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        )
        .header("content-type", "application/json")
        .body(Body::from(r#"{"status":"disabled"}"#))
        .unwrap(),
    )
    .await;
    assert_eq!(StatusCode::OK, disable_status);
    assert_eq!("disabled", disable_payload["data"]["item"]["status"]);

    let (enable_status, enable_payload, _) = request_json(
        router.clone(),
        session_request_builder(
            "PUT",
            &format!("/app/v3/api/ai/routing/channels/{created_channel_id}/status"),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        )
        .header("content-type", "application/json")
        .body(Body::from(r#"{"status":"active"}"#))
        .unwrap(),
    )
    .await;
    assert_eq!(StatusCode::OK, enable_status);
    assert_eq!("active", enable_payload["data"]["item"]["status"]);

    let (test_status, test_payload, test_body_text) = request_json(
        router.clone(),
        session_request(
            "POST",
            &format!("/app/v3/api/ai/routing/channels/{created_channel_id}/verify"),
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, test_status);
    assert_eq!(false, test_payload["data"]["success"]);
    assert_eq!(created_channel_id, test_payload["data"]["channelId"]);
    assert_eq!("error", test_payload["data"]["status"]);
    assert_eq!("N/A", test_payload["data"]["latency"]);
    assert!(!test_body_text.contains("vault://providers/openai/console-updated"));
    assert!(!test_body_text.contains("provider secret_ref"));

    let (delete_status, delete_payload, delete_body_text) = request_json(
        router.clone(),
        session_request(
            "DELETE",
            &format!("/app/v3/api/ai/routing/channels/{created_channel_id}"),
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, delete_status);
    assert_eq!(true, delete_payload["data"]["deleted"]);
    assert!(!delete_body_text.contains("vault://providers/openai/console-updated"));

    let (list_after_delete_status, list_after_delete_payload, list_after_delete_body_text) =
        request_json(
            router,
            session_request(
                "GET",
                "/app/v3/api/ai/routing/channels",
                Body::empty(),
                TEST_SUBJECT_TENANT_ID,
                TEST_SUBJECT_ORGANIZATION_ID,
                TEST_SUBJECT_USER_ID,
            ),
        )
        .await;
    assert_eq!(StatusCode::OK, list_after_delete_status);
    assert!(!list_after_delete_payload["data"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["id"] == created_channel_id));
    assert!(!list_after_delete_body_text.contains("Console Updated OpenAI"));
    assert!(!list_after_delete_body_text.contains("Other Tenant Channel"));

    let verification_pool = create_sqlite_pool(&database_url).await;
    let parsed_channel_id = created_channel_id.parse::<i64>().unwrap();
    let deleted_status: i64 = sqlx::query_scalar(
        "SELECT status FROM ai_channel WHERE id = ?1 AND tenant_id = 100001 AND organization_id = 0",
    )
    .bind(parsed_channel_id)
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let channel_model_table_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = 'ai_channel_model'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let active_channel_resource_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM ai_channel_resource WHERE channel_id = ?1 AND status = 1 AND deleted_at IS NULL",
    )
    .bind(parsed_channel_id)
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let other_tenant_channel_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM ai_channel WHERE tenant_id = 100001 AND organization_id = 21 AND deleted_at IS NULL",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let stored_secret_ref: String =
        sqlx::query_scalar("SELECT credential_ref FROM ai_channel WHERE id = ?1")
            .bind(parsed_channel_id)
            .fetch_one(&verification_pool)
            .await
            .unwrap();
    let model_resource_was_not_written_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM ai_channel_resource WHERE channel_id = ?1 AND resource_code = 'model.openai.gpt-4o-mini.chat'",
    )
    .bind(parsed_channel_id)
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let modality_resource_was_written_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM ai_channel_resource WHERE channel_id = ?1 AND resource_code = 'modality.llm'",
    )
    .bind(parsed_channel_id)
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let synthetic_latency_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM ai_channel WHERE id = ?1 AND last_latency_ms = 45",
    )
    .bind(parsed_channel_id)
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let provider_snapshot_uuid_reuse_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(1)
           FROM ai_provider p
           JOIN ai_channel c ON c.provider_id = p.id
           JOIN ops_config_snapshot s ON s.request_id = 'app-routing-channel-update-new-provider-1'
           WHERE c.id = ?1 AND p.uuid = s.uuid"#,
    )
    .bind(parsed_channel_id)
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    verification_pool.close().await;

    assert_eq!(-1, deleted_status);
    assert_eq!(0, channel_model_table_count);
    assert_eq!(0, active_channel_resource_count);
    assert_eq!(1, other_tenant_channel_count);
    assert_eq!(
        "vault://providers/openai/console-updated",
        stored_secret_ref
    );
    assert_eq!(0, model_resource_was_not_written_count);
    assert_eq!(1, modality_resource_was_written_count);
    assert_eq!(0, synthetic_latency_count);
    assert_eq!(0, provider_snapshot_uuid_reuse_count);
}

#[tokio::test]
async fn database_config_app_routing_channel_test_runs_real_provider_probe_and_records_health() {
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
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_app_routing_runtime_data(&pool).await;
    sqlx::query("UPDATE ai_channel SET base_url = ?1, last_latency_ms = NULL, consecutive_error_count = 3 WHERE id = 4003")
        .bind(format!("http://{addr}"))
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("UPDATE ai_channel SET consecutive_error_count = 2 WHERE id = 4003")
        .execute(&pool)
        .await
        .unwrap();
    pool.close().await;

    let secret_ref = "vault://providers/openai/main";
    let router = configured_router_with_provider_secret_map(
        &database_url,
        ProviderSecretMapConfig::from_json(
            json!({secret_ref: "sk-provider-health-probe-secret"}).to_string(),
        )
        .unwrap(),
    )
    .await;

    let (status, payload, body_text) = request_json(
        router,
        session_request_builder(
            "POST",
            "/app/v3/api/ai/routing/channels/4003/verify",
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        )
        .header("X-Request-Id", "app-routing-channel-probe-success-1")
        .body(Body::empty())
        .unwrap(),
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!("2000", payload["code"]);
    assert_eq!(true, payload["data"]["success"]);
    assert_eq!("4003", payload["data"]["channelId"]);
    assert_eq!("active", payload["data"]["status"]);
    let latency = payload["data"]["latency"].as_str().unwrap();
    assert!(
        latency.ends_with("ms"),
        "latency must be an actual measured duration"
    );
    assert_ne!(
        "45ms", latency,
        "testChannel must not use synthetic latency"
    );
    assert!(!body_text.contains(secret_ref));
    assert!(!body_text.contains("sk-provider-health-probe-secret"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-provider-health-probe-secret".to_owned()),
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
          AND provider_id = 4001
          AND channel_id = 4003
          AND provider_account_id = 4003
        ORDER BY checked_at DESC, id DESC
        LIMIT 1
        "#,
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let snapshot_request_id: String = row.get("request_id");
    assert_server_generated_request_id(&snapshot_request_id, "app-routing-channel-probe-success-1");
    let snapshot_health: i64 = row.get("health_status");
    let snapshot_latency: i64 = row.get("latency_ms");
    let snapshot_http_status: i64 = row.get("http_status");
    let snapshot_error_code: Option<String> = row.get("error_code");
    let snapshot_error_message: Option<String> = row.get("error_message_masked");
    assert_eq!(1, snapshot_health);
    assert!(snapshot_latency > 0);
    assert_eq!(200, snapshot_http_status);
    assert_eq!(None, snapshot_error_code);
    assert_eq!(None, snapshot_error_message);

    let channel_state = sqlx::query(
        "SELECT health_status, last_latency_ms, consecutive_error_count FROM ai_channel WHERE id = 4003",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    assert_eq!(1_i64, channel_state.get::<i64, _>("health_status"));
    assert!(channel_state.get::<i64, _>("last_latency_ms") > 0);
    assert_eq!(
        0_i64,
        channel_state.get::<i64, _>("consecutive_error_count")
    );
    let channel_secret_error_count: i64 =
        sqlx::query_scalar("SELECT consecutive_error_count FROM ai_channel WHERE id = 4003")
            .fetch_one(&verification_pool)
            .await
            .unwrap();
    verification_pool.close().await;
    assert_eq!(0, channel_secret_error_count);
}

#[tokio::test]
async fn database_config_app_routing_channel_test_records_masked_provider_failure() {
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
                                "message": "bad upstream key sk-provider-health-probe-secret"
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
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_app_routing_runtime_data(&pool).await;
    sqlx::query("UPDATE ai_channel SET base_url = ?1, consecutive_error_count = 4 WHERE id = 4003")
        .bind(format!("http://{addr}"))
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("UPDATE ai_channel SET consecutive_error_count = 5 WHERE id = 4003")
        .execute(&pool)
        .await
        .unwrap();
    pool.close().await;

    let secret_ref = "vault://providers/openai/main";
    let router = configured_router_with_provider_secret_map(
        &database_url,
        ProviderSecretMapConfig::from_json(
            json!({secret_ref: "sk-provider-health-probe-secret"}).to_string(),
        )
        .unwrap(),
    )
    .await;

    let (status, payload, body_text) = request_json(
        router,
        session_request_builder(
            "POST",
            "/app/v3/api/ai/routing/channels/4003/verify",
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        )
        .header("X-Request-Id", "app-routing-channel-probe-failure-1")
        .body(Body::empty())
        .unwrap(),
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!("2000", payload["code"]);
    assert_eq!(false, payload["data"]["success"]);
    assert_eq!("4003", payload["data"]["channelId"]);
    assert_eq!("error", payload["data"]["status"]);
    assert!(payload["data"]["latency"].as_str().unwrap().ends_with("ms"));
    assert!(!body_text.contains(secret_ref));
    assert!(!body_text.contains("sk-provider-health-probe-secret"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-provider-health-probe-secret".to_owned()),
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
          AND provider_id = 4001
          AND channel_id = 4003
          AND provider_account_id = 4003
        ORDER BY checked_at DESC, id DESC
        LIMIT 1
        "#,
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let snapshot_request_id: String = row.get("request_id");
    assert_server_generated_request_id(&snapshot_request_id, "app-routing-channel-probe-failure-1");
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
    assert!(!error_message.contains("sk-provider-health-probe-secret"));

    let channel_errors: i64 =
        sqlx::query_scalar("SELECT consecutive_error_count FROM ai_channel WHERE id = 4003")
            .fetch_one(&verification_pool)
            .await
            .unwrap();
    let channel_secret_error_count: i64 =
        sqlx::query_scalar("SELECT consecutive_error_count FROM ai_channel WHERE id = 4003")
            .fetch_one(&verification_pool)
            .await
            .unwrap();
    verification_pool.close().await;
    assert_eq!(6, channel_errors);
    assert_eq!(6, channel_secret_error_count);
}

#[tokio::test]
async fn database_config_app_providers_require_session_scope_and_hide_secret_refs() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_app_providers_runtime_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let unauthenticated_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/providers")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::UNAUTHORIZED, unauthenticated_response.status());

    let (status, payload, body_text) = request_json(
        router,
        session_request(
            "GET",
            "/app/v3/api/ai/providers",
            Body::empty(),
            100001,
            0,
            30,
        ),
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!("2000", payload["code"]);
    let items = payload["data"]["items"].as_array().unwrap();
    assert!(
        items
            .iter()
            .any(|item| item["name"] == "Tenant OpenAI Provider"
                && item["status"] == "active"
                && item["providerFamily"] == "codex"
                && item["integrationType"] == "model_vendor_direct"),
        "unexpected providers payload: {body_text}"
    );
    assert!(!body_text.contains("vault://providers/openai/main"));
    assert!(!body_text.contains("sk-provider-secret"));
    assert!(!body_text.contains("Other Tenant Provider"));
}

#[tokio::test]
async fn database_config_app_communication_notifications_route_is_removed() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let unauthenticated_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/communication/notifications")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::NOT_FOUND, unauthenticated_response.status());

    let authenticated_response = router
        .oneshot(session_request(
            "GET",
            "/app/v3/api/communication/notifications",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ))
        .await
        .unwrap();
    assert_eq!(StatusCode::NOT_FOUND, authenticated_response.status());
}

#[tokio::test]
async fn database_config_notification_delivery_schema_supports_app_acknowledgement_upsert() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;

    let index_columns = sqlx::query(
        r#"
        SELECT ii.name
        FROM pragma_index_list('ops_notification_delivery') il
        JOIN pragma_index_info(il.name) ii
        WHERE il.name = 'uk_ops_notification_delivery_user_message_app'
        ORDER BY ii.seqno
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap()
    .into_iter()
    .map(|row| row.get::<String, _>("name"))
    .collect::<Vec<_>>();

    assert_eq!(
        vec![
            "tenant_id",
            "organization_id",
            "message_id",
            "user_id",
            "app_id",
            "delivery_channel"
        ],
        index_columns
    );

    sqlx::query(
        r#"
        INSERT INTO ops_notification_delivery
            (uuid, tenant_id, organization_id, user_id, status, app_id, message_id, delivery_channel, delivery_status, read_at, popup_seen_at, delivered_at, created_at, updated_at)
        VALUES
            ('ack-1', 100001, 0, 30, 1, 'default', 2007, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(tenant_id, organization_id, message_id, user_id, app_id, delivery_channel) DO UPDATE SET
            read_at = COALESCE(ops_notification_delivery.read_at, CURRENT_TIMESTAMP),
            popup_seen_at = COALESCE(ops_notification_delivery.popup_seen_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ops_notification_delivery
            (uuid, tenant_id, organization_id, user_id, status, app_id, message_id, delivery_channel, delivery_status, read_at, popup_seen_at, delivered_at, created_at, updated_at)
        VALUES
            ('ack-2', 100001, 0, 30, 1, 'default', 2007, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(tenant_id, organization_id, message_id, user_id, app_id, delivery_channel) DO UPDATE SET
            read_at = COALESCE(ops_notification_delivery.read_at, CURRENT_TIMESTAMP),
            popup_seen_at = COALESCE(ops_notification_delivery.popup_seen_at, CURRENT_TIMESTAMP),
            updated_at = CURRENT_TIMESTAMP
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM ops_notification_delivery
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND message_id = 2007
          AND user_id = 30
          AND app_id = 'default'
          AND delivery_channel = 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, count);
}

#[tokio::test]
async fn database_config_app_gateway_traces_require_session_scope_and_mask_client_identity() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_app_gateway_traces_runtime_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let unauthenticated_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/gateway/traces")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::UNAUTHORIZED, unauthenticated_response.status());

    let (status, payload, body_text) = request_json(
        router,
        session_request(
            "GET",
            "/app/v3/api/ai/gateway/traces",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!("2000", payload["code"]);
    assert_eq!("trace-owner-1", payload["data"]["items"][0]["id"]);
    assert_eq!("203.0.113.***", payload["data"]["items"][0]["ip"]);
    assert_eq!(
        "/v1/chat/completions",
        payload["data"]["items"][0]["endpoint"]
    );
    assert_eq!("POST", payload["data"]["items"][0]["method"]);
    assert_eq!(200, payload["data"]["items"][0]["status"]);
    assert_eq!("OpenAI Primary", payload["data"]["items"][0]["channel"]);
    assert!(!body_text.contains("203.0.113.42"));
    assert!(!body_text.contains("trace-other-user"));
}

#[tokio::test]
async fn database_config_checkout_requires_session_and_scopes_order_status_to_subject() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_checkout_runtime_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let unauthenticated_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/recharges/orders/ORDER-OWNER-1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::UNAUTHORIZED, unauthenticated_response.status());

    let (owner_status, owner_payload, owner_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/recharges/orders/ORDER-OWNER-1",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, owner_status);
    assert_eq!("2000", owner_payload["code"]);
    assert_eq!("ORDER-OWNER-1", owner_payload["data"]["orderNo"]);
    assert_eq!("TRADE-OWNER-1", owner_payload["data"]["outTradeNo"]);
    assert_eq!("10.00", owner_payload["data"]["amount"]);
    assert_eq!(125, owner_payload["data"]["points"]);
    assert_eq!("wechat_pay", owner_payload["data"]["paymentMethod"]);
    assert_eq!("success", owner_payload["data"]["orderStatus"]);
    assert_eq!("success", owner_payload["data"]["paymentStatus"]);
    assert_eq!("success", owner_payload["data"]["rechargeStatus"]);
    assert_eq!("success", owner_payload["data"]["status"]);
    assert_eq!("completed", owner_payload["data"]["nextAction"]);
    assert!(!owner_body_text.contains("ORDER-OTHER-1"));
    assert!(!owner_body_text.contains("other-payment-secret"));

    let (other_order_status, other_order_payload, other_order_body_text) = request_json(
        router,
        session_request(
            "GET",
            "/app/v3/api/recharges/orders/ORDER-OTHER-1",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::CONFLICT, other_order_status);
    assert_eq!("4090", other_order_payload["code"]);
    assert!(!other_order_body_text.contains("TRADE-OTHER-1"));
}

#[tokio::test]
async fn database_config_recharge_lists_packages_and_persists_pending_payment_order_for_subject() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_recharge_runtime_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let public_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/recharges/packages")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, public_response.status());
    let public_body = axum::body::to_bytes(public_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let public_body_text = String::from_utf8(public_body.to_vec()).unwrap();
    let public_payload: serde_json::Value = serde_json::from_slice(&public_body).unwrap();
    assert_eq!("2000", public_payload["code"], "{public_body_text}");
    let public_packs = public_payload["data"]["items"].as_array().unwrap();
    assert_eq!(9, public_packs.len(), "{public_body_text}");
    assert!(public_packs
        .iter()
        .any(|pack| pack["id"] == "seed-recharge-package-cny-500"
            && pack["priceAmount"] == "5.00"
            && pack["points"] == 50));
    assert!(public_packs
        .iter()
        .any(|pack| pack["id"] == "seed-recharge-package-cny-100000"
            && pack["priceAmount"] == "1000.00"
            && pack["points"] == 10000));
    assert!(!public_body_text.contains("Starter Recharge Pack"));
    assert!(!public_body_text.contains("Other Org Recharge Pack"));

    let (packs_status, packs_payload, packs_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/recharges/packages",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, packs_status);
    assert_eq!("2000", packs_payload["code"]);
    let packs = packs_payload["data"]["items"].as_array().unwrap();
    assert_eq!(11, packs.len(), "{packs_body_text}");
    assert!(packs.iter().any(|pack| pack["id"] == "6101"
        && pack["priceAmount"] == "10.00"
        && pack["bonusPoints"] == 25
        && pack["points"] == 125));
    assert!(packs.iter().any(|pack| pack["id"] == "6102"
        && pack["priceAmount"] == "20.00"
        && pack["bonusPoints"] == 50
        && pack["points"] == 250));
    assert!(packs.iter().any(
        |pack| pack["id"] == "bootstrap-admin-recharge-package-10-501"
            && pack["priceAmount"] == "5.00"
            && pack["points"] == 50
    ));
    assert!(packs.iter().any(
        |pack| pack["id"] == "bootstrap-admin-recharge-package-10-509"
            && pack["priceAmount"] == "1000.00"
            && pack["points"] == 10000
    ));
    assert!(!packs_body_text.contains("6103"));
    assert!(!packs_body_text.contains("Other Org Recharge Pack"));

    let recharge_request_body = r#"{"amount":"10.00","currencyCode":"CNY","method":"wechat","packageId":"6101","source":"app-api-test"}"#;
    let recharge_request_hash_body =
        r#"{"amount":"10.00","currencyCode":"CNY","packageId":"6101","source":"app-api-test"}"#;
    let (recharge_status, recharge_payload, recharge_body_text) = request_json(
        router,
        session_request_builder("POST", "/app/v3/api/recharges/orders", 100001, 0, 30)
            .header("content-type", "application/json")
            .header("Idempotency-Key", "recharge-owner-idem-1")
            .header(
                "Sdkwork-Request-Hash",
                app_write_request_hash("recharge.submit", recharge_request_hash_body),
            )
            .header("Sdkwork-Request-No", "recharge-owner-request-1")
            .body(Body::from(recharge_request_body))
            .unwrap(),
    )
    .await;
    assert_eq!(StatusCode::OK, recharge_status, "{recharge_body_text}");
    assert_eq!("2000", recharge_payload["code"], "{recharge_body_text}");
    assert_eq!(true, recharge_payload["data"]["success"]);
    assert_eq!("10.00", recharge_payload["data"]["amount"]);
    assert_eq!(125, recharge_payload["data"]["points"]);
    assert_eq!("wechat_pay", recharge_payload["data"]["paymentMethod"]);
    assert_eq!("pending", recharge_payload["data"]["status"]);
    assert!(recharge_payload["data"]["orderNo"]
        .as_str()
        .unwrap()
        .starts_with("RC"));
    assert!(!recharge_body_text.contains("Other Org Recharge Pack"));

    let verification_pool = create_sqlite_pool(&database_url).await;
    let owner_order_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM commerce_order WHERE tenant_id = '100001' AND organization_id = '0' AND owner_user_id = '30' AND subject = 'points_recharge' AND status = 'pending_payment'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let owner_order_item_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM commerce_order_item oi JOIN commerce_order o ON o.id = oi.order_id WHERE o.tenant_id = '100001' AND o.organization_id = '0' AND o.owner_user_id = '30' AND oi.title = 'Starter Recharge Pack'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let owner_payment_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM commerce_payment_intent p JOIN commerce_order o ON o.id = p.order_id WHERE o.owner_user_id = '30' AND p.amount = '10.00' AND p.status = 'pending' AND p.provider = 'wechat'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let owner_payment_attempt_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM commerce_payment_attempt p JOIN commerce_order o ON o.id = p.order_id WHERE o.owner_user_id = '30' AND p.amount = '10.00' AND p.status = 'pending' AND json_extract(p.callback_payload, '$.points') = 125 AND json_extract(p.callback_payload, '$.packageId') = '6101' AND json_extract(p.callback_payload, '$.source') = 'app-api-test'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let other_user_order_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM commerce_order WHERE tenant_id = '100001' AND organization_id = '0' AND owner_user_id = '31'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    verification_pool.close().await;

    assert_eq!(1, owner_order_count);
    assert_eq!(1, owner_order_item_count);
    assert_eq!(1, owner_payment_count);
    assert_eq!(1, owner_payment_attempt_count);
    assert_eq!(0, other_user_order_count);
}

#[tokio::test]
async fn database_config_commerce_foundation_reads_exchange_rules_for_session_scope() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_exchange_rule_runtime_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let unauthenticated_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/wallet/exchange_rate")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::UNAUTHORIZED, unauthenticated_response.status());

    let (rate_status, rate_payload, rate_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/wallet/exchange_rate",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, rate_status, "{rate_body_text}");
    assert_eq!("2000", rate_payload["code"]);
    assert_eq!("POINTS", rate_payload["data"]["sourceAssetType"]);
    assert_eq!("CASH", rate_payload["data"]["targetAssetType"]);
    assert_eq!("120", rate_payload["data"]["rate"]);
    assert!(!rate_body_text.contains("Other Org Exchange Rule"));

    let (rules_status, rules_payload, rules_body_text) = request_json(
        router,
        session_request(
            "GET",
            "/app/v3/api/wallet/points/exchanges/rules?source_asset_type=points&target_asset_type=cash",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, rules_status);
    assert_eq!("2000", rules_payload["code"]);
    let rules = rules_payload["data"].as_array().unwrap();
    assert_eq!(1, rules.len());
    assert_eq!("exchange-1", rules[0]["id"]);
    assert_eq!("POINTS", rules[0]["sourceAssetType"]);
    assert_eq!("CASH", rules[0]["targetAssetType"]);
    assert_eq!("120", rules[0]["rate"]);
    assert_eq!("active", rules[0]["status"]);
    assert!(!rules_body_text.contains("Other Org Exchange Rule"));
}

#[tokio::test]
async fn database_config_settings_requires_session_and_upserts_subject_preferences_and_webhook() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_settings_runtime_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let unauthenticated_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/iam/users/settings")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::UNAUTHORIZED, unauthenticated_response.status());

    let (initial_status, initial_payload, initial_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/iam/users/settings",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, initial_status);
    assert_eq!("2000", initial_payload["code"]);
    assert_eq!("zh-CN", initial_payload["data"]["language"]);
    assert_eq!("Asia/Shanghai", initial_payload["data"]["timezone"]);
    assert_eq!(
        "https://owner.example.com/hook",
        initial_payload["data"]["webhookUrl"]
    );
    assert_eq!(
        true,
        initial_payload["data"]["notifications"]["billReminder"]
    );
    assert_eq!(
        false,
        initial_payload["data"]["notifications"]["quotaWarning"]
    );
    assert_eq!(true, initial_payload["data"]["notifications"]["apiMonitor"]);
    assert!(!initial_body_text.contains("https://other.example.com/hook"));

    let (update_status, update_payload, _update_body_text) = request_json(
        router.clone(),
        session_request_builder("PUT", "/app/v3/api/iam/users/settings", 100001, 0, 30)
            .header("content-type", "application/json")
            .body(Body::from(
                serde_json::json!({
                    "language": "en-US",
                    "timezone": "UTC",
                    "webhookUrl": "https://owner.example.com/new-hook",
                    "notifications": {
                        "billReminder": false,
                        "quotaWarning": true,
                        "apiMonitor": false
                    }
                })
                .to_string(),
            ))
            .unwrap(),
    )
    .await;
    assert_eq!(StatusCode::OK, update_status);
    assert_eq!("2000", update_payload["code"]);
    assert_eq!(true, update_payload["data"]["success"]);

    let (updated_status, updated_payload, updated_body_text) = request_json(
        router,
        session_request(
            "GET",
            "/app/v3/api/iam/users/settings",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, updated_status);
    assert_eq!("en-US", updated_payload["data"]["language"]);
    assert_eq!("UTC", updated_payload["data"]["timezone"]);
    assert_eq!(
        "https://owner.example.com/new-hook",
        updated_payload["data"]["webhookUrl"]
    );
    assert_eq!(
        false,
        updated_payload["data"]["notifications"]["billReminder"]
    );
    assert_eq!(
        true,
        updated_payload["data"]["notifications"]["quotaWarning"]
    );
    assert_eq!(
        false,
        updated_payload["data"]["notifications"]["apiMonitor"]
    );
    assert!(!updated_body_text.contains("https://other.example.com/hook"));

    let verification_pool = create_sqlite_pool(&database_url).await;
    let other_language: String = sqlx::query_scalar(
        "SELECT language FROM iam_user_preference WHERE tenant_id = 100001 AND organization_id = 0 AND user_id = 31",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    let other_webhook_url: String = sqlx::query_scalar(
        "SELECT target_url FROM integration_webhook_endpoint WHERE tenant_id = 100001 AND organization_id = 0 AND endpoint_code = 'console-settings-user-31'",
    )
    .fetch_one(&verification_pool)
    .await
    .unwrap();
    verification_pool.close().await;

    assert_eq!("ja-JP", other_language);
    assert_eq!("https://other.example.com/hook", other_webhook_url);
}

#[tokio::test]
async fn database_config_usage_logs_require_session_filter_and_scope_logs_to_subject() {
    let database_url = unique_sqlite_url();
    let pool = create_sqlite_pool(&database_url).await;
    create_schema(&pool).await;
    seed_catalog_with_two_user_api_keys(&pool).await;
    seed_usage_logs_runtime_data(&pool).await;
    pool.close().await;

    let router = configured_router(&database_url).await;
    let unauthenticated_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/usage/logs")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::UNAUTHORIZED, unauthenticated_response.status());

    let (success_status, success_payload, success_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/ai/usage/logs?status=success&q=gpt-4o-mini&start_time=2026-04-29T00:00:00Z&end_time=2026-04-29T23:59:59Z",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, success_status, "{success_body_text}");
    assert_eq!("2000", success_payload["code"]);
    assert_eq!(1, success_payload["data"]["total"]);
    let success_logs = success_payload["data"]["logs"].as_array().unwrap();
    assert_eq!(1, success_logs.len());
    assert_eq!("usage-owner-success", success_logs[0]["requestId"]);
    assert_eq!("Owner Usage Key", success_logs[0]["tokenName"]);
    assert_eq!("standard-group", success_logs[0]["group"]);
    assert_eq!("text", success_logs[0]["type"]);
    assert_eq!("gpt-4o-mini", success_logs[0]["model"]);
    assert_eq!("success", success_logs[0]["status"]);
    assert_eq!(200, success_logs[0]["httpStatus"]);
    assert_eq!("", success_logs[0]["errorCode"]);
    assert_eq!("", success_logs[0]["errorType"]);
    assert_eq!("", success_logs[0]["errorMessage"]);
    assert_eq!("345ms", success_logs[0]["totalTime"]);
    assert_eq!("120ms", success_logs[0]["ttft"]);
    assert_eq!(true, success_logs[0]["isStream"]);
    assert_eq!(100, success_logs[0]["inputTokens"]);
    assert_eq!(10, success_logs[0]["cacheReadTokens"]);
    assert_eq!(50, success_logs[0]["outputTokens"]);
    assert_eq!("0.012345000", success_logs[0]["cost"]);
    assert_eq!("1.250000", success_logs[0]["multiplier"]);
    assert_eq!("0.150000", success_logs[0]["baseInputPrice"]);
    assert_eq!("0.600000", success_logs[0]["baseOutputPrice"]);
    assert_eq!("0.050000", success_logs[0]["cacheReadPrice"]);
    assert_eq!("/v1/chat/completions", success_logs[0]["path"]);
    assert_eq!("medium", success_logs[0]["reasoningEffort"]);
    assert_eq!("203.0.113.***", success_logs[0]["ip"]);
    assert!(!success_body_text.contains("other-user-usage-request"));
    assert!(!success_body_text.contains("203.0.113.42"));

    let (cost_only_status, cost_only_payload, cost_only_body_text) = request_json(
        router.clone(),
        session_request(
            "GET",
            "/app/v3/api/ai/usage/logs?status=success&q=gpt-4o-cost-only&start_time=2026-04-29T00:00:00Z&end_time=2026-04-29T23:59:59Z",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, cost_only_status, "{cost_only_body_text}");
    assert_eq!("2000", cost_only_payload["code"]);
    assert_eq!(1, cost_only_payload["data"]["total"]);
    let cost_only_logs = cost_only_payload["data"]["logs"].as_array().unwrap();
    assert_eq!(1, cost_only_logs.len());
    assert_eq!("usage-owner-cost-only", cost_only_logs[0]["requestId"]);
    assert_eq!("0.000000000", cost_only_logs[0]["cost"]);
    assert!(
        !cost_only_body_text.contains("777.123456"),
        "app usage logs must not expose upstream cost compatibility fields"
    );

    let (error_status, error_payload, error_body_text) = request_json(
        router,
        session_request(
            "GET",
            "/app/v3/api/ai/usage/logs?status=error&start_time=2026-04-29T00:00:00Z&end_time=2026-04-29T23:59:59Z",
            Body::empty(),
            TEST_SUBJECT_TENANT_ID,
            TEST_SUBJECT_ORGANIZATION_ID,
            TEST_SUBJECT_USER_ID,
        ),
    )
    .await;
    assert_eq!(StatusCode::OK, error_status, "{error_body_text}");
    assert_eq!("2000", error_payload["code"]);
    assert_eq!(1, error_payload["data"]["total"]);
    let error_logs = error_payload["data"]["logs"].as_array().unwrap();
    assert_eq!(1, error_logs.len());
    assert_eq!("usage-owner-error", error_logs[0]["requestId"]);
    assert_eq!("error", error_logs[0]["status"]);
    assert_eq!(502, error_logs[0]["httpStatus"]);
    assert_eq!("upstream_502", error_logs[0]["errorCode"]);
    assert_eq!("provider_error", error_logs[0]["errorType"]);
    assert_eq!(
        "provider timed out before completion",
        error_logs[0]["errorMessage"]
    );
    assert_eq!("0ms", error_logs[0]["totalTime"]);
    assert_eq!("provider_error", error_logs[0]["reasoningEffort"]);
    assert!(!error_body_text.contains("usage-owner-success"));
    assert!(!error_body_text.contains("other-user-usage-request"));
    assert!(!error_body_text.contains("203.0.113.42"));
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
        "id": "chatcmpl-health",
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

static LEGACY_APP_API_INTEGRATION_ENV: Once = Once::new();

fn enable_legacy_app_api_subject_boundary_for_integration_tests() {
    LEGACY_APP_API_INTEGRATION_ENV.call_once(|| {
        // Integration tests mount product routers without the web-framework shell and
        // exercise claw app-session tokens directly.
        std::env::set_var("SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY", "true");
    });
}

async fn configured_router(database_url: &str) -> axum::Router {
    enable_legacy_app_api_subject_boundary_for_integration_tests();
    let pool = create_sqlite_pool(database_url).await;
    let database_config = DatabaseConfig::from_url_with_max_connections(database_url, 1)
        .expect("sqlite database config");
    sdkwork_clawrouter_standalone_gateway::router_with_sqlite_product_catalog(
        pool,
        database_config,
        api_key_security_config(),
        trusted_subject_config(),
        app_session_config(),
        payment_webhook_config(),
    )
    .await
    .unwrap()
}

async fn configured_router_with_catalog_refresh(database_url: &str) -> axum::Router {
    enable_legacy_app_api_subject_boundary_for_integration_tests();
    let _model_ranking_enabled =
        EnvOverride::set("SDKWORK_CLAW_MODEL_RANKING_REFRESH_WORKER_ENABLED", "false");
    let _catalog_refresh_interval = EnvOverride::set(
        "SDKWORK_CLAW_PROVIDER_CATALOG_REFRESH_INTERVAL_MILLIS",
        "50",
    );
    sdkwork_clawrouter_standalone_gateway::router_with_database_config_api_key_trusted_subject_app_session_deployment_mode_config(
        DatabaseConfig::from_url_with_max_connections(database_url, 1).unwrap(),
        api_key_security_config(),
        trusted_subject_config(),
        app_session_config(),
        payment_webhook_config(),
        DeploymentMode::Desktop,
    )
    .await
    .unwrap()
}

async fn configured_router_with_deployment_mode(
    database_url: &str,
    deployment_mode: DeploymentMode,
) -> axum::Router {
    enable_legacy_app_api_subject_boundary_for_integration_tests();
    let _runtime_guard = AppRuntimeWorkerEnvGuard::disabled_for_test();
    sdkwork_clawrouter_standalone_gateway::router_with_database_config_api_key_trusted_subject_app_session_deployment_mode_config(
        DatabaseConfig::from_url_with_max_connections(database_url, 1).unwrap(),
        api_key_security_config(),
        trusted_subject_config(),
        app_session_config(),
        payment_webhook_config(),
        deployment_mode,
    )
    .await
    .unwrap()
}

async fn configured_router_with_provider_secret_map(
    database_url: &str,
    provider_secret_map_config: ProviderSecretMapConfig,
) -> axum::Router {
    enable_legacy_app_api_subject_boundary_for_integration_tests();
    let _runtime_guard = AppRuntimeWorkerEnvGuard::disabled_for_test();
    sdkwork_clawrouter_standalone_gateway::router_with_database_config_api_key_trusted_subject_app_session_provider_secret_map_and_deployment_mode_config(
        DatabaseConfig::from_url_with_max_connections(database_url, 1).unwrap(),
        api_key_security_config(),
        trusted_subject_config(),
        app_session_config(),
        payment_webhook_config(),
        provider_secret_map_config,
        DeploymentMode::Desktop,
    )
    .await
    .unwrap()
}

async fn request_json(router: axum::Router, request: Request<Body>) -> (StatusCode, Value, String) {
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    let payload: Value = serde_json::from_str(&body_text).unwrap_or_else(|error| {
        panic!("response was not JSON: status={status}, error={error}, body={body_text}")
    });
    (status, payload, body_text)
}

async fn scalar_i64(pool: &SqlitePool, sql: &str) -> i64 {
    sqlx::query(sql)
        .fetch_one(pool)
        .await
        .unwrap()
        .try_get::<i64, _>(0)
        .unwrap()
}

fn model_catalog_contains(payload: &Value, model: &str) -> bool {
    payload["data"]["items"]
        .as_array()
        .is_some_and(|items| items.iter().any(|item| item["model"] == model))
}

struct EnvOverride {
    key: &'static str,
    previous: Option<String>,
}

impl EnvOverride {
    fn set(key: &'static str, value: &str) -> Self {
        let previous = std::env::var(key).ok();
        std::env::set_var(key, value);
        Self { key, previous }
    }
}

impl Drop for EnvOverride {
    fn drop(&mut self) {
        if let Some(value) = self.previous.as_deref() {
            std::env::set_var(self.key, value);
        } else {
            std::env::remove_var(self.key);
        }
    }
}

struct AppRuntimeWorkerEnvGuard {
    _model_ranking_enabled: EnvOverride,
    _catalog_refresh_interval: EnvOverride,
}

impl AppRuntimeWorkerEnvGuard {
    fn disabled_for_test() -> Self {
        Self {
            _model_ranking_enabled: EnvOverride::set(
                "SDKWORK_CLAW_MODEL_RANKING_REFRESH_WORKER_ENABLED",
                "false",
            ),
            _catalog_refresh_interval: EnvOverride::set(
                "SDKWORK_CLAW_PROVIDER_CATALOG_REFRESH_INTERVAL_MILLIS",
                "3600000",
            ),
        }
    }
}

fn stable_command_request_hash(scope: &str, parts: &[&str]) -> String {
    let mut normalized = vec![scope];
    normalized.extend(parts);
    normalized
        .iter()
        .map(|part| {
            part.chars()
                .map(|character| {
                    if character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.') {
                        character
                    } else {
                        '-'
                    }
                })
                .collect::<String>()
        })
        .collect::<Vec<_>>()
        .join("-")
}

fn canonical_json_string(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(value) => value.to_string(),
        Value::Number(value) => value.to_string(),
        Value::String(value) => serde_json::to_string(value).unwrap_or_else(|_| "\"\"".to_owned()),
        Value::Array(values) => {
            let items = values
                .iter()
                .map(canonical_json_string)
                .collect::<Vec<_>>()
                .join(",");
            format!("[{items}]")
        }
        Value::Object(values) => {
            let mut keys = values.keys().collect::<Vec<_>>();
            keys.sort_unstable();
            let items = keys
                .into_iter()
                .filter(|key| !values[*key].is_null())
                .map(|key| {
                    format!(
                        "{}:{}",
                        serde_json::to_string(key).unwrap_or_else(|_| "\"\"".to_owned()),
                        canonical_json_string(&values[key])
                    )
                })
                .collect::<Vec<_>>()
                .join(",");
            format!("{{{items}}}")
        }
    }
}

fn app_write_request_hash(scope: &str, body_json: &str) -> String {
    let value: Value =
        serde_json::from_str(body_json).expect("app write payload must be valid json");
    stable_command_request_hash(scope, &[&canonical_json_string(&value)])
}

fn session_request(
    method: &str,
    uri: &str,
    body: Body,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
) -> Request<Body> {
    session_request_builder(method, uri, tenant_id, organization_id, user_id)
        .body(body)
        .unwrap()
}

fn session_request_builder(
    method: &str,
    uri: &str,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
) -> axum::http::request::Builder {
    session_authorization_header(
        Request::builder().method(method).uri(uri),
        tenant_id,
        organization_id,
        user_id,
    )
}

fn api_key_security_config() -> ApiKeySecurityConfig {
    test_api_key_security_config().unwrap()
}

fn trusted_subject_config() -> sdkwork_claw_config::TrustedSubjectConfig {
    test_trusted_subject_config().unwrap()
}

fn app_session_config() -> sdkwork_claw_config::AppSessionConfig {
    test_app_session_config().unwrap()
}

fn payment_webhook_config() -> sdkwork_claw_config::PaymentWebhookConfig {
    test_payment_webhook_config().unwrap()
}

fn session_authorization_header(
    builder: axum::http::request::Builder,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
) -> axum::http::request::Builder {
    let issued_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0);
    let expires_at = issued_at + 300;
    let (authorization, access_token) = app_session_dual_token_headers(
        trusted_request_subject(tenant_id, organization_id, user_id),
        issued_at,
        expires_at,
    )
    .unwrap();
    builder
        .header("authorization", authorization)
        .header("Access-Token", access_token)
}

fn unique_sqlite_url() -> String {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let sequence = SQLITE_DB_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let process_id = std::process::id();
    let path = format!("target/verify-dbs/app-config-{process_id}-{nonce}-{sequence}.db");
    std::fs::create_dir_all("target/verify-dbs").unwrap();
    format!("sqlite://{path}")
}

async fn create_sqlite_pool(database_url: &str) -> SqlitePool {
    let options = SqliteConnectOptions::from_str(database_url)
        .unwrap()
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(StdDuration::from_secs(30));
    SqlitePoolOptions::new()
        .max_connections(8)
        .acquire_timeout(StdDuration::from_secs(10))
        .connect_with(options)
        .await
        .unwrap()
}

async fn create_schema(pool: &SqlitePool) {
    for statement in [
        r#"CREATE TABLE ai_model_vendor (
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
            sort_order INTEGER NOT NULL
        )"#,
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
            source_vendor_id INTEGER,
            source_vendor_code TEXT NOT NULL DEFAULT '',
            target_vendor_id INTEGER,
            target_vendor_code TEXT NOT NULL DEFAULT '',
            mapping_mode TEXT NOT NULL DEFAULT 'alias',
            match_type TEXT NOT NULL DEFAULT 'exact',
            enabled INTEGER NOT NULL DEFAULT 1
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
        r#"CREATE TABLE ai_provider (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
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
            created_at TEXT,
            updated_at TEXT,
            version INTEGER DEFAULT 0,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE integration_provider (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            provider_code TEXT NOT NULL,
            default_vendor_code TEXT,
            integration_type INTEGER,
            display_name TEXT,
            description TEXT,
            base_url TEXT,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER DEFAULT 0,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE integration_provider_account (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            provider_id INTEGER,
            provider_code TEXT NOT NULL,
            account_code TEXT,
            account_name TEXT,
            base_url TEXT,
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
            created_at TEXT,
            updated_at TEXT,
            version INTEGER DEFAULT 0,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
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
            proxy_id INTEGER,
            capabilities TEXT,
            upstream_balance_amount TEXT,
            upstream_balance_currency TEXT,
            region_code TEXT,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER DEFAULT 0,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            deleted_by INTEGER,
            priority INTEGER NOT NULL,
            weight INTEGER NOT NULL,
            health_status INTEGER,
            last_latency_ms INTEGER,
            rpm_limit INTEGER,
            consecutive_error_count INTEGER
        )"#,
        r#"CREATE TABLE ai_resource (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
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
            deleted_at TEXT,
            sort_order INTEGER
        )"#,
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
            metadata TEXT NOT NULL DEFAULT '{}',
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
        )"#,
        "CREATE UNIQUE INDEX uk_ai_channel_resource ON ai_channel_resource (tenant_id, organization_id, channel_id, resource_code, resource_group_code)",
        r#"CREATE TABLE ai_channel_credential (
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
        )"#,        r#"CREATE TABLE integration_provider_health_snapshot (
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
            legal_hold INTEGER DEFAULT 0,
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
        r#"CREATE TABLE integration_proxy (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            endpoint TEXT,
            status INTEGER NOT NULL,
            health_status INTEGER,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_pricing_plan (
            id INTEGER PRIMARY KEY,
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
        r#"CREATE TABLE ai_channel_group (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            group_code TEXT NOT NULL,
            group_name TEXT,
            pricing_plan_code TEXT NOT NULL,
            rate_multiplier TEXT NOT NULL,
            official_price_multiplier TEXT NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel_group_member (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            channel_group_id INTEGER NOT NULL,
            channel_id INTEGER NOT NULL,
            priority INTEGER,
            weight INTEGER,
            enabled INTEGER,
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
        r#"CREATE TABLE iam_gateway_api_key (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            channel_group_id INTEGER NOT NULL,
            uuid TEXT,
            name TEXT,
            key_prefix TEXT NOT NULL,
            key_display_masked TEXT,
            key_hash TEXT NOT NULL,
            hash_alg TEXT,
            secret_version INTEGER,
            idempotency_key TEXT NOT NULL,
            policy_id INTEGER,
            quota_policy_id INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            deleted_at TEXT,
            revoked_at TEXT,
            expire_at TEXT,
            last_revealed_at TEXT,
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
            uuid TEXT,
            name TEXT,
            allowed_capabilities TEXT,
            ip_allowlist TEXT,
            network_policy_mode INTEGER,
            ip_rule_count INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE ai_quota_policy (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            name TEXT,
            quota_period INTEGER,
            quota_unit INTEGER,
            quota_limit TEXT,
            requests_per_second INTEGER,
            requests_per_day INTEGER,
            burst_limit TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE iam_gateway_risk_rule (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            rule_category INTEGER,
            rule_type INTEGER,
            scope_type INTEGER,
            scope_id INTEGER,
            target_type INTEGER,
            target_value TEXT,
            match_mode INTEGER,
            action INTEGER,
            priority INTEGER,
            requests_per_second INTEGER,
            requests_per_minute INTEGER,
            requests_per_day INTEGER,
            burst_limit TEXT,
            block_duration_seconds INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_channel_group_metric_snapshot (
            id INTEGER PRIMARY KEY,
            channel_group_id INTEGER NOT NULL,
            capacity_used TEXT,
            capacity_limit TEXT,
            usage_amount_total TEXT,
            snapshot_at TEXT,
            status INTEGER NOT NULL
        )"#,
        r#"CREATE TABLE ai_model_pricing (
            id INTEGER PRIMARY KEY,
            catalog_key TEXT,
            model TEXT NOT NULL,
            region_code TEXT NOT NULL DEFAULT 'global',
            price_side INTEGER NOT NULL,
            billing_meter_code TEXT NOT NULL,
            unit_price TEXT NOT NULL,
            currency TEXT NOT NULL,
            provider_code TEXT,
            channel_id INTEGER,
            pricing_plan_code TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT,
            priority INTEGER NOT NULL
        )"#,
        r#"CREATE TABLE ops_audit_log (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            operator_id INTEGER,
            action TEXT,
            target_type INTEGER,
            target_id INTEGER,
            created_at TEXT,
            retention_until TEXT,
            legal_hold INTEGER DEFAULT 0,
            metadata TEXT,
            operator_type INTEGER,
            operator_name_snapshot TEXT,
            target_uuid TEXT,
            client_ip_hash TEXT,
            user_agent_hash TEXT,
            before_hash TEXT,
            after_hash TEXT,
            change_summary TEXT
        )"#,
        r#"CREATE TABLE iam_tenant (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE iam_organization (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            parent_id TEXT,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
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
            updated_at TEXT NOT NULL
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
        r#"CREATE TABLE iam_credential (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            credential_type TEXT NOT NULL,
            credential_hash TEXT NOT NULL,
            status TEXT NOT NULL,
            expires_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE iam_user_identity (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            subject TEXT NOT NULL,
            email TEXT,
            created_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE iam_session (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            user_id TEXT NOT NULL,
            app_id TEXT NOT NULL,
            environment TEXT NOT NULL,
            deployment_mode TEXT NOT NULL,
            auth_level TEXT NOT NULL,
            auth_token_hash TEXT NOT NULL,
            access_token_hash TEXT NOT NULL,
            refresh_token_hash TEXT,
            sharding_key TEXT NOT NULL,
            sharding_strategy TEXT NOT NULL,
            data_scope_json TEXT NOT NULL,
            permission_scope_json TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            revoked_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE iam_security_event (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            user_id TEXT,
            session_id TEXT,
            event_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            detail_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE iam_audit_event (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            actor_user_id TEXT,
            action TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            resource_id TEXT,
            request_id TEXT,
            app_id TEXT,
            environment TEXT,
            sharding_key TEXT,
            detail_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE iam_user_preference (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            owner_type INTEGER,
            owner_id INTEGER,
            data_scope INTEGER,
            status INTEGER,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER DEFAULT 0,
            metadata TEXT,
            language TEXT,
            timezone TEXT,
            notification_preferences TEXT,
            deleted_by INTEGER,
            deleted_at TEXT
        )"#,
        r#"CREATE UNIQUE INDEX idx_iam_user_preference_subject
            ON iam_user_preference (tenant_id, organization_id, user_id)"#,
        r#"CREATE TABLE iam_user_security_setting (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            last_login_at TEXT,
            password_last_changed_at TEXT,
            mfa_enabled INTEGER NOT NULL,
            security_level INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE iam_user_login_event (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT,
            auth_method INTEGER,
            auth_provider TEXT,
            login_result INTEGER,
            risk_level INTEGER,
            mfa_verified INTEGER,
            session_id_hash TEXT,
            occurred_at TEXT,
            created_at TEXT,
            client_ip_masked TEXT
        )"#,
        r#"CREATE TABLE ai_usage (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            api_key_id INTEGER,
            api_key_name_snapshot TEXT,
            channel_group_id INTEGER,
            channel_group_snapshot TEXT,
            request_id TEXT,
            trace_id TEXT,
            catalog_key TEXT,
            requested_model_catalog_key TEXT,
            model TEXT,
            provider_native_model TEXT,
            region_code TEXT,
            channel_id INTEGER,
            status INTEGER NOT NULL,
            usage_type INTEGER,
            billing_meter_code TEXT,
            billable_quantity TEXT,
            request_count INTEGER,
            total_tokens INTEGER,
            prompt_tokens INTEGER,
            cached_tokens INTEGER,
            completion_tokens INTEGER,
            customer_charge_amount TEXT,
            cost_amount TEXT,
            modality INTEGER,
            rate_multiplier TEXT,
            base_input_unit_price TEXT,
            base_output_unit_price TEXT,
            cache_read_unit_price TEXT,
            occurred_at TEXT
        )"#,
        r#"CREATE TABLE ai_request_trace (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT,
            trace_id TEXT,
            status INTEGER NOT NULL,
            created_at TEXT,
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
            channel_name_snapshot TEXT,
            requested_model TEXT,
            provider_model TEXT,
            started_at TEXT,
            http_status INTEGER,
            provider_error_code TEXT,
            error_type TEXT,
            error_message_masked TEXT,
            latency_ms INTEGER,
            ttft_ms INTEGER,
            streaming INTEGER,
            prompt_tokens INTEGER,
            cached_tokens INTEGER,
            completion_tokens INTEGER,
            reasoning_effort TEXT,
            total_tokens INTEGER,
            client_ip_masked TEXT,
            request_path TEXT,
            endpoint TEXT,
            http_method TEXT
        )"#,
        r#"CREATE TABLE ai_routing_decision_log (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            request_id TEXT,
            status INTEGER NOT NULL,
            created_at TEXT,
            requested_model TEXT,
            resolved_model TEXT,
            selected_channel_id INTEGER
        )"#,
        r#"CREATE TABLE ai_routing_policy (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT,
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
            currency TEXT,
            UNIQUE(tenant_id, organization_id, policy_code)
        )"#,
        r#"CREATE TABLE ai_routing_profile (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT,
            policy_id INTEGER,
            profile_version INTEGER,
            profile_name TEXT,
            release_status INTEGER,
            traffic_percent TEXT,
            config_hash TEXT,
            published_at TEXT,
            published_by INTEGER,
            rollback_from_profile_id INTEGER,
            UNIQUE(policy_id, profile_version)
        )"#,
        r#"CREATE TABLE ai_routing_rule (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER,
            organization_id INTEGER,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT,
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
            effective_to TEXT,
            UNIQUE(profile_id, rule_code)
        )"#,
        r#"CREATE TABLE ai_model_rank_snapshot (
            id INTEGER PRIMARY KEY,
            snapshot_date TEXT,
            snapshot_period TEXT,
            rank_scope TEXT,
            catalog_key TEXT,
            model TEXT,
            vendor_code TEXT,
            region_code TEXT,
            vendor_name_snapshot TEXT,
            modality INTEGER,
            rank_no INTEGER,
            previous_rank_no INTEGER,
            request_count INTEGER,
            cost_amount TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE content_announcement (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            title TEXT,
            content TEXT,
            published_at TEXT,
            created_at TEXT,
            announcement_type INTEGER,
            effective_from TEXT,
            effective_to TEXT,
            pinned INTEGER
        )"#,
        r#"CREATE TABLE ops_metric_snapshot (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            status INTEGER NOT NULL,
            metric_name TEXT,
            metric_value TEXT,
            period_start TEXT
        )"#,
        r#"CREATE TABLE ops_config_snapshot (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            payload_hash TEXT,
            status INTEGER NOT NULL,
            snapshot_no TEXT,
            config_scope INTEGER,
            config_type INTEGER,
            source_table TEXT NOT NULL,
            source_ids TEXT,
            config_payload TEXT,
            config_hash TEXT,
            published_at TEXT,
            published_by INTEGER,
            rollback_from_snapshot_id INTEGER,
            created_at TEXT NOT NULL,
            retention_until TEXT,
            legal_hold INTEGER DEFAULT 0,
            metadata TEXT,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ops_notification_message (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            data_scope INTEGER NOT NULL DEFAULT 0,
            target_user_id INTEGER,
            target_scope INTEGER,
            status INTEGER NOT NULL,
            version INTEGER DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT,
            app_id TEXT,
            scope_type INTEGER DEFAULT 1,
            message_code TEXT,
            title TEXT,
            summary TEXT,
            content TEXT,
            published_at TEXT,
            updated_at TEXT,
            created_at TEXT,
            expire_at TEXT,
            message_type INTEGER,
            severity INTEGER,
            priority INTEGER DEFAULT 0,
            show_as_popup INTEGER DEFAULT 0,
            action_url TEXT
        )"#,
        r#"CREATE TABLE ops_notification_recipient (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT,
            message_id INTEGER NOT NULL,
            app_id TEXT,
            recipient_type INTEGER NOT NULL,
            recipient_value TEXT,
            recipient_user_id INTEGER,
            recipient_role_code TEXT
        )"#,
        r#"CREATE TABLE ops_notification_delivery (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            owner_type INTEGER,
            owner_id INTEGER,
            data_scope INTEGER NOT NULL DEFAULT 0,
            message_id INTEGER NOT NULL,
            app_id TEXT NOT NULL DEFAULT 'default',
            delivery_channel INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT,
            delivery_status INTEGER,
            delivered_at TEXT,
            read_at TEXT,
            popup_seen_at TEXT,
            archived_at TEXT,
            failure_code TEXT,
            retry_count INTEGER
        )"#,
        r#"CREATE TABLE iam_verification_scene_policy (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            scene_code TEXT NOT NULL,
            scene_name TEXT,
            allowed_channels TEXT NOT NULL DEFAULT '[]',
            default_channel TEXT,
            code_length INTEGER NOT NULL DEFAULT 6,
            ttl_seconds INTEGER NOT NULL DEFAULT 300,
            resend_interval_seconds INTEGER NOT NULL DEFAULT 60,
            max_send_per_hour INTEGER NOT NULL DEFAULT 5,
            max_verify_attempts INTEGER NOT NULL DEFAULT 5,
            template_code TEXT NOT NULL,
            risk_policy TEXT NOT NULL DEFAULT '{}'
        )"#,
        r#"CREATE TABLE messaging_provider_capability (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            provider_code TEXT NOT NULL,
            provider_account_id INTEGER NOT NULL,
            channel TEXT NOT NULL,
            delivery_purpose TEXT NOT NULL,
            capability_schema TEXT NOT NULL DEFAULT '{}',
            supports_template_sync INTEGER NOT NULL DEFAULT 0,
            supports_delivery_receipt INTEGER NOT NULL DEFAULT 0,
            supports_test_send INTEGER NOT NULL DEFAULT 0,
            supports_batch_send INTEGER NOT NULL DEFAULT 0,
            supports_webhook INTEGER NOT NULL DEFAULT 0,
            sandbox_supported INTEGER NOT NULL DEFAULT 0,
            health_status TEXT NOT NULL DEFAULT 'unknown'
        )"#,
        r#"CREATE TABLE messaging_sender_identity (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            provider_account_id INTEGER NOT NULL,
            provider_code TEXT NOT NULL,
            channel TEXT NOT NULL,
            identity_code TEXT NOT NULL,
            display_name TEXT,
            from_email TEXT,
            from_name TEXT,
            reply_to TEXT,
            domain_name TEXT,
            sign_name TEXT,
            sender_id TEXT,
            country_code TEXT,
            approval_status TEXT NOT NULL DEFAULT 'draft'
        )"#,
        r#"CREATE TABLE messaging_template (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            template_code TEXT NOT NULL,
            scene_code TEXT NOT NULL,
            channel TEXT NOT NULL,
            delivery_purpose TEXT NOT NULL,
            category TEXT NOT NULL,
            template_name TEXT NOT NULL,
            current_version_id INTEGER,
            publish_status TEXT NOT NULL DEFAULT 'draft'
        )"#,
        r#"CREATE TABLE messaging_template_version (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            template_id INTEGER NOT NULL,
            version_no INTEGER NOT NULL,
            subject_template TEXT,
            text_template TEXT,
            html_template TEXT,
            variable_schema TEXT NOT NULL DEFAULT '{}',
            content_hash TEXT NOT NULL,
            review_status TEXT NOT NULL DEFAULT 'draft',
            published_at TEXT
        )"#,
        r#"CREATE TABLE messaging_template_variant (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            template_version_id INTEGER NOT NULL,
            channel TEXT NOT NULL,
            locale TEXT NOT NULL,
            content_format TEXT NOT NULL,
            body_template TEXT NOT NULL
        )"#,
        r#"CREATE TABLE messaging_route_rule (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            rule_code TEXT NOT NULL,
            scene_code TEXT NOT NULL,
            channel TEXT NOT NULL,
            delivery_purpose TEXT NOT NULL,
            country_code TEXT NOT NULL DEFAULT '*',
            locale TEXT NOT NULL DEFAULT '*',
            user_segment TEXT NOT NULL DEFAULT '*',
            priority INTEGER NOT NULL DEFAULT 100,
            weight INTEGER NOT NULL DEFAULT 100,
            failover_policy TEXT NOT NULL DEFAULT '{}'
        )"#,
        r#"CREATE TABLE messaging_route_rule_target (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            route_rule_id INTEGER NOT NULL,
            provider_account_id INTEGER NOT NULL,
            provider_code TEXT NOT NULL,
            sender_identity_id INTEGER,
            template_binding_id INTEGER,
            target_order INTEGER NOT NULL DEFAULT 1,
            weight INTEGER NOT NULL DEFAULT 100
        )"#,
        r#"CREATE TABLE messaging_send_request (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            request_id TEXT,
            payload_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            scene_code TEXT NOT NULL,
            channel TEXT NOT NULL,
            delivery_purpose TEXT NOT NULL,
            target_type TEXT NOT NULL,
            target_hash TEXT NOT NULL,
            target_masked TEXT,
            template_version_id INTEGER,
            template_variant_id INTEGER,
            resolved_route_rule_id INTEGER,
            resolved_provider_account_id INTEGER,
            resolved_sender_identity_id INTEGER,
            render_hash TEXT NOT NULL,
            request_payload_redacted TEXT NOT NULL DEFAULT '{}',
            dry_run INTEGER NOT NULL DEFAULT 0,
            delivery_status TEXT NOT NULL
        )"#,
        r#"CREATE TABLE messaging_send_attempt (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            request_id TEXT,
            payload_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            send_request_id INTEGER NOT NULL,
            attempt_no INTEGER NOT NULL,
            provider_code TEXT NOT NULL,
            provider_account_id INTEGER NOT NULL,
            provider_status TEXT,
            attempted_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE messaging_delivery_event (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            request_id TEXT,
            payload_hash TEXT NOT NULL,
            send_request_id INTEGER NOT NULL,
            send_attempt_id INTEGER,
            provider_code TEXT NOT NULL,
            provider_event_id TEXT NOT NULL,
            provider_message_id TEXT,
            event_type TEXT NOT NULL,
            event_at TEXT NOT NULL,
            payload_redacted TEXT NOT NULL DEFAULT '{}'
        )"#,
        r#"CREATE TABLE messaging_suppression (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            channel TEXT NOT NULL,
            target_hash TEXT NOT NULL,
            target_masked TEXT,
            reason_code TEXT NOT NULL,
            scope_type TEXT NOT NULL DEFAULT 'tenant',
            scope_id TEXT NOT NULL DEFAULT '*',
            starts_at TEXT NOT NULL,
            ends_at TEXT,
            source TEXT NOT NULL,
            note TEXT
        )"#,
        r#"CREATE TABLE messaging_rate_limit_bucket (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            scene_code TEXT NOT NULL,
            channel TEXT NOT NULL,
            target_hash TEXT NOT NULL,
            ip_hash TEXT NOT NULL,
            device_hash TEXT NOT NULL,
            window_start TEXT NOT NULL,
            window_seconds INTEGER NOT NULL,
            send_count INTEGER NOT NULL DEFAULT 0,
            verify_count INTEGER NOT NULL DEFAULT 0,
            reject_count INTEGER NOT NULL DEFAULT 0,
            last_event_at TEXT
        )"#,
        r#"CREATE UNIQUE INDEX uk_ops_notification_delivery_user_message_app
            ON ops_notification_delivery (tenant_id, organization_id, message_id, user_id, app_id, delivery_channel)"#,
        r#"CREATE TABLE ops_gateway_instance (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER,
            organization_id INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT,
            metadata TEXT,
            instance_code TEXT,
            deployment_mode INTEGER,
            region TEXT,
            cell TEXT,
            host_name TEXT,
            ip_address_masked TEXT,
            node_name TEXT,
            health_status INTEGER,
            last_heartbeat_at TEXT
        )"#,
        r#"CREATE TABLE commerce_idempotency_key (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            scope TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            request_hash TEXT NOT NULL,
            response_json TEXT,
            status TEXT NOT NULL,
            locked_until TEXT,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, scope, idempotency_key)
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
        r#"CREATE TABLE commerce_billing_history (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            history_no TEXT NOT NULL,
            history_type TEXT NOT NULL,
            direction TEXT NOT NULL,
            asset_type TEXT NOT NULL,
            amount TEXT NOT NULL DEFAULT '0',
            currency_code TEXT,
            points_delta INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            title TEXT NOT NULL,
            reference_no TEXT,
            source_type TEXT NOT NULL,
            source_id TEXT NOT NULL,
            related_order_id TEXT,
            related_order_no TEXT,
            payment_method TEXT,
            occurred_at TEXT NOT NULL,
            metadata_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, history_no),
            UNIQUE (tenant_id, source_type, source_id)
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
        r#"CREATE TABLE promotion_discount_application (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            order_id TEXT,
            order_no TEXT,
            user_coupon_id TEXT NOT NULL,
            offer_id TEXT,
            offer_version_id TEXT,
            subject_type TEXT NOT NULL,
            subject_id TEXT NOT NULL,
            discount_amount TEXT NOT NULL DEFAULT '0',
            currency_code TEXT,
            applied_at TEXT,
            request_no TEXT,
            idempotency_key TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE promotion_coupon_ledger_entry (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            ledger_no TEXT NOT NULL,
            user_coupon_id TEXT,
            stock_id TEXT NOT NULL,
            offer_id TEXT NOT NULL,
            subject_type TEXT,
            subject_id TEXT,
            direction TEXT NOT NULL,
            quantity_delta INTEGER NOT NULL,
            balance_after INTEGER NOT NULL,
            business_type TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_id TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            occurred_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, ledger_no)
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
            merchant_order_no TEXT,
            subject TEXT,
            provider TEXT NOT NULL,
            provider_code TEXT,
            payment_method TEXT,
            scene_code TEXT,
            amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            status TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            metadata_json TEXT,
            provider_native_json TEXT,
            next_action_json TEXT,
            captured_amount TEXT,
            refunded_amount TEXT,
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
        r#"CREATE TABLE commerce_payment_route_decision (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            payment_intent_id TEXT NOT NULL,
            payment_attempt_id TEXT NOT NULL,
            route_rule_id TEXT,
            channel_id TEXT NOT NULL,
            provider_code TEXT NOT NULL,
            provider_account_id TEXT,
            method_code TEXT NOT NULL,
            scene_code TEXT NOT NULL,
            country_code TEXT,
            currency_code TEXT NOT NULL,
            amount TEXT NOT NULL,
            risk_level TEXT,
            decision_reason TEXT,
            fallback_from_channel_id TEXT,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, payment_attempt_id)
        )"#,
        r#"CREATE TABLE commerce_payment_operation_attempt (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            operation_no TEXT NOT NULL,
            provider_code TEXT NOT NULL,
            provider_account_id TEXT,
            channel_id TEXT,
            operation_code TEXT NOT NULL,
            sdkwork_resource_type TEXT NOT NULL,
            sdkwork_resource_id TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            request_digest TEXT NOT NULL,
            response_digest TEXT,
            native_request_id TEXT,
            native_trade_id TEXT,
            native_refund_id TEXT,
            http_status INTEGER,
            provider_error_code TEXT,
            provider_error_message TEXT,
            retryable TEXT,
            status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, provider_code, operation_code, idempotency_key)
        )"#,
        r#"CREATE TABLE commerce_refund (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            payment_intent_id TEXT,
            payment_attempt_id TEXT NOT NULL,
            refund_no TEXT NOT NULL,
            amount TEXT NOT NULL,
            currency_code TEXT,
            provider_code TEXT,
            reason TEXT,
            status TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, refund_no)
        )"#,
        r#"CREATE TABLE commerce_refund_attempt (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            refund_attempt_no TEXT NOT NULL,
            refund_id TEXT NOT NULL,
            provider_code TEXT NOT NULL,
            provider_account_id TEXT,
            out_refund_no TEXT NOT NULL,
            provider_refund_id TEXT,
            amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            status TEXT NOT NULL,
            failure_code TEXT,
            failure_message TEXT,
            submitted_at TEXT,
            succeeded_at TEXT,
            failed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, provider_code, out_refund_no)
        )"#,
        r#"CREATE TABLE commerce_refund_item (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            refund_id TEXT NOT NULL,
            order_item_id TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            refund_amount TEXT NOT NULL,
            tax_refund_amount TEXT NOT NULL DEFAULT '0',
            shipping_refund_amount TEXT NOT NULL DEFAULT '0',
            created_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_refund_event (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            refund_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            from_status TEXT,
            to_status TEXT NOT NULL,
            reason TEXT,
            created_at TEXT NOT NULL
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
        r#"CREATE TABLE integration_webhook_endpoint (
            id INTEGER PRIMARY KEY,
            uuid TEXT,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            owner_type INTEGER,
            owner_id INTEGER,
            data_scope INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            version INTEGER DEFAULT 0,
            metadata TEXT,
            endpoint_code TEXT NOT NULL,
            name TEXT,
            target_url TEXT,
            event_types TEXT,
            signing_alg TEXT,
            retry_policy TEXT,
            failure_count INTEGER,
            deleted_at TEXT,
            deleted_by INTEGER
        )"#,
        r#"CREATE UNIQUE INDEX idx_integration_webhook_endpoint_subject_code
            ON integration_webhook_endpoint (tenant_id, organization_id, endpoint_code)"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_messaging_verification_delivery(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO integration_provider
            (id, uuid, tenant_id, organization_id, provider_code, display_name, status)
        VALUES
            (9100, 'provider-sendgrid', 100001, 0, 'sendgrid', 'SendGrid', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO integration_provider_account
            (id, uuid, tenant_id, organization_id, provider_id, provider_code, account_code,
             account_name, auth_type, secret_ref, status)
        VALUES
            (9101, 'provider-account-sendgrid', 100001, 0, 9100, 'sendgrid', 'email-primary',
             'Primary SendGrid', 1, 'vault://providers/sendgrid/account/primary', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO messaging_provider_capability
            (id, uuid, tenant_id, organization_id, provider_code, provider_account_id,
             channel, delivery_purpose, supports_delivery_receipt, supports_test_send,
             health_status, status)
        VALUES
            (3101, 'cap-sendgrid-email-verification', 100001, 0, 'sendgrid', 9101,
             'email', 'verification', 1, 1, 'healthy', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO messaging_sender_identity
            (id, uuid, tenant_id, organization_id, provider_account_id, provider_code, channel,
             identity_code, display_name, from_email, from_name, approval_status, status)
        VALUES
            (8101, 'sender-noreply', 100001, 0, 9101, 'sendgrid', 'email',
             'noreply', 'No Reply', 'noreply@example.com', 'SDKWORK', 'approved', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO iam_verification_scene_policy
            (id, tenant_id, organization_id, scene_code, allowed_channels, default_channel,
             code_length, ttl_seconds, resend_interval_seconds, max_send_per_hour,
             max_verify_attempts, template_code, risk_policy, status)
        VALUES
            (6101, 100001, 0, 'register', '["email"]', 'email',
             6, 300, 60, 5, 5, 'REGISTER_EMAIL', '{}', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO messaging_template
            (id, uuid, tenant_id, organization_id, template_code, scene_code, channel,
             delivery_purpose, category, template_name, current_version_id, publish_status, status)
        VALUES
            (7000, 'template-register-email', 100001, 0, 'REGISTER_EMAIL', 'register', 'email',
             'verification', 'otp', 'Register Email', 7001, 'published', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO messaging_template_version
            (id, uuid, tenant_id, organization_id, template_id, version_no, subject_template,
             text_template, html_template, variable_schema, content_hash, review_status,
             published_at, status)
        VALUES
            (7001, 'template-register-email-v1', 100001, 0, 7000, 1, 'Your verification code',
             'Code {{code}} expires at {{expiresAt}}',
             '<p>Code {{code}} expires at {{expiresAt}}</p>',
             '{"required":["code","expiresAt"]}', 'hash-register-email-v1',
             'published', '2026-05-25 10:00:00', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO messaging_template_variant
            (id, uuid, tenant_id, organization_id, template_version_id, channel, locale,
             content_format, body_template, status)
        VALUES
            (7101, 'template-register-email-v1-default', 100001, 0, 7001, 'email', 'default',
             'html', '<p>Code {{code}} expires at {{expiresAt}}</p>', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO messaging_route_rule
            (id, uuid, tenant_id, organization_id, rule_code, scene_code, channel,
             delivery_purpose, country_code, locale, user_segment, priority, weight,
             failover_policy, status)
        VALUES
            (4001, 'route-register-email', 100001, 0, 'register-email', 'register', 'email',
             'verification', '*', '*', '*', 10, 100, '{}', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO messaging_route_rule_target
            (id, uuid, tenant_id, organization_id, route_rule_id, provider_account_id,
             provider_code, sender_identity_id, target_order, weight, status)
        VALUES
            (5001, 'route-register-email-target', 100001, 0, 4001, 9101,
             'sendgrid', 8101, 1, 100, 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_catalog_with_two_user_api_keys(pool: &SqlitePool) {
    let owner_key_metadata = api_key_metadata_json("sk-owner-secret");
    let other_key_metadata = api_key_metadata_json("sk-other-secret");
    for statement in [
        "INSERT INTO ai_model_vendor (id, uuid, tenant_id, organization_id, vendor_code, display_name, status, sort_order) VALUES (1, 'vendor-openai-app-api-test', 100001, 0, 'openai', 'OpenAI', 1, 1)",
        "INSERT INTO ai_model_vendor (id, uuid, tenant_id, organization_id, vendor_code, display_name, status, sort_order) VALUES (2, 'vendor-cohere-app-api-test', 100001, 0, 'cohere', 'Cohere', 1, 2)",
        r#"INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name, vendor_code, capabilities, release_stage, shelf_state, routing_state, status, rank_score)
            VALUES (1, 'model-openai-gpt-4o-mini-app-api-test', 0, 0, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'GPT-4o mini', 'openai', '["chat"]', 1, 1, 1, 1, '100.0')"#,
        "INSERT INTO ai_provider (id, tenant_id, organization_id, provider_code, default_vendor_code, provider_type, protocol_code, base_url, status) VALUES (2, 100001, 0, 'openrouter', 'openai', 'relay_aggregator', 'openai_v1', 'http://provider-proxy.internal/openrouter-template', 1)",
        "INSERT INTO ai_channel (id, tenant_id, organization_id, provider_id, provider_code, channel_code, channel_name, channel_type, base_url, credential_ref, region_code, status, priority, weight, health_status) VALUES (3001, 100001, 0, 2, 'openrouter', 'openrouter-main', 'OpenRouter Main', 'relay', 'http://provider-proxy.internal/openrouter', 'vault://providers/openrouter/account/main', 'global', 1, 10, 100, 1)",
        "INSERT INTO ai_channel_credential (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code, credential_name, auth_config, credential_ref, credential_hash, base_url, priority, weight, health_status, status) VALUES (300101, 'channel-credential-openrouter-main', 100001, 0, 3001, 'openrouter', 'openrouter-main', 'primary', '{}', 'vault://providers/openrouter/account/main', 'hash:openrouter-main', 'http://provider-proxy.internal/openrouter', 1, 100, 1, 1)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_code, status, sort_order) VALUES (9101, 'resource-vendor-openai-app-api-test', 100001, 0, 'vendor.openai', 'vendor', 'OpenAI', 'openai', 1, 1)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_code, status, sort_order) VALUES (9106, 'resource-vendor-cohere-app-api-test', 100001, 0, 'vendor.cohere', 'vendor', 'Cohere', 'cohere', 1, 6)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_code, modality_code, api_code, catalog_key, model, provider_native_model, status, sort_order) VALUES (9102, 'resource-model-openai-gpt-4o-mini-app-api-test', 100001, 0, 'model.openai.gpt-4o-mini.chat', 'model_api', 'GPT-4o mini Chat', 'openai', 'chat', 'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini', 1, 2)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, modality_code, status, sort_order) VALUES (9103, 'resource-modality-llm-app-api-test', 100001, 0, 'modality.llm', 'modality', 'LLM', 'llm', 1, 3)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, modality_code, status, sort_order) VALUES (9104, 'resource-modality-image-app-api-test', 100001, 0, 'modality.image', 'modality', 'Image', 'image', 1, 4)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_code, modality_code, api_code, catalog_key, model, provider_native_model, status, sort_order) VALUES (9105, 'resource-model-openai-gpt-4o-mini-image-app-api-test', 100001, 0, 'model.openai.gpt-4o-mini.image', 'model_api', 'GPT-4o mini Image', 'openai', 'image', 'openai.images', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini', 1, 5)",
        "INSERT INTO ai_channel_resource (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code, resource_id, resource_code, grant_type, priority, status) VALUES (9202, 'channel-resource-openroutes-gpt-4o-mini-app-api-test', 100001, 0, 3001, 'openrouter', 'openrouter-main', 9102, 'model.openai.gpt-4o-mini.chat', 'allow', 1, 1)",
        "INSERT INTO ai_channel_group_resource (id, uuid, tenant_id, organization_id, channel_group_id, resource_id, resource_code, grant_type, priority, status) VALUES (9203, 'channel-group-resource-openroutes-gpt-4o-mini-app-api-test', 100001, 0, 10, 9102, 'model.openai.gpt-4o-mini.chat', 'allow', 1, 1)",
        "INSERT INTO ai_pricing_plan (id, plan_code, base_price_side, default_multiplier, default_markup_amount, currency, status, priority) VALUES (1, 'standard', 1, '1.200000', '0.000000', 'USD', 1, 1)",
        "INSERT INTO ai_channel_group (id, tenant_id, organization_id, group_code, group_name, pricing_plan_code, rate_multiplier, official_price_multiplier, status, updated_at) VALUES (10, 100001, 0, 'standard-group', 'Standard Group', 'standard', '1.000000', '1.100000', 1, '2026-04-29 09:00:00')",
        "INSERT INTO ai_channel_group_member (id, tenant_id, organization_id, channel_group_id, channel_id, priority, weight, enabled, status) VALUES (600, 100001, 0, 10, 3001, 1, 100, 1, 1)",
        "INSERT INTO ai_model_pricing (id, catalog_key, model, region_code, price_side, billing_meter_code, unit_price, currency, status, priority) VALUES (1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'global', 1, 'llm_input_token', '0.150000', 'USD', 1, 1)",
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
    sqlx::query(
        r#"
        INSERT INTO iam_gateway_api_key
            (id, tenant_id, organization_id, user_id, channel_group_id, name, key_prefix, key_display_masked, key_hash, idempotency_key, status, created_at, updated_at, metadata)
            VALUES (100, 100001, 0, 30, 10, 'Owner Key', 'sk-owner', 'sk-owner********ABCD', 'hash:owner', 'seed-owner-key', 1, '2026-04-10 20:55:41', '2026-04-29 09:00:00', ?)
        "#,
    )
    .bind(&owner_key_metadata)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO iam_gateway_api_key
            (id, tenant_id, organization_id, user_id, channel_group_id, name, key_prefix, key_display_masked, key_hash, idempotency_key, status, created_at, updated_at, metadata)
            VALUES (101, 100001, 0, 31, 10, 'Other User Key', 'sk-other', 'sk-other********WXYZ', 'hash:other', 'seed-other-key', 1, '2026-04-10 20:55:42', '2026-04-29 09:01:00', ?)
        "#,
    )
    .bind(&other_key_metadata)
    .execute(pool)
    .await
    .unwrap();
    for statement in [
        "INSERT INTO iam_gateway_api_key_channel_group (id, uuid, tenant_id, organization_id, user_id, api_key_id, channel_group_id, channel_group_code, binding_role, routing_strategy, priority, weight, status) VALUES (1000, 'gateway-api-key-channel-group-owner-app-api-test', 100001, 0, 30, 100, 10, 'standard-group', 'route', 'auto', 100, 100, 1)",
        "INSERT INTO iam_gateway_api_key_channel_group (id, uuid, tenant_id, organization_id, user_id, api_key_id, channel_group_id, channel_group_code, binding_role, routing_strategy, priority, weight, status) VALUES (1001, 'gateway-api-key-channel-group-other-app-api-test', 100001, 0, 31, 101, 10, 'standard-group', 'route', 'auto', 100, 100, 1)",
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

fn api_key_metadata_json(secret: &str) -> String {
    let codec = RingAeadApiKeySecretCodec::new(api_key_security_config().pepper_secret()).unwrap();
    serde_json::json!({
        "copyableKeyCiphertext": codec.encode_secret(secret).unwrap(),
        "copyableKeyStorage": "encrypted-managed-console-read-model"
    })
    .to_string()
}

async fn seed_app_user_data(pool: &SqlitePool) {
    let owner_password_hash = Pbkdf2Sha256PasswordHasher::hash_password_with_salt(
        "correct-password",
        b"database-config-owner-password-salt",
        1_000,
    )
    .unwrap();
    for statement in [
        r#"INSERT INTO iam_tenant
            (id, code, name, status, created_at, updated_at)
            VALUES ('100001', 'SDKWORK', 'SDKWork', 'active', '2026-04-01 00:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO iam_organization
            (id, tenant_id, parent_id, code, name, path, status, created_at, updated_at)
            VALUES ('0', '100001', NULL, 'root', 'Root Organization', '/0', 'active', '2026-04-01 00:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO iam_user
            (id, tenant_id, username, display_name, email, phone, avatar_media_resource_id, avatar_object_blob_id, avatar_resource_snapshot, status, created_at, updated_at)
            VALUES ('30', '100001', 'owner', 'Owner User', 'owner@example.com', '+15550000030', 'media-owner-avatar', 'iam-user-avatar:owner', '{"kind":"image","source":"provider_asset","uri":"iam-user-avatar:owner"}', 'active', '2026-04-01 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO iam_user
            (id, tenant_id, username, display_name, email, phone, avatar_media_resource_id, avatar_object_blob_id, avatar_resource_snapshot, status, created_at, updated_at)
            VALUES ('31', '100001', 'other', 'Other User', 'other@example.com', '+15550000031', 'media-other-avatar', 'iam-user-avatar:other', '{"kind":"image","source":"provider_asset","uri":"iam-user-avatar:other"}', 'active', '2026-04-02 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO iam_organization_membership
            (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, created_at, updated_at)
            VALUES ('member-30', '100001', '0', '30', 'owner', 'Owner User', 1, 'active', '2026-04-01 08:00:00', '2026-04-01 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO iam_organization_membership
            (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, created_at, updated_at)
            VALUES ('member-31', '100001', '0', '31', 'member', 'Other User', 0, 'active', '2026-04-02 08:00:00', '2026-04-02 08:00:00', '2026-04-29 08:00:00')"#,
        "INSERT INTO iam_user_preference (id, tenant_id, organization_id, user_id, language) VALUES (1001, 100001, 0, 30, 'zh-CN')",
        r#"INSERT INTO iam_user_security_setting
            (id, tenant_id, organization_id, user_id, last_login_at, password_last_changed_at, mfa_enabled, security_level)
            VALUES (1002, 100001, 0, 30, '2026-04-20 12:00:00', '2026-04-20 12:00:00', 1, 1)"#,
        r#"INSERT INTO iam_user_login_event
            (id, tenant_id, organization_id, user_id, request_id, occurred_at, created_at, client_ip_masked)
            VALUES (1003, 100001, 0, 30, 'owner-login-request', '2026-04-29 10:00:00', '2026-04-29 10:00:00', '203.0.113.***')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
    sqlx::query(
        r#"INSERT INTO iam_credential
            (id, tenant_id, user_id, credential_type, credential_hash, status, created_at, updated_at)
            VALUES ('credential-30-password', '100001', '30', 'password', ?, 'active', '2026-04-01 08:00:00', '2026-04-29 08:00:00')"#,
    )
    .bind(owner_password_hash)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"INSERT INTO iam_credential
            (id, tenant_id, user_id, credential_type, credential_hash, status, created_at, updated_at)
            VALUES ('credential-31-password', '100001', '31', 'password', 'other-password-hash', 'active', '2026-04-02 08:00:00', '2026-04-29 08:00:00')"#,
    )
    .execute(pool)
    .await
    .unwrap();
    for statement in [
        r#"INSERT INTO iam_user_identity
            (id, tenant_id, user_id, provider, subject, email, created_at)
            VALUES ('identity-30-github', '100001', '30', 'github', 'github-owner-open-id', 'owner@example.com', '2026-04-01 08:00:00')"#,
        r#"INSERT INTO iam_user_identity
            (id, tenant_id, user_id, provider, subject, email, created_at)
            VALUES ('identity-30-google', '100001', '30', 'google', 'google-owner-open-id', 'owner@example.com', '2026-04-01 08:00:00')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_second_app_organization_membership(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO iam_organization
            (id, tenant_id, parent_id, code, name, path, status, created_at, updated_at)
            VALUES ('21', '100001', NULL, 'workspace', 'Workspace Organization', '/21', 'active', '2026-04-02 00:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO iam_organization_membership
            (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, created_at, updated_at)
            VALUES ('member-30-workspace', '100001', '21', '30', 'member', 'Owner User', 0, 'active', '2026-03-31 08:00:00', '2026-03-31 08:00:00', '2026-04-29 08:00:00')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_auth_settings_snapshot(pool: &SqlitePool, payload: Value) {
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (uuid, tenant_id, organization_id, user_id, request_id, status, created_at, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by)
        VALUES
            ('auth-settings-policy-snapshot', 100001, 0, 30, 'auth-settings-policy-seed', 1, '2026-04-29 09:00:00', 'auth-settings-policy-seed', 30, 65, 'iam_auth_runtime_settings', '["auth-settings"]', ?, 'hash:auth-settings-policy-seed', '2026-04-29 09:00:00', 30)
        "#,
    )
    .bind(payload.to_string())
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_dashboard_data(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO ai_usage
            (id, tenant_id, organization_id, user_id, request_id, status, request_count, total_tokens, customer_charge_amount, cost_amount, modality, occurred_at)
            VALUES (2001, 100001, 0, 30, 'owner-text-request', 1, 5, 1000, '1.000000', '0.700000', 1, '2026-04-29 09:00:00')"#,
        r#"INSERT INTO ai_usage
            (id, tenant_id, organization_id, user_id, request_id, status, request_count, total_tokens, customer_charge_amount, cost_amount, modality, occurred_at)
            VALUES (2002, 100001, 0, 30, 'owner-image-request', 1, 2, 0, '0.250000', '0.120000', 2, '2026-04-29 11:00:00')"#,
        r#"INSERT INTO ai_usage
            (id, tenant_id, organization_id, user_id, request_id, status, request_count, total_tokens, customer_charge_amount, cost_amount, modality, occurred_at)
            VALUES (2010, 100001, 0, 30, 'owner-history-request', 1, 3, 300, '1.750000', '1.200000', 1, '2026-03-01 08:00:00')"#,
        r#"INSERT INTO ai_usage
            (id, tenant_id, organization_id, user_id, request_id, status, request_count, total_tokens, customer_charge_amount, cost_amount, modality, occurred_at)
            VALUES (2003, 100001, 0, 31, 'other-user-request', 1, 99, 9900, '99.000000', '50.000000', 1, '2026-04-29 10:00:00')"#,
        r#"INSERT INTO ai_request_trace
            (id, tenant_id, organization_id, user_id, request_id, status, started_at, http_status, provider_error_code, error_type)
            VALUES (2004, 100001, 0, 30, 'owner-error-request', 1, '2026-04-29 12:00:00', 500, 'provider_500', 'provider_error')"#,
        r#"INSERT INTO ai_request_trace
            (id, tenant_id, organization_id, user_id, request_id, status, started_at, http_status, provider_error_code, error_type)
            VALUES (2005, 100001, 0, 31, 'other-user-request', 1, '2026-04-29 12:05:00', 500, 'other_provider_500', 'provider_error')"#,
        r#"INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name, vendor_code, capabilities, release_stage, shelf_state, routing_state, status, rank_score)
            VALUES (2006, 'model-alibaba-qwen3-7-max-dashboard-test', 0, 0, 'alibaba/qwen3.7-max', 'qwen3.7-max', 'Qwen3.7 Max', 'alibaba', '["chat"]', 1, 1, 1, 1, '95.0')"#,
        r#"INSERT INTO ai_model_rank_snapshot
            (id, tenant_id, organization_id, status, snapshot_date, snapshot_period, rank_scope, catalog_key, model, vendor_code, region_code, vendor_name_snapshot, modality, rank_no, previous_rank_no, request_count, cost_amount)
            VALUES (2006, 100001, 0, 1, '2026-04-29', 'daily', 'commercial-default', 'alibaba/qwen3.7-max', 'qwen3.7-max', 'alibaba', 'global', 'Alibaba', 1, 1, 2, 7, '1.250000')"#,
        r#"INSERT INTO ops_notification_message
            (id, uuid, tenant_id, organization_id, status, app_id, scope_type, message_code, message_type, title, summary, content, severity, priority, show_as_popup, published_at, expire_at, created_at, updated_at)
            VALUES (2007, 'dashboard-announcement-2007', 100001, 0, 1, NULL, 2, 'announcement:2007', 1, 'Planned model upgrade', 'Planned model upgrade', 'Planned model upgrade content', 3, 100, 1, '2026-04-29 08:00:00', '2099-01-01 00:00:00', '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO ops_notification_recipient
            (id, uuid, tenant_id, organization_id, status, message_id, app_id, recipient_type, recipient_value)
            VALUES (2007, 'dashboard-announcement-recipient-2007', 100001, 0, 1, 2007, NULL, 1, 'all')"#,
        "INSERT INTO ops_metric_snapshot (id, tenant_id, organization_id, status, metric_name, metric_value, period_start) VALUES (2008, 100001, 0, 1, 'latency_p50_ms', '123.45', '2026-04-29 12:00:00')",
        "INSERT INTO ops_metric_snapshot (id, tenant_id, organization_id, status, metric_name, metric_value, period_start) VALUES (2009, 100001, 0, 1, 'latency_p95_ms', '456.78', '2026-04-29 12:00:00')",
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_billing_data(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO promotion_offer
            (id, tenant_id, organization_id, offer_no, offer_code, name, offer_type, audience_scope, combinability, priority, status, current_offer_version_id, starts_at, ends_at, created_at, updated_at)
            VALUES
            ('offer-welcome', '100001', '0', 'offer-welcome', 'welcome_points', 'Welcome points', 'coupon', 'new_user', 'exclusive', 100, 'active', 'offer-version-welcome-v1', '2026-01-01 00:00:00', '2099-01-01 00:00:00', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('offer-other-user', '100001', '0', 'offer-other-user', 'other_user_points', 'Other user welcome points', 'coupon', 'new_user', 'exclusive', 90, 'active', 'offer-version-other-user-v1', '2026-01-01 00:00:00', '2099-01-01 00:00:00', '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO promotion_offer_version
            (id, tenant_id, organization_id, offer_id, version_no, lifecycle_status, discount_type, discount_value, minimum_amount, maximum_discount_amount, currency_code, rule_json, stack_rule_json, published_at, created_at, updated_at)
            VALUES
            ('offer-version-welcome-v1', '100001', '0', 'offer-welcome', 'v1', 'published', 'fixed_amount', '5.00', '0', NULL, 'CNY', '{}', NULL, '2026-04-29 08:00:00', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('offer-version-other-user-v1', '100001', '0', 'offer-other-user', 'v1', 'published', 'fixed_amount', '9.00', '0', NULL, 'CNY', '{}', NULL, '2026-04-29 08:00:00', '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO promotion_coupon_stock
            (id, tenant_id, organization_id, stock_no, name, offer_id, offer_version_id, stock_type, total_quantity, available_quantity, claimed_quantity, redeemed_quantity, locked_quantity, status, starts_at, expires_at, created_at, updated_at)
            VALUES
            ('stock-welcome', '100001', '0', 'stock-welcome', 'Welcome stock', 'offer-welcome', 'offer-version-welcome-v1', 'limited', 100, 100, 0, 0, 0, 'active', '2026-01-01 00:00:00', '2099-01-01 00:00:00', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('stock-other-user', '100001', '0', 'stock-other-user', 'Other user stock', 'offer-other-user', 'offer-version-other-user-v1', 'limited', 100, 99, 1, 0, 0, 'active', '2026-01-01 00:00:00', '2099-01-01 00:00:00', '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO promotion_code
            (id, tenant_id, organization_id, code_no, stock_id, offer_id, offer_version_id, promotion_code, code_type, max_claims, claimed_quantity, status, starts_at, expires_at, created_at, updated_at)
            VALUES
            ('code-welcome', '100001', '0', 'code-welcome', 'stock-welcome', 'offer-welcome', 'offer-version-welcome-v1', 'WELCOME', 'public', 100, 0, 'active', '2026-01-01 00:00:00', '2099-01-01 00:00:00', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('code-other-user', '100001', '0', 'code-other-user', 'stock-other-user', 'offer-other-user', 'offer-version-other-user-v1', 'OTHERUSER', 'public', 100, 1, 'active', '2026-01-01 00:00:00', '2099-01-01 00:00:00', '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO commerce_account
            (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code, available_amount, frozen_amount, version, status, created_at, updated_at)
            VALUES
            ('owner-points-account', '100001', '0', '30', 'points', 'POINT', '100', '0', 0, 'active', '2026-04-01 08:00:00', '2026-04-29 08:00:00'),
            ('owner-token-account', '100001', '0', '30', 'token', NULL, '120', '8', 0, 'active', '2026-04-01 08:00:00', '2026-04-29 08:00:00'),
            ('other-points-account', '100001', '0', '31', 'points', 'POINT', '900', '0', 0, 'active', '2026-04-01 08:00:00', '2026-04-29 08:00:00'),
            ('other-token-account', '100001', '21', '30', 'token', NULL, '999', '0', 0, 'active', '2026-04-01 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO promotion_user_coupon
            (id, tenant_id, organization_id, coupon_no, stock_id, code_id, offer_id, offer_version_id, subject_type, subject_id, owner_user_id, coupon_code, status, claimed_at, valid_from, expires_at, redeemed_at, disabled_at, request_no, idempotency_key, created_at, updated_at)
            VALUES ('other-user-coupon', '100001', '0', 'coupon-other-user', 'stock-other-user', 'code-other-user', 'offer-other-user', 'offer-version-other-user-v1', 'user', '31', '31', 'OTHERUSER-31', 'claimed', '2026-04-28 08:00:00', '2026-04-28 08:00:00', '2099-01-01 00:00:00', NULL, NULL, 'other-user-coupon-claim', 'other-user-coupon-claim', '2026-04-28 08:00:00', '2026-04-28 08:00:00')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_app_routing_runtime_data(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO ai_provider
            (id, tenant_id, organization_id, provider_code, default_vendor_code, provider_type, protocol_code, display_name, description, base_url, auth_type, status, sort_order)
            VALUES (4001, 100001, 0, 'openai', 'openai', 'official', 'openai_v1', 'Routing OpenAI Provider', 'Owner routing provider', 'https://api.openai.example/v1', 1, 1, 1)"#,
        r#"INSERT INTO ai_channel
            (id, tenant_id, organization_id, provider_id, provider_code, channel_code,
             channel_name, channel_type, protocol_code, auth_type, base_url, credential_ref,
             masked_label, upstream_balance_amount, upstream_balance_currency, capabilities,
             status, priority, weight, health_status, last_latency_ms, rpm_limit,
             consecutive_error_count)
            VALUES (4003, 100001, 0, 4001, 'openai', 'openai-primary',
             'OpenAI Primary', 'official', 'openai_v1', 1,
             'https://api.openai.example/v1', 'vault://providers/openai/main',
             'vault-label-openai-main', '42.50', 'USD', '["llm","vision"]',
             1, 1, 100, 1, 321, 600, 0)"#,
        r#"INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code, resource_code, grant_type, priority, status)
            VALUES (4005, 'channel-resource-openai-primary-gpt-4o-mini', 100001, 0, 4003, 'openai', 'openai-primary', 'model.openai.gpt-4o-mini.chat', 'allow', 1, 1)"#,
        r#"INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code, resource_code, grant_type, priority, status)
            VALUES (4004, 'channel-resource-openai-primary-vendor-openai', 100001, 0, 4003, 'openai', 'openai-primary', 'vendor.openai', 'allow', 0, 1)"#,
        r#"INSERT INTO ai_channel
            (id, tenant_id, organization_id, provider_id, provider_code, channel_code,
             channel_name, channel_type, protocol_code, auth_type, base_url,
             credential_ref, capabilities, status, priority, weight, health_status,
             last_latency_ms, rpm_limit, consecutive_error_count)
            VALUES (4013, 10, 21, 4001, 'openai', 'other-tenant-channel',
             'Other Tenant Channel', 'official', 'openai_v1', 1,
             'https://other-tenant.example/v1', 'vault://providers/openai/main',
             '["llm"]', 1, 1, 100, 1, 111, 100, 0)"#,
        r#"INSERT INTO ai_usage
            (id, tenant_id, organization_id, user_id, api_key_id, request_id, model, status, request_count, total_tokens, customer_charge_amount, cost_amount, modality, occurred_at)
            VALUES (4014, 100001, 0, 30, 100, 'owner-runtime-request', 'gpt-4o-mini', 1, 5, 1000, '1.000000', '0.700000', 1, '2026-04-29 13:00:00')"#,
        r#"INSERT INTO ai_usage
            (id, tenant_id, organization_id, user_id, api_key_id, request_id, model, status, request_count, total_tokens, customer_charge_amount, cost_amount, modality, occurred_at)
            VALUES (4015, 100001, 0, 31, 101, 'other-user-runtime-request', 'gpt-4o-mini', 1, 77, 7700, '77.000000', '7.000000', 1, '2026-04-29 13:05:00')"#,
        r#"INSERT INTO ai_request_trace
            (id, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at, channel_name_snapshot, requested_model, provider_model, started_at, http_status, provider_error_code, error_type, latency_ms, total_tokens, client_ip_masked, request_path, endpoint, http_method)
            VALUES (4005, 100001, 0, 30, 'owner-runtime-request', 'trace-owner-routing', 1, '2026-04-29 13:00:00', 'OpenAI Primary', 'gpt-4o-mini', 'gpt-4o-mini', '2026-04-29 13:00:00', 200, NULL, NULL, 321, 1000, '203.0.113.***', '/v1/chat/completions', '/v1/chat/completions', 'POST')"#,
        r#"INSERT INTO ai_request_trace
            (id, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at, channel_name_snapshot, requested_model, provider_model, started_at, http_status, provider_error_code, error_type, latency_ms, total_tokens, client_ip_masked, request_path, endpoint, http_method)
            VALUES (4006, 100001, 0, 31, 'other-user-runtime-request', 'trace-other-routing', 1, '2026-04-29 13:05:00', 'Other User Channel', 'gpt-4o-mini', 'gpt-4o-mini', '2026-04-29 13:05:00', 500, 'other_error', 'provider_error', 999, 7700, '198.51.100.***', '/v1/chat/completions', '/v1/chat/completions', 'POST')"#,
        r#"INSERT INTO ai_routing_decision_log
            (id, tenant_id, organization_id, user_id, request_id, status, created_at, requested_model, resolved_model, selected_channel_id)
            VALUES (4007, 100001, 0, 30, 'owner-runtime-request', 1, '2026-04-29 13:00:00', 'gpt-4o-mini', 'gpt-4o-mini', 4003)"#,
        r#"INSERT INTO ai_routing_policy
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, policy_code, name, policy_scope, subject_id, capability, default_profile_id, fallback_mode, currency)
            VALUES (4020, 'owner-routing-policy', 100001, 0, 1, 1, '2026-04-29 08:00:00', '2026-04-29 08:00:00', 0, '{}', 'console-routing-default', 'Owner Routing Strategy', 1, 30, 1, 4021, 2, 'USD')"#,
        r#"INSERT INTO ai_routing_profile
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, policy_id, profile_version, profile_name, release_status, traffic_percent, config_hash, published_at, published_by)
            VALUES (4021, 'owner-routing-profile', 100001, 0, 1, 1, '2026-04-29 08:00:00', '2026-04-29 08:00:00', 0, '{}', 4020, 1, 'Owner Strategy', 2, '100', 'owner-hash', '2026-04-29 08:00:00', 30)"#,
        r#"INSERT INTO ai_routing_rule
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, profile_id, rule_code, priority, match_expression, target_model)
            VALUES (4022, 'owner-routing-rule', 100001, 0, 1, 1, '2026-04-29 08:00:00', '2026-04-29 08:00:00', 0, '{}', 4021, 'model-map-gpt-4', 1, '{"sourceModel":"gpt-4"}', 'azure-gpt4-32k')"#,
        r#"INSERT INTO ai_routing_policy
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, policy_code, name, policy_scope, subject_id, capability, default_profile_id, fallback_mode, currency)
            VALUES (4023, 'other-routing-policy', 10, 21, 1, 1, '2026-04-29 08:00:00', '2026-04-29 08:00:00', 0, '{}', 'console-routing-default', 'Other Tenant Strategy', 1, 30, 1, 4024, 3, 'USD')"#,
        r#"INSERT INTO ai_routing_profile
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, policy_id, profile_version, profile_name, release_status, traffic_percent, config_hash, published_at, published_by)
            VALUES (4024, 'other-routing-profile', 10, 21, 1, 1, '2026-04-29 08:00:00', '2026-04-29 08:00:00', 0, '{}', 4023, 1, 'Other Strategy', 2, '100', 'other-hash', '2026-04-29 08:00:00', 30)"#,
        r#"INSERT INTO ai_routing_rule
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, profile_id, rule_code, priority, match_expression, target_model)
            VALUES (4025, 'other-routing-rule', 10, 21, 1, 1, '2026-04-29 08:00:00', '2026-04-29 08:00:00', 0, '{}', 4024, 'model-map-other', 1, '{"sourceModel":"other-tenant-model"}', 'other-tenant-target')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_app_providers_runtime_data(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO ai_provider
            (id, tenant_id, organization_id, provider_code, default_vendor_code, provider_type, protocol_code, display_name, description, base_url, auth_type, status, sort_order)
            VALUES (4101, 100001, 0, 'openai', 'openai', 'official', 'openai_v1', 'Tenant OpenAI Provider', 'Tenant-owned OpenAI compatible provider', 'https://api.openai.example/v1', 1, 1, 1)"#,
        r#"INSERT INTO ai_channel
            (id, tenant_id, organization_id, provider_id, provider_code, channel_code,
             channel_name, channel_type, protocol_code, auth_type, base_url, credential_ref,
             masked_label, upstream_balance_amount, upstream_balance_currency, capabilities,
             status, priority, weight, health_status, last_latency_ms, rpm_limit,
             consecutive_error_count)
            VALUES (4103, 100001, 0, 4101, 'openai', 'tenant-openai-primary',
             'Tenant OpenAI Primary', 'official', 'openai_v1', 1,
             'https://tenant-openai.example/v1', 'vault://providers/openai/main',
             'sk-provider-secret', '10.00', 'USD', '["llm"]',
             1, 1, 100, 1, 111, 600, 0)"#,
        r#"INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code, resource_code, grant_type, priority, status)
            VALUES (4106, 'channel-resource-tenant-openai-primary-gpt-4o-mini', 100001, 0, 4103, 'openai', 'tenant-openai-primary', 'model.openai.gpt-4o-mini.chat', 'allow', 1, 1)"#,
        r#"INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code, resource_code, grant_type, priority, status)
            VALUES (4104, 'channel-resource-tenant-openai-primary-vendor-openai', 100001, 0, 4103, 'openai', 'tenant-openai-primary', 'vendor.openai', 'allow', 0, 1)"#,
        r#"INSERT INTO ai_provider
            (id, tenant_id, organization_id, provider_code, default_vendor_code, provider_type, protocol_code, display_name, description, base_url, auth_type, status, sort_order)
            VALUES (4105, 10, 21, 'anthropic', 'anthropic', 'official', 'anthropic', 'Other Tenant Provider', 'Other tenant provider', 'https://other-provider.example/v1', 1, 1, 1)"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_app_gateway_traces_runtime_data(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO ops_gateway_instance
            (id, tenant_id, organization_id, status, deployment_mode, region, node_name, health_status, last_heartbeat_at)
            VALUES (4301, 100001, 0, 1, 3, 'us-east-1', 'gateway-docker-1', 1, '2026-04-29 13:30:00')"#,
        r#"INSERT INTO ai_request_trace
            (id, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at, channel_name_snapshot, requested_model, provider_model, started_at, http_status, provider_error_code, error_type, latency_ms, total_tokens, client_ip_masked, request_path, endpoint, http_method)
            VALUES (4302, 100001, 0, 30, 'gateway-owner-request', 'trace-owner-1', 1, '2026-04-29 13:35:00', 'OpenAI Primary', 'gpt-4o-mini', 'gpt-4o-mini', '2026-04-29 13:35:00', 200, NULL, NULL, 210, 777, '203.0.113.***', '/v1/chat/completions', '/v1/chat/completions', 'POST')"#,
        r#"INSERT INTO ai_request_trace
            (id, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at, channel_name_snapshot, requested_model, provider_model, started_at, http_status, provider_error_code, error_type, latency_ms, total_tokens, client_ip_masked, request_path, endpoint, http_method)
            VALUES (4303, 100001, 0, 31, 'gateway-other-request', 'trace-other-user', 1, '2026-04-29 13:36:00', 'Other User Channel', 'gpt-4o-mini', 'gpt-4o-mini', '2026-04-29 13:36:00', 500, 'other_error', 'provider_error', 888, 8888, '198.51.100.***', '/v1/chat/completions', '/v1/chat/completions', 'POST')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_checkout_runtime_data(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, subject, currency_code, request_no, idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
            VALUES
            ('checkout-owner-order', '100001', '0', '30', 'ORDER-OWNER-1', 'paid', 'points_recharge', 'CNY', 'ORDER-OWNER-1', 'TRADE-OWNER-1', '2026-04-29 09:00:00', '2026-04-29 09:05:00', NULL, '2026-04-29 09:30:00', '2026-04-29 09:05:00'),
            ('checkout-other-order', '100001', '0', '31', 'ORDER-OTHER-1', 'paid', 'points_recharge', 'CNY', 'ORDER-OTHER-1', 'TRADE-OTHER-1', '2026-04-29 10:00:00', '2026-04-29 10:05:00', NULL, '2026-04-29 10:30:00', '2026-04-29 10:05:00')"#,
        r#"INSERT INTO commerce_payment_intent
            (id, tenant_id, organization_id, owner_user_id, order_id, provider, amount, currency_code, status, request_no, idempotency_key, created_at, updated_at)
            VALUES
            ('checkout-owner-payment-intent', '100001', '0', '30', 'checkout-owner-order', 'wechat', '10.00', 'CNY', 'succeeded', 'ORDER-OWNER-1', 'TRADE-OWNER-1', '2026-04-29 09:00:00', '2026-04-29 09:05:00'),
            ('checkout-other-payment-intent', '100001', '0', '31', 'checkout-other-order', 'wechat', '99.00', 'CNY', 'succeeded', 'ORDER-OTHER-1', 'TRADE-OTHER-1', '2026-04-29 10:00:00', '2026-04-29 10:05:00')"#,
        r#"INSERT INTO commerce_payment_attempt
            (id, tenant_id, organization_id, owner_user_id, payment_intent_id, order_id, provider, out_trade_no, amount, currency_code, status, callback_payload, created_at, paid_at, updated_at)
            VALUES
            ('checkout-owner-payment-attempt', '100001', '0', '30', 'checkout-owner-payment-intent', 'checkout-owner-order', 'wechat', 'TRADE-OWNER-1', '10.00', 'CNY', 'succeeded', '{"points":125}', '2026-04-29 09:00:00', '2026-04-29 09:05:00', '2026-04-29 09:05:00'),
            ('checkout-other-payment-attempt', '100001', '0', '31', 'checkout-other-payment-intent', 'checkout-other-order', 'wechat', 'TRADE-OTHER-1', '99.00', 'CNY', 'succeeded', '{"points":999}', '2026-04-29 10:00:00', '2026-04-29 10:05:00', '2026-04-29 10:05:00')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_bootstrap_recharge_packages(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO commerce_product_spu
            (id, tenant_id, organization_id, spu_no, title, product_type, sales_status, visible_surfaces, created_at, updated_at)
            VALUES
            ('bootstrap-admin-recharge-spu-10-cny', '100001', '0', 'bootstrap-admin-recharge-cny', 'Bootstrap admin recharge catalog (CNY)', 'points_recharge', 'active', '["app","console","admin"]', '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO commerce_product_sku
            (id, tenant_id, organization_id, spu_id, sku_no, name, title, price_amount, currency_code, delivery_mode, inventory_tracking, sales_status, created_at, updated_at)
            VALUES
            ('bootstrap-admin-recharge-sku-10-501', '100001', '0', 'bootstrap-admin-recharge-spu-10-cny', 'bootstrap-admin-recharge-501', '5 RMB points package', '5 RMB points package', '5.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-sku-10-502', '100001', '0', 'bootstrap-admin-recharge-spu-10-cny', 'bootstrap-admin-recharge-502', '10 RMB points package', '10 RMB points package', '10.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-sku-10-503', '100001', '0', 'bootstrap-admin-recharge-spu-10-cny', 'bootstrap-admin-recharge-503', '20 RMB points package', '20 RMB points package', '20.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-sku-10-504', '100001', '0', 'bootstrap-admin-recharge-spu-10-cny', 'bootstrap-admin-recharge-504', '30 RMB points package', '30 RMB points package', '30.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-sku-10-505', '100001', '0', 'bootstrap-admin-recharge-spu-10-cny', 'bootstrap-admin-recharge-505', '50 RMB points package', '50 RMB points package', '50.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-sku-10-506', '100001', '0', 'bootstrap-admin-recharge-spu-10-cny', 'bootstrap-admin-recharge-506', '100 RMB points package', '100 RMB points package', '100.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-sku-10-507', '100001', '0', 'bootstrap-admin-recharge-spu-10-cny', 'bootstrap-admin-recharge-507', '200 RMB points package', '200 RMB points package', '200.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-sku-10-508', '100001', '0', 'bootstrap-admin-recharge-spu-10-cny', 'bootstrap-admin-recharge-508', '500 RMB points package', '500 RMB points package', '500.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-sku-10-509', '100001', '0', 'bootstrap-admin-recharge-spu-10-cny', 'bootstrap-admin-recharge-509', '1000 RMB points package', '1000 RMB points package', '1000.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO commerce_recharge_package
            (id, tenant_id, organization_id, package_no, sku_id, name, price_amount, currency_code, bonus_points, status, valid_from, valid_to, sort_weight, created_at, updated_at)
            VALUES
            ('bootstrap-admin-recharge-package-10-501', '100001', '0', 'bootstrap-admin-recharge-501', 'bootstrap-admin-recharge-sku-10-501', '5 RMB points package', '5.00', 'CNY', 0, 'active', NULL, NULL, 101, '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-package-10-502', '100001', '0', 'bootstrap-admin-recharge-502', 'bootstrap-admin-recharge-sku-10-502', '10 RMB points package', '10.00', 'CNY', 0, 'active', NULL, NULL, 102, '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-package-10-503', '100001', '0', 'bootstrap-admin-recharge-503', 'bootstrap-admin-recharge-sku-10-503', '20 RMB points package', '20.00', 'CNY', 0, 'active', NULL, NULL, 103, '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-package-10-504', '100001', '0', 'bootstrap-admin-recharge-504', 'bootstrap-admin-recharge-sku-10-504', '30 RMB points package', '30.00', 'CNY', 0, 'active', NULL, NULL, 104, '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-package-10-505', '100001', '0', 'bootstrap-admin-recharge-505', 'bootstrap-admin-recharge-sku-10-505', '50 RMB points package', '50.00', 'CNY', 0, 'active', NULL, NULL, 105, '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-package-10-506', '100001', '0', 'bootstrap-admin-recharge-506', 'bootstrap-admin-recharge-sku-10-506', '100 RMB points package', '100.00', 'CNY', 0, 'active', NULL, NULL, 106, '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-package-10-507', '100001', '0', 'bootstrap-admin-recharge-507', 'bootstrap-admin-recharge-sku-10-507', '200 RMB points package', '200.00', 'CNY', 0, 'active', NULL, NULL, 107, '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-package-10-508', '100001', '0', 'bootstrap-admin-recharge-508', 'bootstrap-admin-recharge-sku-10-508', '500 RMB points package', '500.00', 'CNY', 0, 'active', NULL, NULL, 108, '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('bootstrap-admin-recharge-package-10-509', '100001', '0', 'bootstrap-admin-recharge-509', 'bootstrap-admin-recharge-sku-10-509', '1000 RMB points package', '1000.00', 'CNY', 0, 'active', NULL, NULL, 109, '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_recharge_runtime_data(pool: &SqlitePool) {
    seed_bootstrap_recharge_packages(pool).await;
    for statement in [
        r#"INSERT INTO commerce_product_spu
            (id, tenant_id, organization_id, spu_no, title, product_type, sales_status, visible_surfaces, created_at, updated_at)
            VALUES
            ('6301', '100001', '0', 'points-recharge-owner', 'Points recharge product', 'points_recharge', 'active', '["app"]', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('6302', '100001', NULL, 'points-recharge-global', 'Global points recharge product', 'points_recharge', 'active', '["app"]', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('6303', '100001', '21', 'points-recharge-other-org', 'Other Org Recharge Pack', 'points_recharge', 'active', '["app"]', '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO commerce_product_sku
            (id, tenant_id, organization_id, spu_id, sku_no, name, title, price_amount, currency_code, delivery_mode, inventory_tracking, sales_status, created_at, updated_at)
            VALUES
            ('6401', '100001', '0', '6301', 'starter-recharge-pack', 'Starter Recharge Pack', 'Starter Recharge Pack', '10.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('6402', '100001', NULL, '6302', 'global-recharge-pack', 'Global Recharge Pack', 'Global Recharge Pack', '20.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('6403', '100001', '21', '6303', 'other-org-recharge-pack', 'Other Org Recharge Pack', 'Other Org Recharge Pack', '30.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO commerce_recharge_package
            (id, tenant_id, organization_id, package_no, sku_id, name, price_amount, currency_code, bonus_points, status, valid_from, valid_to, sort_weight, created_at, updated_at)
            VALUES
            ('6101', '100001', '0', 'starter-recharge-pack', '6401', 'Starter Recharge Pack', '10.00', 'CNY', 25, 'active', '2026-01-01 00:00:00', '2099-01-01 00:00:00', 1, '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('6102', '100001', NULL, 'global-recharge-pack', '6402', 'Global Recharge Pack', '20.00', 'CNY', 50, 'active', '2026-01-01 00:00:00', '2099-01-01 00:00:00', 2, '2026-04-29 08:00:00', '2026-04-29 08:00:00'),
            ('6103', '100001', '21', 'other-org-recharge-pack', '6403', 'Other Org Recharge Pack', '30.00', 'CNY', 75, 'active', '2026-01-01 00:00:00', '2099-01-01 00:00:00', 3, '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
        r#"INSERT INTO commerce_payment_method
            (id, tenant_id, organization_id, method_key, display_name, provider, status, sort_weight, created_at, updated_at)
            VALUES ('6201', '100001', '0', 'wechat_pay', 'Wechat Pay', 'wechat', 'active', 1, '2026-04-29 08:00:00', '2026-04-29 08:00:00')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_exchange_rule_runtime_data(pool: &SqlitePool) {
    for statement in [r#"INSERT INTO commerce_exchange_rule
            (id, tenant_id, organization_id, rule_no, source_asset_type, target_asset_type, rate, status, remark, request_no, idempotency_key, created_at, updated_at)
            VALUES
            ('exchange-1', '100001', '0', 'POINTS_TO_CASH', 'points', 'cash', '120.000000', 'active', 'Owner Exchange Rule', 'exchange-1', 'exchange-1', '2026-04-29 10:00:00', '2026-04-29 10:00:00'),
            ('exchange-other-org', '100001', '21', 'POINTS_TO_CASH', 'points', 'cash', '999.000000', 'active', 'Other Org Exchange Rule', 'exchange-other-org', 'exchange-other-org', '2026-04-29 10:00:00', '2026-04-29 10:00:00')"#]
    {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_settings_runtime_data(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO iam_user_preference
            (id, uuid, tenant_id, organization_id, user_id, owner_type, owner_id, data_scope, status, created_at, updated_at, version, metadata, language, timezone, notification_preferences)
            VALUES (6201, 'owner-settings-pref', 100001, 0, 30, 1, 30, 1, 1, '2026-04-01 08:00:00', '2026-04-29 08:00:00', 0, '{}', 'zh-CN', 'Asia/Shanghai', '{"billReminder":true,"quotaWarning":false,"apiMonitor":true}')"#,
        r#"INSERT INTO iam_user_preference
            (id, uuid, tenant_id, organization_id, user_id, owner_type, owner_id, data_scope, status, created_at, updated_at, version, metadata, language, timezone, notification_preferences)
            VALUES (6202, 'other-settings-pref', 100001, 0, 31, 1, 31, 1, 1, '2026-04-01 08:00:00', '2026-04-29 08:00:00', 0, '{}', 'ja-JP', 'Asia/Tokyo', '{"billReminder":false,"quotaWarning":false,"apiMonitor":false}')"#,
        r#"INSERT INTO integration_webhook_endpoint
            (id, uuid, tenant_id, organization_id, user_id, owner_type, owner_id, data_scope, status, created_at, updated_at, version, metadata, endpoint_code, name, target_url, event_types, signing_alg, retry_policy, failure_count)
            VALUES (6203, 'owner-settings-webhook', 100001, 0, 30, 1, 30, 1, 1, '2026-04-01 08:00:00', '2026-04-29 08:00:00', 0, '{}', 'console-settings-user-30', 'Owner Settings Webhook', 'https://owner.example.com/hook', '["billing.reminder","api.monitor"]', 'hmac-sha256', '{"maxAttempts":3}', 0)"#,
        r#"INSERT INTO integration_webhook_endpoint
            (id, uuid, tenant_id, organization_id, user_id, owner_type, owner_id, data_scope, status, created_at, updated_at, version, metadata, endpoint_code, name, target_url, event_types, signing_alg, retry_policy, failure_count)
            VALUES (6204, 'other-settings-webhook', 100001, 0, 31, 1, 31, 1, 1, '2026-04-01 08:00:00', '2026-04-29 08:00:00', 0, '{}', 'console-settings-user-31', 'Other Settings Webhook', 'https://other.example.com/hook', '[]', 'hmac-sha256', '{"maxAttempts":3}', 0)"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_usage_logs_runtime_data(pool: &SqlitePool) {
    for statement in [
        r#"INSERT INTO ai_usage
            (id, tenant_id, organization_id, user_id, api_key_id, request_id, model, status, request_count, total_tokens, prompt_tokens, cached_tokens, completion_tokens, customer_charge_amount, cost_amount, modality, rate_multiplier, base_input_unit_price, base_output_unit_price, cache_read_unit_price, occurred_at)
            VALUES (6401, 100001, 0, 30, 100, 'usage-owner-success', 'gpt-4o-mini', 1, 1, 160, 100, 10, 50, '0.012345', '0.010000', 1, '1.250000', '0.150000', '0.600000', '0.050000', '2026-04-29 10:15:00')"#,
        r#"INSERT INTO ai_request_trace
            (id, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at, api_key_name_snapshot, channel_group_snapshot, channel_name_snapshot, requested_model, provider_model, started_at, http_status, provider_error_code, error_type, latency_ms, ttft_ms, streaming, prompt_tokens, cached_tokens, completion_tokens, reasoning_effort, total_tokens, client_ip_masked, request_path, endpoint, http_method)
            VALUES (6402, 100001, 0, 30, 'usage-owner-success', 'trace-usage-owner-success', 1, '2026-04-29 10:15:00', 'Owner Usage Key', 'standard-group', 'OpenAI Primary', 'gpt-4o-mini', 'gpt-4o-mini', '2026-04-29 10:15:00', 200, NULL, NULL, 345, 120, 1, 90, 5, 45, 'medium', 160, '203.0.113.***', '/v1/chat/completions', '/v1/chat/completions', 'POST')"#,
        r#"INSERT INTO ai_usage
            (id, tenant_id, organization_id, user_id, api_key_id, request_id, model, status, request_count, total_tokens, prompt_tokens, cached_tokens, completion_tokens, customer_charge_amount, cost_amount, modality, rate_multiplier, base_input_unit_price, base_output_unit_price, cache_read_unit_price, occurred_at)
            VALUES (6403, 100001, 0, 30, 100, 'usage-owner-error', 'gpt-4o-mini', 1, 1, 25, 20, 0, 5, '0.004000', '0.003000', 1, '1.000000', '0.150000', '0.600000', '0.050000', '2026-04-29 11:15:00')"#,
        r#"INSERT INTO ai_request_trace
            (id, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at, api_key_name_snapshot, channel_group_snapshot, channel_name_snapshot, requested_model, provider_model, started_at, http_status, provider_error_code, error_type, error_message_masked, latency_ms, ttft_ms, streaming, prompt_tokens, cached_tokens, completion_tokens, reasoning_effort, total_tokens, client_ip_masked, request_path, endpoint, http_method)
            VALUES (6404, 100001, 0, 30, 'usage-owner-error', 'trace-usage-owner-error', 1, '2026-04-29 11:15:00', 'Owner Usage Key', 'standard-group', 'OpenAI Primary', 'gpt-4o-mini', 'gpt-4o-mini', '2026-04-29 11:15:00', 502, 'upstream_502', 'provider_error', 'provider timed out before completion', NULL, 0, 0, 20, 0, 5, 'provider_error', 25, '203.0.113.***', '/v1/chat/completions', '/v1/chat/completions', 'POST')"#,
        r#"INSERT INTO ai_usage
            (id, tenant_id, organization_id, user_id, api_key_id, request_id, model, status, request_count, total_tokens, prompt_tokens, cached_tokens, completion_tokens, customer_charge_amount, cost_amount, modality, rate_multiplier, base_input_unit_price, base_output_unit_price, cache_read_unit_price, occurred_at)
            VALUES (6405, 100001, 0, 31, 101, 'other-user-usage-request', 'gpt-4o-mini', 1, 1, 999, 900, 0, 99, '9.999999', '8.000000', 1, '2.000000', '0.150000', '0.600000', '0.050000', '2026-04-29 10:30:00')"#,
        r#"INSERT INTO ai_request_trace
            (id, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at, api_key_name_snapshot, channel_group_snapshot, channel_name_snapshot, requested_model, provider_model, started_at, http_status, provider_error_code, error_type, latency_ms, ttft_ms, streaming, prompt_tokens, cached_tokens, completion_tokens, reasoning_effort, total_tokens, client_ip_masked, request_path, endpoint, http_method)
            VALUES (6406, 100001, 0, 31, 'other-user-usage-request', 'trace-other-user-usage', 1, '2026-04-29 10:30:00', 'Other Usage Key', 'standard-group', 'Other User Channel', 'gpt-4o-mini', 'gpt-4o-mini', '2026-04-29 10:30:00', 200, NULL, NULL, 111, 22, 1, 900, 0, 99, 'high', 999, '203.0.113.42', '/v1/chat/completions', '/v1/chat/completions', 'POST')"#,
        r#"INSERT INTO ai_routing_decision_log
            (id, tenant_id, organization_id, user_id, request_id, status, created_at, requested_model, resolved_model, selected_channel_id)
            VALUES (6407, 100001, 0, 30, 'usage-owner-success', 1, '2026-04-29 10:15:00', 'gpt-4o-mini', 'gpt-4o-mini', 4003)"#,
        r#"INSERT INTO ai_usage
            (id, tenant_id, organization_id, user_id, api_key_id, request_id, model, status, request_count, total_tokens, prompt_tokens, cached_tokens, completion_tokens, customer_charge_amount, cost_amount, modality, rate_multiplier, base_input_unit_price, base_output_unit_price, cache_read_unit_price, occurred_at)
            VALUES (6408, 100001, 0, 30, 100, 'usage-owner-cost-only', 'gpt-4o-cost-only', 1, 1, 16, 10, 0, 6, NULL, '777.123456', 1, '1.000000', '0.150000', '0.600000', '0.050000', '2026-04-29 12:15:00')"#,
        r#"INSERT INTO ai_request_trace
            (id, tenant_id, organization_id, user_id, request_id, trace_id, status, created_at, api_key_name_snapshot, channel_group_snapshot, channel_name_snapshot, requested_model, provider_model, started_at, http_status, provider_error_code, error_type, latency_ms, ttft_ms, streaming, prompt_tokens, cached_tokens, completion_tokens, reasoning_effort, total_tokens, client_ip_masked, request_path, endpoint, http_method)
            VALUES (6409, 100001, 0, 30, 'usage-owner-cost-only', 'trace-usage-owner-cost-only', 1, '2026-04-29 12:15:00', 'Owner Usage Key', 'standard-group', 'OpenAI Primary', 'gpt-4o-cost-only', 'gpt-4o-cost-only', '2026-04-29 12:15:00', 200, NULL, NULL, 87, 30, 0, 10, 0, 6, 'low', 16, '203.0.113.***', '/v1/chat/completions', '/v1/chat/completions', 'POST')"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}
