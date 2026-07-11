use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, Request, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_claw_config::{ProviderRelayConfig, ProviderSecretMapConfig, StartupInstallMode};
use sdkwork_claw_test_support::{
    assert_server_generated_request_id, seeded_sqlite_catalog, SeededSqliteCatalog,
};
use sdkwork_clawrouter_router_service::application::UsageSettlementWorkerConfig;
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqlitePricingCatalogLoader;
use sdkwork_clawrouter_router_service::ports::PricingCatalog;
use serde_json::json;
use sqlx::{Row, SqlitePool};
use std::sync::{Arc, Mutex};
use tokio::time::{sleep, Duration};
use tower::ServiceExt;

async fn set_openrouter_test_base_url(pool: &SqlitePool, base_url: &str) {
    sqlx::query("UPDATE ai_channel SET base_url = ? WHERE id = 3001")
        .bind(base_url)
        .execute(pool)
        .await
        .unwrap();
    sqlx::query("UPDATE ai_channel_credential SET base_url = ? WHERE channel_id = 3001")
        .bind(base_url)
        .execute(pool)
        .await
        .unwrap();
}

async fn router_with_seeded_sqlite_catalog_provider_configs(
    catalog: &SeededSqliteCatalog,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
    usage_settlement_worker_config: UsageSettlementWorkerConfig,
) -> Router {
    sdkwork_clawrouter_cloud_gateway::runtime::router_with_database_api_key_provider_configs_usage_settlement_worker_config_and_startup_install_mode(
        catalog.database_config().unwrap(),
        Some(catalog.api_key_security_config().unwrap()),
        provider_relay_config,
        provider_secret_map_config,
        usage_settlement_worker_config,
        StartupInstallMode::Skip,
    )
    .await
    .unwrap()
}

#[tokio::test]
async fn database_config_router_loads_sqlite_catalog_for_openai_models() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        None,
        None,
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

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
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/models")
                .header("authorization", catalog.gateway_authorization_header())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, response_status, "{body_text}");
    let payload: serde_json::Value = serde_json::from_str(&body_text).unwrap();

    assert_eq!("list", payload["object"]);
    let openai_mini = payload["data"]
        .as_array()
        .unwrap()
        .iter()
        .find(|item| item["id"] == "gpt-4o-mini")
        .expect("sqlite catalog must expose gpt-4o-mini");
    assert_eq!("openai", openai_mini["owned_by"]);
}

#[tokio::test]
async fn database_config_router_seeded_catalog_supports_skip_startup_install_mode() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        None,
        None,
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/models")
                .header("authorization", catalog.gateway_authorization_header())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
}

#[derive(Debug, Default)]
struct CapturedProviderRequest {
    authorization: Option<String>,
    body: serde_json::Value,
}

#[tokio::test]
async fn database_config_router_uses_provider_relay_config_for_chat_completions() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_provider_chat_completion),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        Some(
            ProviderRelayConfig::from_parts(
                format!("http://{addr}"),
                "sk-upstream-provider-secret",
            )
            .unwrap(),
        ),
        None,
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, response_status, "{body_text}");
    let payload: serde_json::Value = serde_json::from_str(&body_text).unwrap();

    assert_eq!("chatcmpl-upstream", payload["id"]);
    assert_eq!("pong", payload["choices"][0]["message"]["content"]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-upstream-provider-secret".to_owned()),
        captured[0].authorization
    );
    assert_eq!("gpt-4o-mini", captured[0].body["model"]);
    assert_eq!("ping", captured[0].body["messages"][0]["content"]);
}

#[tokio::test]
async fn database_config_router_records_non_stream_chat_usage_when_provider_succeeds() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_provider_chat_completion),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        Some(
            ProviderRelayConfig::from_parts(
                format!("http://{addr}"),
                "sk-upstream-provider-secret",
            )
            .unwrap(),
        ),
        None,
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .header("x-request-id", "req-gateway-usage-1")
                .header("x-trace-id", "trace-gateway-usage-1")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let response_body = String::from_utf8(response_body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, response_status, "{response_body}");
    let read_pool = catalog.open_pool().await.unwrap();
    let trace = sqlx::query(
        r#"
        SELECT request_id, trace_id, tenant_id, organization_id, user_id, api_key_id,
               channel_group_snapshot, requested_model, provider_model, http_status,
               streaming, prompt_tokens, completion_tokens, total_tokens
        FROM ai_request_trace
        WHERE trace_id = ?
        "#,
    )
    .bind("trace-gateway-usage-1")
    .fetch_optional(&read_pool)
    .await
    .unwrap();
    assert!(
        trace.is_some(),
        "database-configured provider relay must write ai_request_trace"
    );
    let trace = trace.unwrap();
    let request_id = trace.get::<String, _>("request_id");
    assert_server_generated_request_id(&request_id, "req-gateway-usage-1");
    assert_eq!("trace-gateway-usage-1", trace.get::<String, _>("trace_id"));
    assert_eq!(10_i64, trace.get::<i64, _>("tenant_id"));
    assert_eq!(20_i64, trace.get::<i64, _>("organization_id"));
    assert_eq!(30_i64, trace.get::<i64, _>("user_id"));
    assert_eq!(100_i64, trace.get::<i64, _>("api_key_id"));
    assert_eq!(
        "standard-group",
        trace.get::<String, _>("channel_group_snapshot")
    );
    assert_eq!("gpt-4o-mini", trace.get::<String, _>("requested_model"));
    assert_eq!("gpt-4o-mini", trace.get::<String, _>("provider_model"));
    assert_eq!(200_i64, trace.get::<i64, _>("http_status"));
    assert_eq!(0_i64, trace.get::<i64, _>("streaming"));
    assert_eq!(1_i64, trace.get::<i64, _>("prompt_tokens"));
    assert_eq!(1_i64, trace.get::<i64, _>("completion_tokens"));
    assert_eq!(2_i64, trace.get::<i64, _>("total_tokens"));

    let usage = sqlx::query(
        r#"
        SELECT request_id, api_key_id, model, channel_id, usage_type, billing_meter_code,
               billable_quantity, prompt_tokens, completion_tokens, total_tokens,
               customer_charge_amount, cost_amount, currency, pricing_plan_code, settlement_status
        FROM ai_usage
        WHERE request_id = ?
        "#,
    )
    .bind(&request_id)
    .fetch_optional(&read_pool)
    .await
    .unwrap();
    assert!(
        usage.is_some(),
        "database-configured provider relay must write ai_usage"
    );
    let usage = usage.unwrap();
    assert_eq!(request_id, usage.get::<String, _>("request_id"));
    assert_eq!(100_i64, usage.get::<i64, _>("api_key_id"));
    assert_eq!("gpt-4o-mini", usage.get::<String, _>("model"));
    assert_eq!(3001_i64, usage.get::<i64, _>("channel_id"));
    assert_eq!(1_i64, usage.get::<i64, _>("usage_type"));
    assert_eq!(
        "llm_input_token",
        usage.get::<String, _>("billing_meter_code")
    );
    assert_eq!("2", usage.get::<String, _>("billable_quantity"));
    assert_eq!(1_i64, usage.get::<i64, _>("prompt_tokens"));
    assert_eq!(1_i64, usage.get::<i64, _>("completion_tokens"));
    assert_eq!(2_i64, usage.get::<i64, _>("total_tokens"));
    assert_eq!(
        "0.000000990000",
        usage.get::<String, _>("customer_charge_amount")
    );
    assert_eq!("0.000000990000", usage.get::<String, _>("cost_amount"));
    assert_eq!("USD", usage.get::<String, _>("currency"));
    assert_eq!("standard", usage.get::<String, _>("pricing_plan_code"));
    assert_eq!(0_i64, usage.get::<i64, _>("settlement_status"));
    read_pool.close().await;
}

#[tokio::test]
async fn database_config_router_applies_database_retry_policy_without_duplicate_usage() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_twice_flaky_provider_chat_completion),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    let upstream_base_url = format!("http://{addr}");
    set_openrouter_test_base_url(&pool, &upstream_base_url).await;
    sqlx::query(
        r#"
        UPDATE ai_channel
        SET retry_policy = '{"max_attempts":3,"retryable_status_codes":[503],"backoff_ms":0}'
        WHERE id = 3001
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;

    let secret_ref = "vault://providers/openrouter/account/main";
    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                json!({secret_ref: "sk-provider-token-from-secret-map"}).to_string(),
            )
            .unwrap(),
        ),
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .header("x-request-id", "req-gateway-db-retry-1")
                .header("x-trace-id", "trace-gateway-db-retry-1")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("chatcmpl-upstream-retry", payload["id"]);
    assert_eq!(
        "pong after retry",
        payload["choices"][0]["message"]["content"]
    );

    let captured = captured.lock().unwrap();
    assert_eq!(
        3,
        captured.len(),
        "database retry_policy must control real provider retry attempts"
    );
    assert!(captured.iter().all(|request| {
        request.authorization.as_deref() == Some("Bearer sk-provider-token-from-secret-map")
    }));
    assert!(captured
        .iter()
        .all(|request| request.body["model"] == "gpt-4o-mini"));
    drop(captured);

    let read_pool = catalog.open_pool().await.unwrap();
    let trace = sqlx::query(
        r#"
        SELECT request_id, trace_id, channel_id, requested_model, provider_model, http_status,
               streaming, prompt_tokens, completion_tokens, total_tokens
        FROM ai_request_trace
        WHERE trace_id = ?
        "#,
    )
    .bind("trace-gateway-db-retry-1")
    .fetch_one(&read_pool)
    .await
    .unwrap();
    let request_id = trace.get::<String, _>("request_id");
    assert_server_generated_request_id(&request_id, "req-gateway-db-retry-1");
    assert_eq!(
        "trace-gateway-db-retry-1",
        trace.get::<String, _>("trace_id")
    );
    assert_eq!(3001_i64, trace.get::<i64, _>("channel_id"));
    assert_eq!("gpt-4o-mini", trace.get::<String, _>("requested_model"));
    assert_eq!("gpt-4o-mini", trace.get::<String, _>("provider_model"));
    assert_eq!(200_i64, trace.get::<i64, _>("http_status"));
    assert_eq!(0_i64, trace.get::<i64, _>("streaming"));
    assert_eq!(2_i64, trace.get::<i64, _>("prompt_tokens"));
    assert_eq!(3_i64, trace.get::<i64, _>("completion_tokens"));
    assert_eq!(5_i64, trace.get::<i64, _>("total_tokens"));

    let usage = sqlx::query(
        r#"
        SELECT request_id, channel_id, billing_meter_code, billable_quantity, prompt_tokens,
               completion_tokens, total_tokens, customer_charge_amount, cost_amount,
               settlement_status
        FROM ai_usage
        WHERE request_id = ?
        "#,
    )
    .bind(&request_id)
    .fetch_one(&read_pool)
    .await
    .unwrap();
    assert_eq!(request_id, usage.get::<String, _>("request_id"));
    assert_eq!(3001_i64, usage.get::<i64, _>("channel_id"));
    assert_eq!(
        "llm_input_token",
        usage.get::<String, _>("billing_meter_code")
    );
    assert_eq!("5", usage.get::<String, _>("billable_quantity"));
    assert_eq!(2_i64, usage.get::<i64, _>("prompt_tokens"));
    assert_eq!(3_i64, usage.get::<i64, _>("completion_tokens"));
    assert_eq!(5_i64, usage.get::<i64, _>("total_tokens"));
    assert_eq!(
        "0.000002772000",
        usage.get::<String, _>("customer_charge_amount")
    );
    assert_eq!("0.000002772000", usage.get::<String, _>("cost_amount"));
    assert_eq!(0_i64, usage.get::<i64, _>("settlement_status"));

    let trace_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM ai_request_trace WHERE request_id = ?")
            .bind(&request_id)
            .fetch_one(&read_pool)
            .await
            .unwrap();
    let usage_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ai_usage WHERE request_id = ?")
        .bind(&request_id)
        .fetch_one(&read_pool)
        .await
        .unwrap();
    assert_eq!(
        1, trace_count,
        "provider retries must not duplicate request trace"
    );
    assert_eq!(
        1, usage_count,
        "provider retries must not duplicate usage fact"
    );
    read_pool.close().await;
}

#[tokio::test]
async fn database_config_router_background_settlement_worker_settles_recorded_chat_usage() {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    catalog
        .seed_usage_settlement_points_account(&pool, 701, 1000)
        .await
        .unwrap();
    pool.close().await;

    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_provider_chat_completion_billable_usage),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        Some(
            ProviderRelayConfig::from_parts(
                format!("http://{addr}"),
                "sk-upstream-provider-secret",
            )
            .unwrap(),
        ),
        None,
        UsageSettlementWorkerConfig {
            enabled: true,
            tenant_id: 0,
            organization_id: 0,
            batch_size: 50,
            interval_millis: 1_000,
        },
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .header("x-request-id", "req-gateway-usage-settlement-1")
                .header("x-trace-id", "trace-gateway-usage-settlement-1")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let response_body = String::from_utf8(response_body.to_vec()).unwrap();
    assert_eq!(StatusCode::OK, response_status, "{response_body}");
    let read_pool = catalog.open_pool().await.unwrap();
    let request_id: String =
        sqlx::query_scalar("SELECT request_id FROM ai_usage WHERE trace_id = ? LIMIT 1")
            .bind("trace-gateway-usage-settlement-1")
            .fetch_one(&read_pool)
            .await
            .unwrap();
    assert_server_generated_request_id(&request_id, "req-gateway-usage-settlement-1");
    wait_for_usage_settlement_success(&read_pool, &request_id).await;

    assert_eq!(
        990,
        scalar_i64(
            &read_pool,
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
    assert_eq!(
        1,
        scalar_i64(&read_pool, "SELECT COUNT(1) FROM commerce_usage_settlement").await
    );
    assert_eq!(
        1,
        scalar_i64(
            &read_pool,
            "SELECT COUNT(1) FROM commerce_account_ledger_entry WHERE business_type = 'usage'"
        )
        .await
    );
    assert_eq!(
        2,
        sqlx::query_scalar::<_, i64>("SELECT settlement_status FROM ai_usage WHERE request_id = ?")
            .bind(&request_id)
            .fetch_one(&read_pool)
            .await
            .unwrap()
    );
    read_pool.close().await;
}

#[tokio::test]
async fn database_config_router_background_settlement_worker_wakes_on_new_usage_without_waiting_full_interval(
) {
    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    catalog
        .seed_usage_settlement_points_account(&pool, 701, 1000)
        .await
        .unwrap();
    pool.close().await;

    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_provider_chat_completion_billable_usage),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        Some(
            ProviderRelayConfig::from_parts(
                format!("http://{addr}"),
                "sk-upstream-provider-secret",
            )
            .unwrap(),
        ),
        None,
        UsageSettlementWorkerConfig {
            enabled: true,
            tenant_id: 0,
            organization_id: 0,
            batch_size: 50,
            interval_millis: 30_000,
        },
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .header("x-request-id", "req-gateway-usage-wakeup-1")
                .header("x-trace-id", "trace-gateway-usage-wakeup-1")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let read_pool = catalog.open_pool().await.unwrap();
    let request_id: String =
        sqlx::query_scalar("SELECT request_id FROM ai_usage WHERE trace_id = ? LIMIT 1")
            .bind("trace-gateway-usage-wakeup-1")
            .fetch_one(&read_pool)
            .await
            .unwrap();
    assert_server_generated_request_id(&request_id, "req-gateway-usage-wakeup-1");

    tokio::time::timeout(
        Duration::from_millis(750),
        wait_for_usage_settlement_success(&read_pool, &request_id),
    )
    .await
    .expect("usage settlement worker should wake on newly recorded usage");

    assert_eq!(
        990,
        scalar_i64(
            &read_pool,
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
    read_pool.close().await;
}

#[tokio::test]
async fn database_config_router_uses_provider_relay_config_for_streaming_chat_completions() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_provider_chat_completion_stream),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        Some(
            ProviderRelayConfig::from_parts(
                format!("http://{addr}"),
                "sk-upstream-provider-secret",
            )
            .unwrap(),
        ),
        None,
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .header("x-request-id", "req-gateway-stream-usage-1")
                .header("x-trace-id", "trace-gateway-stream-usage-1")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        Some("text/event-stream"),
        response
            .headers()
            .get("content-type")
            .and_then(|value| value.to_str().ok())
    );
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(body.contains("chatcmpl-upstream-stream"));
    assert!(body.contains("data: [DONE]"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-upstream-provider-secret".to_owned()),
        captured[0].authorization
    );
    assert_eq!("gpt-4o-mini", captured[0].body["model"]);
    assert_eq!(true, captured[0].body["stream"]);

    let read_pool = catalog.open_pool().await.unwrap();
    let trace = sqlx::query(
        r#"
        SELECT request_id, trace_id, streaming, prompt_tokens, completion_tokens, total_tokens
        FROM ai_request_trace
        WHERE trace_id = ?
        "#,
    )
    .bind("trace-gateway-stream-usage-1")
    .fetch_optional(&read_pool)
    .await
    .unwrap();
    assert!(
        trace.is_some(),
        "database-configured streaming relay must persist ai_request_trace instead of returning an unbillable stream"
    );
    let trace = trace.unwrap();
    let request_id = trace.get::<String, _>("request_id");
    assert_server_generated_request_id(&request_id, "req-gateway-stream-usage-1");
    assert_eq!(
        "trace-gateway-stream-usage-1",
        trace.get::<String, _>("trace_id")
    );
    assert_eq!(1_i64, trace.get::<i64, _>("streaming"));
    assert_eq!(1_i64, trace.get::<i64, _>("prompt_tokens"));
    assert_eq!(1_i64, trace.get::<i64, _>("completion_tokens"));
    assert_eq!(2_i64, trace.get::<i64, _>("total_tokens"));

    let usage = sqlx::query(
        r#"
        SELECT request_id, prompt_tokens, completion_tokens, total_tokens,
               customer_charge_amount, cost_amount, settlement_status
        FROM ai_usage
        WHERE request_id = ?
        "#,
    )
    .bind(&request_id)
    .fetch_optional(&read_pool)
    .await
    .unwrap();
    assert!(
        usage.is_some(),
        "database-configured streaming relay must persist ai_usage instead of returning an unbillable stream"
    );
    let usage = usage.unwrap();
    assert_eq!(1_i64, usage.get::<i64, _>("prompt_tokens"));
    assert_eq!(1_i64, usage.get::<i64, _>("completion_tokens"));
    assert_eq!(2_i64, usage.get::<i64, _>("total_tokens"));
    assert_eq!(
        "0.000000990000",
        usage.get::<String, _>("customer_charge_amount")
    );
    assert_eq!("0.000000990000", usage.get::<String, _>("cost_amount"));
    assert_eq!(0_i64, usage.get::<i64, _>("settlement_status"));
    read_pool.close().await;
}

#[tokio::test]
async fn database_config_router_uses_provider_relay_config_for_responses() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/responses", post(capture_provider_response))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        Some(
            ProviderRelayConfig::from_parts(
                format!("http://{addr}"),
                "sk-upstream-provider-secret",
            )
            .unwrap(),
        ),
        None,
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/responses")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-4o-mini","input":"ping"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("resp-upstream", payload["id"]);
    assert_eq!("pong", payload["output"][0]["content"][0]["text"]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-upstream-provider-secret".to_owned()),
        captured[0].authorization
    );
    assert_eq!("gpt-4o-mini", captured[0].body["model"]);
    assert_eq!("ping", captured[0].body["input"]);
}

#[tokio::test]
async fn database_config_router_uses_provider_relay_config_for_embeddings() {
    let catalog = seeded_sqlite_catalog().await.unwrap();

    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/embeddings", post(capture_provider_embedding))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        Some(
            ProviderRelayConfig::from_parts(
                format!("http://{addr}"),
                "sk-upstream-provider-secret",
            )
            .unwrap(),
        ),
        None,
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"openai/text-embedding-3-small","input":["ping"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("list", payload["object"]);
    assert_eq!(0.2, payload["data"][0]["embedding"][1]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-upstream-provider-secret".to_owned()),
        captured[0].authorization
    );
    assert_eq!("text-embedding-3-small", captured[0].body["model"]);
    assert_eq!("ping", captured[0].body["input"][0]);
}

#[tokio::test]
async fn database_config_router_uses_provider_secret_map_for_route_scoped_chat_relay() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_provider_chat_completion),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    let upstream_base_url = format!("http://{addr}");
    set_openrouter_test_base_url(&pool, &upstream_base_url).await;
    pool.close().await;

    let secret_ref = "vault://providers/openrouter/account/main";
    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                json!({secret_ref: "sk-provider-token-from-secret-map"}).to_string(),
            )
            .unwrap(),
        ),
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("chatcmpl-upstream", payload["id"]);
    assert_eq!("pong", payload["choices"][0]["message"]["content"]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-provider-token-from-secret-map".to_owned()),
        captured[0].authorization
    );
    assert_eq!("gpt-4o-mini", captured[0].body["model"]);
}

#[tokio::test]
async fn database_config_router_uses_provider_secret_map_for_route_scoped_streaming_chat_relay() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_provider_chat_completion_stream),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    let upstream_base_url = format!("http://{addr}");
    set_openrouter_test_base_url(&pool, &upstream_base_url).await;
    pool.close().await;

    let secret_ref = "vault://providers/openrouter/account/main";
    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                json!({secret_ref: "sk-provider-token-from-secret-map"}).to_string(),
            )
            .unwrap(),
        ),
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(body.contains("chatcmpl-upstream-stream"));
    assert!(body.contains("data: [DONE]"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-provider-token-from-secret-map".to_owned()),
        captured[0].authorization
    );
    assert_eq!("gpt-4o-mini", captured[0].body["model"]);
    assert_eq!(true, captured[0].body["stream"]);
}

#[tokio::test]
async fn database_config_router_keeps_channel_route_after_streaming_chat_success_snapshot_reload() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            post(capture_provider_chat_completion_stream_requires_native_model),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    let upstream_base_url = format!("http://{addr}");
    set_openrouter_test_base_url(&pool, &upstream_base_url).await;
    pool.close().await;

    let secret_ref = "vault://providers/openrouter/account/main";
    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                json!({secret_ref: "sk-provider-token-from-secret-map"}).to_string(),
            )
            .unwrap(),
        ),
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    for request_no in 1..=2 {
        let response = router
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/chat/completions")
                    .header("authorization", catalog.gateway_authorization_header())
                    .header("content-type", "application/json")
                    .header("x-request-id", format!("req-gateway-stream-repeat-{request_no}"))
                    .header("x-trace-id", format!("trace-gateway-stream-repeat-{request_no}"))
                    .body(Body::from(
                        r#"{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(StatusCode::OK, response.status(), "request {request_no}");
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let body = String::from_utf8(body.to_vec()).unwrap();
        assert!(body.contains("chatcmpl-upstream-stream"));
        assert!(body.contains("data: [DONE]"));

        let read_pool = catalog.open_pool().await.unwrap();
        let snapshot = SqlitePricingCatalogLoader::new(read_pool.clone())
            .load_snapshot()
            .await
            .unwrap();
        assert!(
            snapshot
                .list_provider_channel_routes()
                .iter()
                .any(|route| route.channel_id == 3001),
            "catalog reload after request {request_no} must keep the account-pool route callable"
        );
        read_pool.close().await;
    }

    let captured = captured.lock().unwrap();
    assert_eq!(2, captured.len());
    assert!(captured.iter().all(|request| {
        request.authorization.as_deref() == Some("Bearer sk-provider-token-from-secret-map")
            && request.body["model"] == "gpt-4o-mini"
            && request.body["stream"] == true
    }));
}

#[tokio::test]
async fn database_config_router_uses_provider_secret_map_for_route_scoped_responses_relay() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/responses", post(capture_provider_response))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    let upstream_base_url = format!("http://{addr}");
    set_openrouter_test_base_url(&pool, &upstream_base_url).await;
    pool.close().await;

    let secret_ref = "vault://providers/openrouter/account/main";
    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                json!({secret_ref: "sk-provider-token-from-secret-map"}).to_string(),
            )
            .unwrap(),
        ),
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/responses")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-4o-mini","input":"ping"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("resp-upstream", payload["id"]);
    assert_eq!("pong", payload["output"][0]["content"][0]["text"]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-provider-token-from-secret-map".to_owned()),
        captured[0].authorization
    );
    assert_eq!("gpt-4o-mini", captured[0].body["model"]);
}

#[tokio::test]
async fn database_config_router_uses_provider_secret_map_for_route_scoped_embeddings_relay() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/embeddings", post(capture_provider_embedding))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = seeded_sqlite_catalog().await.unwrap();
    let pool = catalog.open_pool().await.unwrap();
    let upstream_base_url = format!("http://{addr}");
    set_openrouter_test_base_url(&pool, &upstream_base_url).await;
    pool.close().await;

    let secret_ref = "vault://providers/openrouter/account/main";
    let router = router_with_seeded_sqlite_catalog_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                json!({secret_ref: "sk-provider-token-from-secret-map"}).to_string(),
            )
            .unwrap(),
        ),
        UsageSettlementWorkerConfig::disabled(),
    )
    .await;

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"openai/text-embedding-3-small","input":["ping"]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("list", payload["object"]);
    assert_eq!(0.3, payload["data"][0]["embedding"][2]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-provider-token-from-secret-map".to_owned()),
        captured[0].authorization
    );
    assert_eq!("text-embedding-3-small", captured[0].body["model"]);
}

async fn wait_for_usage_settlement_success(pool: &SqlitePool, request_id: &str) {
    for _ in 0..40 {
        let status =
            sqlx::query("SELECT settlement_status FROM ai_usage WHERE request_id = ? LIMIT 1")
                .bind(request_id)
                .fetch_optional(pool)
                .await
                .unwrap()
                .map(|row| row.get::<i64, _>("settlement_status"));
        if status == Some(2) {
            return;
        }
        sleep(Duration::from_millis(100)).await;
    }
    let usage = sqlx::query(
        "SELECT settlement_status, customer_charge_amount, total_tokens FROM ai_usage WHERE request_id = ? LIMIT 1",
    )
    .bind(request_id)
    .fetch_optional(pool)
    .await
    .unwrap()
    .map(|row| {
        format!(
            "status={}, amount={}, tokens={}",
            row.get::<i64, _>("settlement_status"),
            row.get::<String, _>("customer_charge_amount"),
            row.get::<i64, _>("total_tokens")
        )
    });
    let settlement = sqlx::query(
        "SELECT settlement_status, points, failure_code, failure_message FROM commerce_usage_settlement WHERE request_id = ? LIMIT 1",
    )
    .bind(request_id)
    .fetch_optional(pool)
    .await
    .unwrap()
    .map(|row| {
        format!(
            "status={}, points={}, failure_code={:?}, failure_message={:?}",
            row.get::<i64, _>("settlement_status"),
            row.get::<i64, _>("points"),
            row.get::<Option<String>, _>("failure_code"),
            row.get::<Option<String>, _>("failure_message")
        )
    });
    panic!(
        "usage settlement worker did not settle request_id={request_id}; usage={usage:?}; settlement={settlement:?}"
    );
}

async fn scalar_i64(pool: &SqlitePool, sql: &str) -> i64 {
    sqlx::query(sql)
        .fetch_one(pool)
        .await
        .unwrap()
        .try_get::<i64, _>(0)
        .unwrap()
}

async fn capture_provider_chat_completion(
    State(captured): State<Arc<Mutex<Vec<CapturedProviderRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    captured.lock().unwrap().push(CapturedProviderRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::OK,
        Json(json!({
            "id": "chatcmpl-upstream",
            "object": "chat.completion",
            "model": "openai/gpt-4o-mini",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "pong"},
                    "finish_reason": "stop"
                }
            ],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}
        })),
    )
}

async fn capture_provider_chat_completion_billable_usage(
    State(captured): State<Arc<Mutex<Vec<CapturedProviderRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    captured.lock().unwrap().push(CapturedProviderRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::OK,
        Json(json!({
            "id": "chatcmpl-upstream-billable",
            "object": "chat.completion",
            "model": "openai/gpt-4o-mini",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "pong"},
                    "finish_reason": "stop"
                }
            ],
            "usage": {"prompt_tokens": 1_000_000, "completion_tokens": 1_000_000, "total_tokens": 2_000_000}
        })),
    )
}

async fn capture_twice_flaky_provider_chat_completion(
    State(captured): State<Arc<Mutex<Vec<CapturedProviderRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    let attempt_no = {
        let mut captured = captured.lock().unwrap();
        captured.push(CapturedProviderRequest {
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            body,
        });
        captured.len()
    };
    if attempt_no < 3 {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "error": {
                    "message": "temporary provider capacity",
                    "type": "server_error",
                    "code": "provider_unavailable"
                }
            })),
        );
    }
    (
        StatusCode::OK,
        Json(json!({
            "id": "chatcmpl-upstream-retry",
            "object": "chat.completion",
            "model": "openai/gpt-4o-mini",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "pong after retry"},
                    "finish_reason": "stop"
                }
            ],
            "usage": {"prompt_tokens": 2, "completion_tokens": 3, "total_tokens": 5}
        })),
    )
}

async fn capture_provider_chat_completion_stream(
    State(captured): State<Arc<Mutex<Vec<CapturedProviderRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (
    StatusCode,
    [(axum::http::HeaderName, &'static str); 1],
    Body,
) {
    captured.lock().unwrap().push(CapturedProviderRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "text/event-stream")],
        Body::from(
            "data: {\"id\":\"chatcmpl-upstream-stream\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\ndata: {\"id\":\"chatcmpl-upstream-stream\",\"choices\":[],\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":1,\"total_tokens\":2}}\n\ndata: [DONE]\n\n",
        ),
    )
}

async fn capture_provider_chat_completion_stream_requires_native_model(
    State(captured): State<Arc<Mutex<Vec<CapturedProviderRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (
    StatusCode,
    [(axum::http::HeaderName, &'static str); 1],
    Body,
) {
    let model = body["model"].as_str().unwrap_or("").to_owned();
    captured.lock().unwrap().push(CapturedProviderRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    if model != "gpt-4o-mini" {
        return (
            StatusCode::BAD_REQUEST,
            [(axum::http::header::CONTENT_TYPE, "application/json")],
            Body::from(format!(
                r#"{{"error":{{"code":"group:model_route_miss","message":"当前模型暂不可用: {model}","type":"new_api_error"}}}}"#
            )),
        );
    }
    (
        StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "text/event-stream")],
        Body::from(
            "data: {\"id\":\"chatcmpl-upstream-stream\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\ndata: {\"id\":\"chatcmpl-upstream-stream\",\"choices\":[],\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":1,\"total_tokens\":2}}\n\ndata: [DONE]\n\n",
        ),
    )
}

async fn capture_provider_response(
    State(captured): State<Arc<Mutex<Vec<CapturedProviderRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    captured.lock().unwrap().push(CapturedProviderRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::OK,
        Json(json!({
            "id": "resp-upstream",
            "object": "response",
            "model": "openai/gpt-4o-mini",
            "output": [
                {
                    "type": "message",
                    "role": "assistant",
                    "content": [{"type": "output_text", "text": "pong"}]
                }
            ],
            "usage": {"input_tokens": 1, "output_tokens": 1, "total_tokens": 2}
        })),
    )
}

async fn capture_provider_embedding(
    State(captured): State<Arc<Mutex<Vec<CapturedProviderRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    captured.lock().unwrap().push(CapturedProviderRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::OK,
        Json(json!({
            "object": "list",
            "model": "openai/text-embedding-3-small",
            "data": [
                {"object": "embedding", "index": 0, "embedding": [0.1, 0.2, 0.3]}
            ],
            "usage": {"prompt_tokens": 1, "total_tokens": 1}
        })),
    )
}
