use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_claw_config::{ApiKeySecurityConfig, DatabaseConfig};
use sdkwork_claw_test_support::{
    api_key_security_config, app_session_config, app_session_dual_token_headers,
    payment_webhook_config, trusted_request_subject, trusted_subject_config,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::installer::CURRENT_SCHEMA_VERSION;
use serde_json::Value;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tower::ServiceExt;

static DB_COUNTER: AtomicU64 = AtomicU64::new(0);

#[tokio::test]
async fn admin_api_reports_database_installation_status_after_startup_install() {
    let database_url = unique_sqlite_url();
    let database_config =
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap();
    let api_key_config =
        ApiKeySecurityConfig::from_pepper_secret("0123456789abcdef0123456789abcdef").unwrap();

    let router = sdkwork_clawrouter_admin_gateway::router_with_database_and_api_key_config(
        database_config,
        Some(api_key_config),
        Some(trusted_subject_config().unwrap()),
        Some(app_session_config().unwrap()),
    )
    .await
    .unwrap();

    let response = tokio::time::timeout(
        Duration::from_secs(2),
        router.oneshot(app_session_request(
            "GET",
            "/backend/v3/api/system/installation/status",
            Body::empty(),
        )),
    )
    .await
    .expect("installation status route should not run the full install audit on every request")
    .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("2000", payload["code"]);
    assert_eq!("installed", payload["data"]["status"]);
    assert_eq!(CURRENT_SCHEMA_VERSION, payload["data"]["schemaVersion"]);
    assert_eq!("2026.05.08.1", payload["data"]["catalogVersion"]);
    assert_eq!("bundled", payload["data"]["catalogSource"]);
    assert_eq!(false, payload["data"]["externalCatalog"]);
    assert_eq!("not_run", payload["data"]["lastCatalogRefreshStatus"]);
    assert_eq!("production", payload["data"]["environment"]);
    assert_eq!("commercial", payload["data"]["seedProfile"]);
    assert_eq!(false, payload["data"]["changed"]);
}

#[tokio::test]
async fn admin_api_serves_cache_management_overview_from_runtime() {
    let database_url = unique_sqlite_url();
    let database_config =
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap();
    let api_key_config =
        ApiKeySecurityConfig::from_pepper_secret("0123456789abcdef0123456789abcdef").unwrap();

    let router = sdkwork_clawrouter_admin_gateway::router_with_database_and_api_key_config(
        database_config,
        Some(api_key_config),
        Some(trusted_subject_config().unwrap()),
        Some(app_session_config().unwrap()),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(app_session_request(
            "GET",
            "/backend/v3/api/system/cache/overview",
            Body::empty(),
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("2000", payload["code"]);
    assert_eq!(
        "desktop_packaged",
        payload["data"]["summary"]["runtimeTarget"]
    );
    assert_eq!(1, payload["data"]["summary"]["totalInstances"]);
    assert_eq!(6, payload["data"]["summary"]["totalNamespaces"]);
    assert_eq!(
        "local_cache",
        payload["data"]["instances"][0]["providerKind"]
    );
    assert_eq!(
        "auth.qr.challenge",
        payload["data"]["namespacePolicies"][0]["namespace"]
    );
    assert_eq!(
        "routing.snapshot",
        payload["data"]["namespacePolicies"][1]["namespace"]
    );
}

#[tokio::test]
async fn admin_api_serves_admin_analytics_overview_from_database_runtime() {
    let database_url = unique_sqlite_url();
    let database_config =
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap();
    let api_key_config =
        ApiKeySecurityConfig::from_pepper_secret("0123456789abcdef0123456789abcdef").unwrap();

    let router = sdkwork_clawrouter_admin_gateway::router_with_database_and_api_key_config(
        database_config,
        Some(api_key_config),
        Some(trusted_subject_config().unwrap()),
        Some(app_session_config().unwrap()),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(app_session_request(
            "GET",
            "/backend/v3/api/system/analytics/admin/overview?time_range=daily&limit=10",
            Body::empty(),
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("2000", payload["code"]);
    assert_eq!("daily", payload["data"]["timeRange"]);
    assert_eq!(10, payload["data"]["limit"]);
    assert!(payload["data"]["summary"]["totalRequests"].is_number());
    assert!(payload["data"]["userRankings"]["points"].is_array());
    assert!(payload["data"]["modelRankings"]["points"].is_array());
    assert!(payload["data"]["modalityDistribution"].is_array());
    assert!(payload["data"]["insights"].is_array());
}

#[tokio::test]
async fn admin_api_manual_model_ranking_refresh_runs_worker_and_records_audit() {
    let database_url = unique_sqlite_url();
    let database_config =
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap();
    let api_key_config =
        ApiKeySecurityConfig::from_pepper_secret("0123456789abcdef0123456789abcdef").unwrap();

    let router = sdkwork_clawrouter_admin_gateway::router_with_database_and_api_key_config(
        database_config,
        Some(api_key_config),
        Some(trusted_subject_config().unwrap()),
        Some(app_session_config().unwrap()),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(app_session_request(
            "POST",
            "/backend/v3/api/ai/model_rankings/refresh",
            Body::from(
                r#"{"rankScope":"commercial-default","snapshotPeriod":"daily","limit":10,"lookbackDays":7,"refreshIntervalSeconds":3600,"cacheMaxAgeSeconds":60}"#,
            ),
        ))
        .await
        .unwrap();

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(StatusCode::OK, status, "payload={payload}");
    assert_eq!("2000", payload["code"]);
    assert_eq!(true, payload["data"]["triggered"]);
    assert_eq!("commercial-default", payload["data"]["rankScope"]);
    assert_eq!(10, payload["data"]["tenantId"]);
    assert_eq!(20, payload["data"]["organizationId"]);
    assert!(payload["data"]["status"] == "empty" || payload["data"]["status"] == "succeeded");

    let pool = sqlx::SqlitePool::connect(&database_url).await.unwrap();
    let audit_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ops_job_execution WHERE job_name = 'model_ranking_refresh'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    pool.close().await;
    assert_eq!(1, audit_count);
}

#[tokio::test]
async fn fresh_sqlite_install_refreshes_model_rankings_from_usage_and_serves_admin_and_app_reads() {
    let database_url = unique_sqlite_url();
    let database_config =
        DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap();
    let api_key_config =
        ApiKeySecurityConfig::from_pepper_secret("0123456789abcdef0123456789abcdef").unwrap();

    let admin_router =
        sdkwork_clawrouter_admin_gateway::router_with_database_and_api_key_config(
            database_config,
            Some(api_key_config),
            Some(trusted_subject_config().unwrap()),
            Some(app_session_config().unwrap()),
        )
        .await
        .unwrap();

    let pool = sqlx::SqlitePool::connect(&database_url).await.unwrap();
    sqlx::query("DELETE FROM ai_model_rank_snapshot")
        .execute(&pool)
        .await
        .unwrap();
    let model = load_first_installed_model(&pool).await;
    insert_usage_fact_for_model(&pool, &model).await;
    pool.close().await;

    let response = admin_router
        .clone()
        .oneshot(app_session_request(
            "POST",
            "/backend/v3/api/ai/model_rankings/refresh",
            Body::from(
                r#"{"rankScope":"commercial-default","snapshotPeriod":"daily","limit":10,"lookbackDays":7,"refreshIntervalSeconds":3600,"cacheMaxAgeSeconds":60}"#,
            ),
        ))
        .await
        .unwrap();

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let refresh_payload: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(StatusCode::OK, status, "refresh_payload={refresh_payload}");
    assert_eq!("2000", refresh_payload["code"]);
    assert_eq!("succeeded", refresh_payload["data"]["status"]);
    assert_eq!(true, refresh_payload["data"]["triggered"]);
    assert_eq!("commercial-default", refresh_payload["data"]["rankScope"]);
    assert_eq!(10, refresh_payload["data"]["tenantId"]);
    assert_eq!(20, refresh_payload["data"]["organizationId"]);
    assert!(refresh_payload["data"]["generatedCount"]
        .as_i64()
        .is_some_and(|count| count > 0));
    assert!(refresh_payload["data"]["sourceCount"]
        .as_i64()
        .is_some_and(|count| count > 0));

    let pool = sqlx::SqlitePool::connect(&database_url).await.unwrap();
    let snapshot_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_model_rank_snapshot
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND rank_scope = 'commercial-default'
          AND catalog_key = ?
          AND status = 1
        "#,
    )
    .bind(&model.catalog_key)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, snapshot_count);

    let audit = sqlx::query(
        r#"
        SELECT job_type, trigger_type, payload
        FROM ops_job_execution
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND job_name = 'model_ranking_refresh'
        ORDER BY id DESC
        LIMIT 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(20, sqlx::Row::get::<i64, _>(&audit, "job_type"));
    assert_eq!(
        2,
        sqlx::Row::get::<i64, _>(&audit, "trigger_type"),
        "admin API manual ranking refresh must be audited as a manual trigger, not a scheduled task"
    );
    let audit_payload: Value =
        serde_json::from_str(&sqlx::Row::get::<String, _>(&audit, "payload")).unwrap();
    assert_eq!("commercial-default", audit_payload["rankScope"]);
    assert_eq!("daily", audit_payload["snapshotPeriod"]);
    assert!(audit_payload["windowStart"]
        .as_str()
        .is_some_and(|value| value.ends_with("T00:00:00Z")));
    assert!(audit_payload["windowEnd"]
        .as_str()
        .is_some_and(|value| value.ends_with("T00:00:00Z")));
    assert_eq!(
        vec![
            "ai_usage_fact".to_owned(),
            "ai_model".to_owned(),
            "ai_model_rank_snapshot".to_owned()
        ],
        audit_payload["sourceTables"]
            .as_array()
            .unwrap()
            .iter()
            .map(|item| item.as_str().unwrap().to_owned())
            .collect::<Vec<_>>()
    );
    pool.close().await;

    let backend_payload = request_json(
        admin_router,
        "GET",
        "/backend/v3/api/ai/model_rankings?limit=5",
        Body::empty(),
    )
    .await;
    assert_model_ranking_response_contains_catalog(&backend_payload, &model.catalog_key, "backend");

    let app_router =
        sdkwork_clawrouter_standalone_gateway::router_with_database_config_api_key_trusted_subject_and_app_session_config(
            DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap(),
            api_key_security_config().unwrap(),
            trusted_subject_config().unwrap(),
            app_session_config().unwrap(),
            payment_webhook_config().unwrap(),
        )
        .await
        .unwrap();
    let app_payload = request_json(
        app_router,
        "GET",
        "/app/v3/api/ai/model_rankings?limit=5",
        Body::empty(),
    )
    .await;
    assert_model_ranking_response_contains_catalog(&app_payload, &model.catalog_key, "app");
}

fn unique_sqlite_url() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let counter = DB_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut path = std::env::temp_dir();
    path.push(format!(
        "sdkwork-clawrouter-admin-gateway-installation-status-{millis}-{counter}.sqlite"
    ));
    format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"))
}

#[derive(Debug, Clone)]
struct InstalledModel {
    catalog_key: String,
    model: String,
}

async fn load_first_installed_model(pool: &sqlx::SqlitePool) -> InstalledModel {
    let row = sqlx::query(
        r#"
        SELECT catalog_key, model
        FROM ai_model
        WHERE status = 1
          AND tenant_id = 0
          AND organization_id = 0
          AND catalog_key <> ''
        ORDER BY rank_score DESC, id ASC
        LIMIT 1
        "#,
    )
    .fetch_one(pool)
    .await
    .unwrap();
    InstalledModel {
        catalog_key: sqlx::Row::get(&row, "catalog_key"),
        model: sqlx::Row::get(&row, "model"),
    }
}

async fn insert_usage_fact_for_model(pool: &sqlx::SqlitePool, model: &InstalledModel) {
    sqlx::query(
        r#"
        INSERT INTO ai_usage_fact
            (id, uuid, tenant_id, organization_id, user_id, request_id, status, metadata,
             catalog_key, model, modality, usage_type, billing_meter_code, request_count,
             prompt_tokens, completion_tokens, total_tokens, billable_quantity, cost_amount,
             currency, pricing_snapshot, occurred_at)
        VALUES
            (9001, 'usage-model-ranking-e2e', 100001, 0, 30, 'model-ranking-e2e-request', 1, '{}',
             ?, ?, 1, 1, 'llm_input_token', 7,
             700, 300, 1000, '1000', '1.250000',
             'USD', '{"source":"migration-test"}', strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day'))
        "#,
    )
    .bind(&model.catalog_key)
    .bind(&model.model)
    .execute(pool)
    .await
    .unwrap();
}

async fn request_json(router: axum::Router, method: &str, path: &str, body: Body) -> Value {
    let response = router
        .oneshot(app_session_request(method, path, body))
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

fn assert_model_ranking_response_contains_catalog(
    payload: &Value,
    catalog_key: &str,
    surface: &str,
) {
    assert_eq!("2000", payload["code"]);
    assert_eq!(
        "Published model ranking snapshot",
        payload["data"]["source"]["sourceLabel"]
    );
    assert_eq!("commercial-default", payload["data"]["source"]["rankScope"]);
    assert!(payload["data"]["source"]["sourceTables"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item == "ai_usage_fact"));
    let item = payload["data"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["id"].as_str().is_some_and(|id| id.ends_with(catalog_key)))
        .unwrap_or_else(|| {
            panic!(
                "expected {surface} model ranking response to include {catalog_key}; payload={payload}"
            )
        });
    assert_eq!(1, item["rank"]);
    assert_eq!(7, item["requests"]);
    assert_eq!(1000, item["tokens"]);
    assert_eq!("USD", item["currency"]);
    assert!(item["cost"]
        .as_f64()
        .is_some_and(|cost| (cost - 1.25).abs() < f64::EPSILON));
}

fn app_session_request(method: &str, path: &str, body: Body) -> Request<Body> {
    let issued_at = current_unix_seconds();
    let expires_at = issued_at + 3600;
    let (authorization, access_token) = app_session_dual_token_headers(
        trusted_request_subject(100_001, 0, 1),
        issued_at,
        expires_at,
    )
    .unwrap();
    Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .header("authorization", authorization)
        .header("Access-Token", access_token)
        .body(body)
        .unwrap()
}

fn current_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}
