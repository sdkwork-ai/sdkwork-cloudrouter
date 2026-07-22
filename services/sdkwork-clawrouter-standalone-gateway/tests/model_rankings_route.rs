use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Once;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use sdkwork_claw_config::DatabaseConfig;
use sdkwork_claw_test_support::{
    api_key_security_config, app_session_config, payment_webhook_config, trusted_subject_config,
};
use sdkwork_clawrouter_database_host::connect_claw_router_database;
use sdkwork_database_config::{
    DatabaseConfig as LifecycleDatabaseConfig, DatabaseEngine, DeploymentMode,
};
use sdkwork_database_lifecycle::LifecycleOrchestrator;
use sdkwork_database_sqlx::{DatabasePool, PoolContext};
use sdkwork_iam_database_host::{resolve_iam_app_root, IamDatabaseModule};
use sdkwork_models_database_host::connect_models_database;
use sdkwork_web_core::stamp_token_version;
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::types::chrono::Utc;
use std::str::FromStr;
use std::sync::Arc;
use tower::ServiceExt;

static DB_SEQUENCE: AtomicU64 = AtomicU64::new(0);
static STANDARD_APP_API_INTEGRATION_ENV: Once = Once::new();
static IAM_RESOLVER_ENV_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());
const TEST_TENANT_ID: i64 = 100_001;
const TEST_ORGANIZATION_ID: i64 = 0;
const TEST_USER_ID: i64 = 30;
const TEST_USERNAME: &str = "ranking-integration-user";

#[derive(Clone)]
struct AuthenticatedApp {
    router: axum::Router,
    auth_token: String,
    access_token: String,
}

struct IamSessionTokens {
    auth_token: String,
    access_token: String,
}

impl AuthenticatedApp {
    fn get_request(&self, uri: &str) -> Request<Body> {
        Request::builder()
            .method("GET")
            .uri(uri)
            .header("authorization", format!("Bearer {}", self.auth_token))
            .header("Access-Token", &self.access_token)
            .body(Body::empty())
            .unwrap()
    }
}

#[tokio::test]
async fn database_config_app_model_rankings_route_reads_installed_catalog_snapshot() {
    let database_url = unique_sqlite_url();
    let app = configured_router(&database_url).await;

    let response = app
        .router
        .clone()
        .oneshot(app.get_request("/app/v3/api/ai/model_rankings?page_size=5"))
        .await
        .unwrap();

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, status, "{}", String::from_utf8_lossy(&body));
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("offset", payload["data"]["pageInfo"]["mode"]);
    assert_eq!(
        "Published model ranking snapshot",
        payload["data"]["source"]["sourceLabel"]
    );
    let expected_observed_at = latest_bundled_commercial_ranking_snapshot_date();
    assert_eq!(
        expected_observed_at,
        payload["data"]["source"]["observedAt"]
    );
    assert_eq!("commercial-default", payload["data"]["source"]["rankScope"]);
    let items = payload["data"]["items"].as_array().unwrap();
    assert_eq!(
        latest_bundled_commercial_ranking_snapshot_item_count(5),
        items.len()
    );
    let history_catalog_keys: HashSet<&str> = payload["data"]["history"]
        .as_array()
        .unwrap()
        .iter()
        .flat_map(|point| point["entries"].as_array().into_iter().flatten())
        .filter_map(|entry| entry["catalogKey"].as_str())
        .collect();
    assert!(
        !history_catalog_keys.is_empty(),
        "ranking history must expose stable catalog identities"
    );
    for item in items {
        assert!(item["rank"].as_u64().is_some_and(|rank| rank > 0));
        assert!(item["name"].as_str().is_some_and(|name| !name.is_empty()));
        assert!(item["vendor"]
            .as_str()
            .is_some_and(|vendor| !vendor.is_empty()));
        assert!(item["vendorCode"]
            .as_str()
            .is_some_and(|vendor_code| !vendor_code.is_empty()));
        assert!(item["modality"]
            .as_str()
            .is_some_and(|modality| !modality.is_empty()));
        let id = item["id"].as_str().unwrap();
        assert!(
            !id.starts_with(&format!("{expected_observed_at}:")),
            "ranking item id must be stable catalog identity, not snapshot-date scoped"
        );
        assert!(
            history_catalog_keys.contains(id),
            "ranking item id must match ranking history catalogKey"
        );
    }
}

#[tokio::test]
async fn database_config_app_startup_worker_auto_refreshes_rankings_and_records_scheduled_audit() {
    let database_url = unique_sqlite_url();
    let pool = connect_sqlite_for_test(&database_url).await;
    migrate_test_database(pool.clone(), &database_url).await;
    sdkwork_clawrouter_router_service::infrastructure::sql::installer::DatabaseInstaller::for_sqlite(
        pool.clone(),
    )
    .ensure_installed()
    .await
    .unwrap();
    sqlx::query("DELETE FROM ai_model_rank_snapshot")
        .execute(&pool)
        .await
        .unwrap();
    let row = sqlx::query(
        r#"
        SELECT catalog_key, model
        FROM ai_model
        WHERE status = 1
          AND (
              (tenant_id = ? AND organization_id = ?)
              OR (tenant_id = 0 AND organization_id = 0)
          )
          AND catalog_key <> ''
        ORDER BY
            CASE
                WHEN tenant_id = ? AND organization_id = ? THEN 2
                WHEN tenant_id = 0 AND organization_id = 0 THEN 1
                ELSE 0
            END DESC,
            rank_score DESC,
            id ASC
        LIMIT 1
        "#,
    )
    .bind(TEST_TENANT_ID)
    .bind(TEST_ORGANIZATION_ID)
    .bind(TEST_TENANT_ID)
    .bind(TEST_ORGANIZATION_ID)
    .fetch_one(&pool)
    .await
    .unwrap();
    let catalog_key: String = sqlx::Row::get(&row, "catalog_key");
    let model: String = sqlx::Row::get(&row, "model");
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, uuid, tenant_id, organization_id, user_id, request_id, idempotency_key, status, metadata,
             catalog_key, model, modality, usage_type, billing_meter_code, request_count,
             prompt_tokens, completion_tokens, total_tokens, billable_quantity, customer_charge_amount,
             currency, pricing_snapshot, occurred_at, settlement_status)
        VALUES
            (9001, 'usage-app-startup-ranking', ?, ?, ?, 'app-startup-ranking-request', 'app-startup-ranking-idempotency', 1, '{}',
             ?, ?, 1, 1, 'llm_input_token', 11,
             800, 400, 1200, '1200', '2.500000',
             'USD', '{"source":"app-startup-test"}', strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day'), 0)
        "#,
    )
    .bind(TEST_TENANT_ID)
    .bind(TEST_ORGANIZATION_ID)
    .bind(TEST_USER_ID)
    .bind(&catalog_key)
    .bind(&model)
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;

    let app = configured_router(&database_url).await;

    let snapshot_count = wait_for_startup_ranking_snapshot(&database_url, &catalog_key).await;
    assert_eq!(1, snapshot_count);

    let payload = request_json(
        &app,
        "/app/v3/api/ai/model_rankings?rank_scope=commercial-default&page_size=5",
    )
    .await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("offset", payload["data"]["pageInfo"]["mode"]);
    assert!(payload["data"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item["id"]
            .as_str()
            .is_some_and(|id| id.ends_with(&catalog_key))));

    let pool = connect_sqlite_for_test(&database_url).await;
    let audit = sqlx::query(
        r#"
        SELECT trigger_type, execution_status, payload
        FROM ops_job_execution
        WHERE job_name = 'model_ranking_refresh'
        ORDER BY id DESC
        LIMIT 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, sqlx::Row::get::<i64, _>(&audit, "trigger_type"));
    assert_eq!(2, sqlx::Row::get::<i64, _>(&audit, "execution_status"));
    let audit_payload: serde_json::Value =
        serde_json::from_str(&sqlx::Row::get::<String, _>(&audit, "payload")).unwrap();
    assert_eq!("commercial-default", audit_payload["rankScope"]);
    assert_eq!(1, audit_payload["attemptCount"]);
    assert_eq!(0, audit_payload["retryCount"]);
    assert_eq!(0, audit_payload["consecutiveFailureCount"]);
    assert_eq!(false, audit_payload["alertRecommended"]);
    pool.close().await;
}

#[tokio::test]
async fn database_config_app_models_route_reads_global_commercial_catalog() {
    let database_url = unique_sqlite_url();
    let app = configured_router(&database_url).await;

    let response = app
        .router
        .clone()
        .oneshot(
            app.get_request("/app/v3/api/ai/models?billing_meter=llm_input_token&page_size=200"),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, status, "{}", String::from_utf8_lossy(&body));
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("offset", payload["data"]["pageInfo"]["mode"]);
    let items = payload["data"]["items"].as_array().unwrap();
    let catalog = sdkwork_models::load_bundled_catalog().unwrap();
    assert!(
        items.len() >= catalog_routable_models_with_meter(&catalog, "llm_input_token").len(),
        "installed app model catalog must include the bundled sdkwork-models routing scope"
    );
    let regional_catalog_keys = items
        .iter()
        .filter_map(|item| item["catalogKey"].as_str())
        .filter(|catalog_key| is_regional_catalog_key(catalog_key))
        .collect::<Vec<_>>();
    assert_eq!(
        Vec::<&str>::new(),
        regional_catalog_keys,
        "app model catalog must expose vendor/model identities; region belongs to pricing and ranking data"
    );

    let expected_models = [
        ("openai/gpt-5.5-pro", "gpt-5.5-pro", "openai"),
        ("openai/gpt-5.5", "gpt-5.5", "openai"),
        ("anthropic/claude-opus-4-7", "claude-opus-4-7", "anthropic"),
        (
            "anthropic/claude-sonnet-4-6",
            "claude-sonnet-4-6",
            "anthropic",
        ),
        (
            "google/gemini-3.1-pro-preview",
            "gemini-3.1-pro-preview",
            "google",
        ),
        (
            "google/gemini-3-flash-preview",
            "gemini-3-flash-preview",
            "google",
        ),
        ("xai/grok-4.3", "grok-4.3", "xai"),
        (
            "alibaba/qwen3.6-max-preview",
            "qwen3.6-max-preview",
            "alibaba",
        ),
        ("deepseek/deepseek-v4-pro", "deepseek-v4-pro", "deepseek"),
        ("moonshot/kimi-k2.6", "kimi-k2.6", "moonshot"),
        ("zhipu/glm-5.1", "glm-5.1", "zhipu"),
        (
            "bytedance/doubao-seed-2-0-pro-260215",
            "doubao-seed-2-0-pro-260215",
            "bytedance",
        ),
        ("minimax/MiniMax-M2.7", "MiniMax-M2.7", "minimax"),
    ];

    for (catalog_key, model, vendor_code) in expected_models {
        let item = items
            .iter()
            .find(|item| item["catalogKey"] == catalog_key)
            .unwrap_or_else(|| {
                let available_keys = items
                    .iter()
                    .filter_map(|item| item["catalogKey"].as_str())
                    .collect::<Vec<_>>()
                    .join(", ");
                panic!(
                    "expected installed model {catalog_key} in app catalog response; available catalog keys: {available_keys}"
                )
            });
        assert_eq!(model, item["model"]);
        assert_eq!(vendor_code, item["vendorCode"]);
        if item["model"] == "gpt-5.5-pro" || item["model"] == "gpt-5.5" {
            assert_eq!("reference", item["priceAvailability"]["status"]);
            assert_model_catalog_has_reference_price(item, "global", "llm_input_token");
        }
    }
}

#[tokio::test]
async fn database_config_app_models_route_reads_multimodal_reference_prices() {
    let database_url = unique_sqlite_url();
    let app = configured_router(&database_url).await;

    assert_catalog_meter_contains(
        &app,
        "image_result",
        &["stable-image-ultra", "imagen-4.0-generate-001"],
    )
    .await;
    assert_catalog_meter_contains(&app, "image_megapixel", &["flux-2-pro"]).await;
    assert_catalog_meter_contains(
        &app,
        "video_output_second",
        &["veo-3.1-generate-preview", "doubao-seedance-2-0-260128"],
    )
    .await;
    assert_catalog_meter_contains(&app, "stt_audio_minute", &["gpt-4o-transcribe"]).await;
    assert_catalog_meter_contains(&app, "music_output_second", &["suno-v5"]).await;
    assert_catalog_meter_contains(&app, "audio_output_minute", &["eleven_text_to_sound_v2"]).await;
}

async fn assert_catalog_meter_contains(
    app: &AuthenticatedApp,
    billing_meter: &str,
    expected_models: &[&str],
) {
    let response = app
        .router
        .clone()
        .oneshot(app.get_request(&format!(
            "/app/v3/api/ai/models?billing_meter={billing_meter}&page_size=200"
        )))
        .await
        .unwrap();

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, status, "{}", String::from_utf8_lossy(&body));
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("offset", payload["data"]["pageInfo"]["mode"]);
    let items = payload["data"]["items"].as_array().unwrap();

    for expected_model in expected_models {
        let item = items
            .iter()
            .find(|item| item["model"] == *expected_model)
            .unwrap_or_else(|| {
                panic!("expected installed model {expected_model} for meter {billing_meter}")
            });
        assert_model_catalog_has_reference_price(item, "global", billing_meter);
        assert_eq!("reference", item["priceAvailability"]["status"]);
    }
}

fn assert_model_catalog_has_reference_price(
    item: &serde_json::Value,
    region_code: &str,
    billing_meter: &str,
) {
    let item_object = item.as_object().unwrap();
    assert!(
        !item_object.contains_key("regionCode"),
        "model catalog item identity must not be region-scoped"
    );
    assert!(
        !item_object.contains_key("officialReferenceUnitPrice"),
        "reference prices must be exposed through officialReferencePrices[]"
    );
    assert!(
        !item_object.contains_key("officialReferenceCurrency"),
        "reference currencies must be exposed through officialReferencePrices[]"
    );
    let prices = item["officialReferencePrices"]
        .as_array()
        .unwrap_or_else(|| {
            panic!(
                "expected officialReferencePrices[] for {}",
                item["catalogKey"]
            )
        });
    let price = prices
        .iter()
        .find(|price| price["regionCode"] == region_code && price["billingMeter"] == billing_meter)
        .unwrap_or_else(|| {
            panic!(
                "missing official reference price for {}/{billing_meter} on {}",
                region_code, item["catalogKey"]
            )
        });
    assert!(price["unitPrice"]
        .as_str()
        .is_some_and(|value| !value.is_empty()));
    assert!(price["currency"]
        .as_str()
        .is_some_and(|value| !value.is_empty()));
}

async fn request_json(app: &AuthenticatedApp, path: &str) -> serde_json::Value {
    let response = app
        .router
        .clone()
        .oneshot(app.get_request(path))
        .await
        .unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, status, "{}", String::from_utf8_lossy(&body));
    serde_json::from_slice(&body).unwrap()
}

async fn configured_router(database_url: &str) -> AuthenticatedApp {
    enable_standard_app_api_web_framework_for_integration_tests();
    let pool = connect_sqlite_for_test(database_url).await;
    migrate_test_database(pool.clone(), database_url).await;
    pool.close().await;
    let database_config = DatabaseConfig::from_url_with_max_connections(database_url, 1).unwrap();
    let router =
        sdkwork_clawrouter_standalone_gateway::router_with_database_config_api_key_trusted_subject_and_app_session_config(
        database_config.clone(),
        api_key_security_config().unwrap(),
        trusted_subject_config().unwrap(),
        app_session_config().unwrap(),
        payment_webhook_config().unwrap(),
    )
    .await
    .unwrap();
    let pool = connect_sqlite_for_test(database_url).await;
    seed_test_iam_user(&pool).await;
    let tokens = issue_test_iam_session(&pool).await;
    pool.close().await;
    let iam_resolver_guard = IAM_RESOLVER_ENV_LOCK.lock().await;
    std::env::set_var("SDKWORK_IAM_DATABASE_URL", database_url);
    std::env::set_var("SDKWORK_IAM_DATABASE_ENGINE", "sqlite");
    std::env::set_var("SDKWORK_IAM_DATABASE_MAX_CONNECTIONS", "1");
    let router = sdkwork_clawrouter_standalone_gateway::maybe_wrap_router_with_web_framework_and_database_config(
            router,
            &database_config,
        )
        .await;
    drop(iam_resolver_guard);
    AuthenticatedApp {
        router,
        auth_token: tokens.auth_token,
        access_token: tokens.access_token,
    }
}

async fn seed_test_iam_user(pool: &sqlx::SqlitePool) {
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT OR IGNORE INTO iam_tenant (id, code, name, status, created_at, updated_at) \
         VALUES (?, ?, 'Ranking integration tenant', 'active', ?, ?)",
    )
    .bind(TEST_TENANT_ID.to_string())
    .bind(TEST_TENANT_ID.to_string())
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .expect("seed ranking integration IAM tenant");
    sqlx::query(
        "INSERT INTO iam_user \
         (id, tenant_id, username, display_name, email, status, email_verified, is_deleted, created_at, updated_at) \
         VALUES (?, ?, ?, 'Ranking Integration User', 'ranking-integration@example.test', 'active', 1, 0, ?, ?)",
    )
    .bind(TEST_USER_ID.to_string())
    .bind(TEST_TENANT_ID.to_string())
    .bind(TEST_USERNAME)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .expect("seed ranking integration IAM user");
}

async fn issue_test_iam_session(pool: &sqlx::SqlitePool) -> IamSessionTokens {
    let tenant_id = TEST_TENANT_ID.to_string();
    sdkwork_iam_bootstrap::ensure_sqlite_tenant_signing_key(pool, &tenant_id)
        .await
        .expect("ensure ranking integration IAM signing key");
    let signing_key =
        sdkwork_iam_bootstrap::load_sqlite_active_tenant_signing_key(pool, &tenant_id)
            .await
            .expect("load ranking integration IAM signing key")
            .expect("ranking integration IAM signing key must exist");
    let issued_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock should be after unix epoch")
        .as_secs() as i64;
    let expires_at = issued_at + 3600;
    let expires_at_text = (Utc::now() + Duration::from_secs(3600)).to_rfc3339();
    let session_id = "clawrouter-model-rankings-test-session";
    let claims = json!({
        "app_id": "sdkwork-clawrouter",
        "aud": "sdkwork-clawrouter",
        "auth_level": "password",
        "data_scope": [format!("tenant:{tenant_id}"), format!("user:{TEST_USER_ID}")],
        "deployment_mode": "local",
        "environment": "dev",
        "exp": expires_at,
        "iat": issued_at,
        "iss": "sdkwork-iam-local",
        "login_scope": "TENANT",
        "organization_id": TEST_ORGANIZATION_ID.to_string(),
        "permission_scope": ["iam:self"],
        "session_id": session_id,
        "sid": session_id,
        "sub": TEST_USER_ID.to_string(),
        "tenant_id": tenant_id,
        "token_version": stamp_token_version(),
        "user_id": TEST_USER_ID.to_string(),
    });
    let auth_token = sign_test_iam_token(&signing_key, "auth", &claims);
    let access_token = sign_test_iam_token(&signing_key, "access", &claims);
    sqlx::query(
        "INSERT INTO iam_session \
         (id, tenant_id, organization_id, login_scope, user_id, app_id, environment, \
          deployment_mode, auth_level, auth_token_hash, auth_token_kid, access_token_hash, \
          access_token_kid, sharding_key, sharding_strategy, data_scope_json, \
          permission_scope_json, expires_at, created_at, updated_at) \
         VALUES (?, ?, NULL, 'TENANT', ?, 'sdkwork-clawrouter', 'dev', 'local', 'password', \
                 ?, ?, ?, ?, ?, 'tenant', ?, '[\"iam:self\"]', ?, ?, ?)",
    )
    .bind(session_id)
    .bind(TEST_TENANT_ID.to_string())
    .bind(TEST_USER_ID.to_string())
    .bind(hash_test_iam_token(&auth_token))
    .bind(&signing_key.kid)
    .bind(hash_test_iam_token(&access_token))
    .bind(&signing_key.kid)
    .bind(TEST_TENANT_ID.to_string())
    .bind(
        json!([
            format!("tenant:{TEST_TENANT_ID}"),
            format!("user:{TEST_USER_ID}")
        ])
        .to_string(),
    )
    .bind(&expires_at_text)
    .bind(Utc::now().to_rfc3339())
    .bind(Utc::now().to_rfc3339())
    .execute(pool)
    .await
    .expect("insert ranking integration IAM session");
    IamSessionTokens {
        auth_token,
        access_token,
    }
}

fn sign_test_iam_token(
    signing_key: &sdkwork_iam_bootstrap::TenantSigningKeyMaterial,
    token_type: &str,
    base_claims: &serde_json::Value,
) -> String {
    let header = json!({
        "alg": "HS256",
        "kid": signing_key.kid,
        "typ": "JWT",
    });
    let mut claims = base_claims.clone();
    claims["token_type"] = json!(token_type);
    let encoded_header = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&header).unwrap());
    let encoded_claims = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&claims).unwrap());
    let signing_input = format!("{encoded_header}.{encoded_claims}");
    let mut mac = Hmac::<Sha256>::new_from_slice(&signing_key.secret)
        .expect("HS256 signing key must be valid");
    mac.update(signing_input.as_bytes());
    let signature = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
    format!("{signing_input}.{signature}")
}

fn hash_test_iam_token(token: &str) -> String {
    let digest = Sha256::digest(token.as_bytes());
    format!("{digest:x}")
}

async fn migrate_test_database(pool: sqlx::SqlitePool, database_url: &str) {
    let database_pool = database_pool_for_test(pool, database_url);
    let iam_module = Arc::new(
        IamDatabaseModule::from_app_root(&resolve_iam_app_root())
            .expect("load sdkwork-iam database lifecycle module"),
    );
    let iam_lifecycle = LifecycleOrchestrator::new(database_pool.clone(), iam_module)
        .with_applied_by("model-rankings-route-test:iam");
    iam_lifecycle
        .init()
        .await
        .expect("initialize sdkwork-iam database lifecycle");
    iam_lifecycle
        .migrate()
        .await
        .expect("migrate sdkwork-iam database before application bootstrap");
    connect_models_database(database_pool.clone())
        .expect("load sdkwork-models database lifecycle host")
        .migrate("model-rankings-route-test:models")
        .await
        .expect("migrate sdkwork-models database before application bootstrap");
    connect_claw_router_database(database_pool)
        .expect("load Claw Router database lifecycle host")
        .migrate("model-rankings-route-test")
        .await
        .expect("migrate Claw Router database before application bootstrap");
}

fn database_pool_for_test(pool: sqlx::SqlitePool, database_url: &str) -> DatabasePool {
    DatabasePool::Sqlite(
        pool,
        PoolContext {
            config: LifecycleDatabaseConfig {
                engine: DatabaseEngine::Sqlite,
                url: database_url.to_owned(),
                max_connections: 1,
                mode: DeploymentMode::Standalone,
                ..LifecycleDatabaseConfig::default()
            },
        },
    )
}

fn enable_standard_app_api_web_framework_for_integration_tests() {
    STANDARD_APP_API_INTEGRATION_ENV.call_once(|| {
        std::env::set_var("SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY", "false");
        std::env::set_var("SDKWORK_CLAW_WEB_FRAMEWORK_ENABLED", "true");
        std::env::set_var("SDKWORK_CLAW_MODEL_RANKING_REFRESH_WORKER_ENABLED", "true");
        std::env::set_var(
            "SDKWORK_CLAW_MODEL_RANKING_TENANT_ID",
            TEST_TENANT_ID.to_string(),
        );
        std::env::set_var(
            "SDKWORK_CLAW_MODEL_RANKING_ORGANIZATION_ID",
            TEST_ORGANIZATION_ID.to_string(),
        );
        std::env::set_var("SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP", "true");
    });
}

async fn wait_for_startup_ranking_snapshot(database_url: &str, catalog_key: &str) -> i64 {
    for _ in 0..50 {
        let pool = connect_sqlite_for_test(database_url).await;
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(1)
            FROM ai_model_rank_snapshot
            WHERE tenant_id = ?
              AND organization_id = ?
              AND rank_scope = 'commercial-default'
              AND catalog_key = ?
              AND request_count = 11
              AND status = 1
            "#,
        )
        .bind(TEST_TENANT_ID)
        .bind(TEST_ORGANIZATION_ID)
        .bind(catalog_key)
        .fetch_one(&pool)
        .await
        .unwrap();
        pool.close().await;
        if count > 0 {
            return count;
        }
        tokio::time::sleep(Duration::from_millis(20)).await;
    }
    0
}

fn unique_sqlite_url() -> String {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let sequence = DB_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let process_id = std::process::id();
    let mut path = sqlite_test_database_dir();
    std::fs::create_dir_all(&path).unwrap();
    path.push(format!(
        "app-model-rankings-{process_id}-{nonce}-{sequence}.db"
    ));
    format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"))
}

fn sqlite_test_database_dir() -> std::path::PathBuf {
    std::env::var_os("CARGO_TARGET_DIR")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("test-dbs")
}

async fn connect_sqlite_for_test(database_url: &str) -> sqlx::SqlitePool {
    let options = SqliteConnectOptions::from_str(database_url)
        .unwrap()
        .create_if_missing(true);
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .unwrap()
}

fn catalog_routable_models_with_meter(
    catalog: &sdkwork_models::ModelCatalog,
    meter_code: &str,
) -> Vec<String> {
    catalog
        .vendors
        .iter()
        .flat_map(|vendor| {
            vendor.models.iter().filter_map(|model| {
                if model.routing_state != "enabled" || model.shelf_state == "archived" {
                    return None;
                }
                let has_meter = vendor.pricing.iter().any(|pricing| {
                    pricing.model_id == model.model_id
                        && pricing
                            .prices
                            .iter()
                            .any(|price| price.meter_code == meter_code)
                });
                has_meter.then(|| model.model_id.clone())
            })
        })
        .collect()
}

fn latest_bundled_commercial_ranking_snapshot_date() -> String {
    sdkwork_models::load_bundled_catalog()
        .unwrap()
        .vendors
        .iter()
        .flat_map(|vendor| &vendor.rankings)
        .filter(|snapshot| snapshot.rank_scope == "commercial-default")
        .filter(|snapshot| !snapshot.items.is_empty())
        .map(|snapshot| snapshot.snapshot_date.as_str())
        .max()
        .expect("bundled catalog must include commercial-default rankings")
        .to_owned()
}

fn latest_bundled_commercial_ranking_snapshot_item_count(limit: usize) -> usize {
    let catalog = sdkwork_models::load_bundled_catalog().unwrap();
    let latest_snapshot_date = catalog
        .vendors
        .iter()
        .flat_map(|vendor| &vendor.rankings)
        .filter(|snapshot| snapshot.rank_scope == "commercial-default")
        .filter(|snapshot| !snapshot.items.is_empty())
        .map(|snapshot| snapshot.snapshot_date.as_str())
        .max()
        .expect("bundled catalog must include commercial-default rankings");
    catalog
        .vendors
        .iter()
        .flat_map(|vendor| &vendor.rankings)
        .filter(|snapshot| snapshot.rank_scope == "commercial-default")
        .filter(|snapshot| snapshot.snapshot_date == latest_snapshot_date)
        .map(|snapshot| snapshot.items.len())
        .sum::<usize>()
        .min(limit)
}

fn is_regional_catalog_key(catalog_key: &str) -> bool {
    let parts = catalog_key
        .split('/')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    matches!(
        parts.as_slice(),
        [_vendor, region, _model @ ..]
            if sdkwork_clawrouter_router_service::domain::is_model_region_segment(region)
    )
}
