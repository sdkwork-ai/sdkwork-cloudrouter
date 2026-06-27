use std::sync::Arc;

use sdkwork_clawrouter_router_service::application::ApiKeySecretCodec;
use sdkwork_clawrouter_router_service::infrastructure::crypto::RingAeadApiKeySecretCodec;
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAppRoutingReadStore;
use sdkwork_clawrouter_router_service::ports::{AppRoutingReadStore, AppRoutingSubject};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

#[tokio::test]
async fn sqlite_routing_usage_ignores_missing_latency_when_averaging() {
    let pool = sqlite_pool().await;
    create_routing_usage_tables(&pool).await;
    insert_trace(&pool, "req-1", Some(100), "2026-05-03 10:00:00").await;
    insert_trace(&pool, "req-2", None, "2026-05-03 10:05:00").await;

    let store = SqliteAppRoutingReadStore::new(pool);
    let snapshot = store
        .load_routing_usage(Some(owner_subject()))
        .await
        .unwrap();

    assert_eq!(1, snapshot.chart_data.len());
    assert_eq!("2026-05-03", snapshot.chart_data[0].time);
    assert_eq!(2, snapshot.chart_data[0].requests);
    assert_eq!(100, snapshot.chart_data[0].latency);

    assert_eq!(1, snapshot.model_stats.len());
    assert_eq!("openai/gpt-4o-mini", snapshot.model_stats[0].m);
    assert_eq!("2", snapshot.model_stats[0].req);
    assert_eq!("100.0%", snapshot.model_stats[0].sr);
    assert_eq!("100ms", snapshot.model_stats[0].lat);
}

#[tokio::test]
async fn sqlite_routing_channels_do_not_return_account_model_allowlists() {
    let pool = sqlite_pool().await;
    create_routing_channel_tables(&pool).await;
    seed_routing_channel(&pool).await;

    let store = SqliteAppRoutingReadStore::new(pool);
    let channels = store
        .load_routing_channels(Some(owner_subject()))
        .await
        .unwrap();

    assert_eq!(1, channels.len());
    assert!(
        channels[0].models.is_empty(),
        "accounts expose resource/capability routing state, not model allowlists"
    );
    assert_eq!("active", channels[0].status);
    assert_eq!(Some(60_000), channels[0].timeout_ms);
    let retry_policy = channels[0]
        .retry_policy
        .as_ref()
        .expect("retry policy should be projected from ai_channel");
    assert_eq!(3, retry_policy.max_attempts);
    assert_eq!(vec![429, 503], retry_policy.retryable_status_codes);
    assert_eq!(25, retry_policy.backoff_ms);
    let circuit_breaker_policy = channels[0]
        .circuit_breaker_policy
        .as_ref()
        .expect("circuit breaker policy should be projected from ai_channel");
    assert_eq!(2, circuit_breaker_policy.failure_threshold);
}

#[tokio::test]
async fn sqlite_routing_api_keys_return_display_and_copyable_owner_key_material() {
    let pool = sqlite_pool().await;
    create_routing_api_key_tables(&pool).await;
    let codec = Arc::new(api_key_secret_codec());
    let ciphertext = codec.encode_secret("sk-owner-secret").unwrap();
    seed_routing_api_key(&pool, &ciphertext).await;

    let store = SqliteAppRoutingReadStore::with_api_key_secret_codec(pool, codec);
    let keys = store
        .load_routing_api_keys(Some(owner_subject()))
        .await
        .unwrap();

    assert_eq!(1, keys.len());
    assert_eq!("Owner Key", keys[0].name);
    assert_eq!("sk-owner********ABCD", keys[0].display_key);
    assert_eq!(Some("sk-owner-secret".to_owned()), keys[0].copyable_key);
    assert_eq!("5", keys[0].total_usage);
}

#[tokio::test]
async fn sqlite_routing_api_keys_do_not_expose_prefix_as_missing_name() {
    let pool = sqlite_pool().await;
    create_routing_api_key_tables(&pool).await;
    let codec = Arc::new(api_key_secret_codec());
    let ciphertext = codec.encode_secret("sk-owner-secret").unwrap();
    seed_routing_api_key(&pool, &ciphertext).await;
    sqlx::query("UPDATE iam_gateway_api_key SET name = '' WHERE id = 100")
        .execute(&pool)
        .await
        .unwrap();

    let store = SqliteAppRoutingReadStore::with_api_key_secret_codec(pool, codec);
    let keys = store
        .load_routing_api_keys(Some(owner_subject()))
        .await
        .unwrap();

    assert_eq!(1, keys.len());
    assert_eq!("API Key #100", keys[0].name);
    assert_eq!("sk-owner********ABCD", keys[0].display_key);
}

#[tokio::test]
async fn sqlite_routing_api_keys_fail_closed_when_copyable_key_exists_without_codec() {
    let pool = sqlite_pool().await;
    create_routing_api_key_tables(&pool).await;
    let ciphertext = api_key_secret_codec()
        .encode_secret("sk-owner-secret")
        .unwrap();
    seed_routing_api_key(&pool, &ciphertext).await;

    let store = SqliteAppRoutingReadStore::new(pool);
    let error = store
        .load_routing_api_keys(Some(owner_subject()))
        .await
        .unwrap_err();

    assert_eq!(
        "api key secret codec is required to load routing copyable key material",
        error.to_string()
    );
}

#[tokio::test]
async fn sqlite_routing_request_traces_expose_safe_audit_metadata_without_payloads() {
    let pool = sqlite_pool().await;
    create_routing_usage_tables(&pool).await;
    insert_trace(&pool, "req-safe-audit", Some(345), "2026-05-03 10:00:00").await;
    sqlx::query(
        r#"
        UPDATE ai_request_trace
        SET trace_id = 'trace-safe-audit',
            request_path = '/v1/chat/completions',
            http_method = 'POST',
            request_payload_hash = 'sha256:req',
            response_payload_hash = 'sha256:res',
            request_bytes = 512,
            response_bytes = 4096,
            error_message_masked = 'provider timeout',
            streaming = 1,
            ended_at = '2026-05-03 10:00:00.345'
        WHERE request_id = 'req-safe-audit'
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let store = SqliteAppRoutingReadStore::new(pool);
    let traces = store
        .load_routing_request_traces(Some(owner_subject()))
        .await
        .unwrap();

    assert_eq!(1, traces.len());
    assert_eq!("trace-safe-audit", traces[0].trace_id);
    assert_eq!("req-safe-audit", traces[0].request_id);
    assert_eq!("/v1/chat/completions", traces[0].request_path);
    assert_eq!("POST", traces[0].http_method);
    assert_eq!("sha256:req", traces[0].request_payload_hash);
    assert_eq!("sha256:res", traces[0].response_payload_hash);
    assert_eq!(512, traces[0].request_bytes);
    assert_eq!(4096, traces[0].response_bytes);
    assert_eq!("provider timeout", traces[0].error_message_masked);
    assert!(traces[0].streaming);
    assert_eq!("2026-05-03 10:00:00", traces[0].started_at);
    assert_eq!("2026-05-03 10:00:00.345", traces[0].ended_at);
}

#[tokio::test]
async fn sqlite_routing_request_traces_tolerate_missing_latency() {
    let pool = sqlite_pool().await;
    create_routing_usage_tables(&pool).await;
    insert_trace(&pool, "req-missing-latency", None, "2026-05-03 10:00:00").await;

    let store = SqliteAppRoutingReadStore::new(pool);
    let traces = store
        .load_routing_request_traces(Some(owner_subject()))
        .await
        .unwrap();

    assert_eq!(1, traces.len());
    assert_eq!("req-missing-latency", traces[0].request_id);
    assert_eq!("0ms", traces[0].duration);
}

async fn sqlite_pool() -> SqlitePool {
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap()
}

fn owner_subject() -> AppRoutingSubject {
    AppRoutingSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    }
}

fn api_key_secret_codec() -> RingAeadApiKeySecretCodec {
    RingAeadApiKeySecretCodec::new("0123456789abcdef0123456789abcdef").unwrap()
}

async fn create_routing_api_key_tables(pool: &SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE iam_gateway_api_key (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            name TEXT,
            key_prefix TEXT,
            key_display_masked TEXT,
            metadata TEXT NOT NULL DEFAULT '{}',
            status INTEGER NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_usage_fact (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            api_key_id INTEGER NOT NULL,
            request_count INTEGER NOT NULL,
            status INTEGER NOT NULL
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_routing_api_key(pool: &SqlitePool, copyable_key_ciphertext: &str) {
    let metadata = serde_json::json!({
        "copyableKeyCiphertext": copyable_key_ciphertext,
        "copyableKeyStorage": "encrypted-managed-console-read-model"
    })
    .to_string();
    sqlx::query(
        r#"
        INSERT INTO iam_gateway_api_key (
            id, tenant_id, organization_id, user_id, name, key_prefix, key_display_masked,
            metadata, status, created_at, updated_at
        )
        VALUES (
            100, 100001, 0, 30, 'Owner Key', 'sk-owner', 'sk-owner********ABCD',
            ?, 1, '2026-04-29 12:00:00', '2026-04-29 12:05:00'
        )
        "#,
    )
    .bind(metadata)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_usage_fact (
            id, tenant_id, organization_id, user_id, api_key_id, request_count, status
        )
        VALUES (9001, 100001, 0, 30, 100, 5, 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn create_routing_usage_tables(pool: &SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE ai_request_trace (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT NOT NULL,
            trace_id TEXT,
            status INTEGER NOT NULL,
            created_at TEXT,
            started_at TEXT,
            ended_at TEXT,
            channel_name_snapshot TEXT,
            requested_model TEXT,
            provider_model TEXT,
            request_path TEXT,
            http_method TEXT,
            http_status INTEGER,
            error_type INTEGER,
            provider_error_code TEXT,
            error_message_masked TEXT,
            request_payload_hash TEXT,
            response_payload_hash TEXT,
            request_bytes INTEGER,
            response_bytes INTEGER,
            streaming INTEGER,
            latency_ms INTEGER,
            total_tokens INTEGER
        )
        "#,
        r#"
        CREATE TABLE ai_routing_decision_log (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            request_id TEXT NOT NULL,
            status INTEGER NOT NULL,
            resolved_model TEXT,
            selected_channel_id INTEGER
        )
        "#,
        r#"
        CREATE TABLE ai_usage_fact (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            request_id TEXT NOT NULL,
            catalog_key TEXT NOT NULL,
            model TEXT,
            total_tokens INTEGER
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn create_routing_channel_tables(pool: &SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE ai_channel (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            channel_name TEXT,
            channel_code TEXT,
            provider_code TEXT,
            protocol_code TEXT,
            auth_type INTEGER NOT NULL,
            base_url TEXT,
            masked_label TEXT,
            timeout_ms INTEGER,
            retry_policy TEXT,
            circuit_breaker_policy TEXT,
            weight INTEGER,
            status INTEGER NOT NULL,
            health_status INTEGER NOT NULL,
            last_latency_ms INTEGER,
            rpm_limit INTEGER,
            upstream_balance_amount TEXT,
            upstream_balance_currency TEXT,
            consecutive_error_count INTEGER,
            priority INTEGER NOT NULL,
            deleted_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_channel_resource (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            channel_id INTEGER NOT NULL,
            resource_code TEXT,
            resource_group_code TEXT,
            grant_type TEXT NOT NULL DEFAULT 'allow',
            status INTEGER NOT NULL,
            deleted_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_channel_credential (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            channel_id INTEGER NOT NULL,
            base_url TEXT,
            masked_label TEXT,
            priority INTEGER,
            weight INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_resource (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            resource_code TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            modality_code TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_resource_group (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            group_code TEXT NOT NULL,
            group_type TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_routing_channel(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO ai_resource (
            id, tenant_id, organization_id, resource_code, resource_type, modality_code, status
        )
        VALUES (5001, 100001, 0, 'llm', 'modality', 'llm', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_channel (
            id, tenant_id, organization_id, channel_name, provider_code, protocol_code, auth_type,
            base_url, masked_label, timeout_ms, retry_policy, circuit_breaker_policy, weight, status, health_status, last_latency_ms,
            rpm_limit, consecutive_error_count, priority
        )
        VALUES (
            2001, 100001, 0, 'OpenAI primary', 'openai', 'openai', 1,
            'https://api.openai.test/v1', 'sk-***test', 60000,
            '{"max_attempts":3,"retryable_status_codes":[429,503],"backoff_ms":25}',
            '{"failure_threshold":2}',
            100, 1, 1, 120,
            600, 0, 1
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource (
            id, tenant_id, organization_id, channel_id, resource_code, grant_type, status
        )
        VALUES (6001, 100001, 0, 2001, 'llm', 'allow', 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn insert_trace(
    pool: &SqlitePool,
    request_id: &str,
    latency_ms: Option<i64>,
    started_at: &str,
) {
    sqlx::query(
        r#"
        INSERT INTO ai_request_trace (
            tenant_id, organization_id, user_id, request_id, status, created_at, started_at,
            channel_name_snapshot, requested_model, provider_model, http_status, error_type, provider_error_code,
            latency_ms, total_tokens
        )
        VALUES (10, 20, 30, ?, 1, ?, ?, 'OpenAI primary', 'openai/gpt-4o-mini', '', 200, NULL, NULL, ?, 9)
        "#,
    )
    .bind(request_id)
    .bind(started_at)
    .bind(started_at)
    .bind(latency_ms)
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_usage_fact (
            tenant_id, organization_id, user_id, status, request_id, catalog_key, model, total_tokens
        )
        VALUES (10, 20, 30, 1, ?, 'openai/gpt-4o-mini', 'gpt-4o-mini', 9)
        "#,
    )
    .bind(request_id)
    .execute(pool)
    .await
    .unwrap();
}
