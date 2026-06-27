use axum::http::{HeaderMap, Uri};
use futures_util::future::join_all;
use sdkwork_clawrouter_router_service::api::{
    OpenAiInvocationContext, OpenAiInvocationEndpoint, OpenAiInvocationFault,
    OpenAiInvocationPlugin, OpenAiInvocationRelayOutcome, OpenAiProviderRoute,
};
use sdkwork_clawrouter_router_service::application::AuthenticatedApiKeyContext;
use sdkwork_clawrouter_router_service::domain::ProviderAuthProfile;
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteOpenAiInvocationTelemetryPlugin;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Row, SqlitePool};

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_records_faults_and_recovers_on_success() {
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
    install_schema(&pool).await;
    seed_channel(&pool).await;

    let plugin = SqliteOpenAiInvocationTelemetryPlugin::new(pool.clone());
    let context = invocation_context();
    let route = provider_route();

    plugin
        .on_route_fault(
            &context,
            &route,
            &OpenAiInvocationFault::relay_transport("upstream connection failed"),
        )
        .await
        .unwrap();

    let channel = sqlx::query(
        "SELECT health_status, consecutive_error_count FROM ai_channel WHERE id = 3001",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(2_i64, channel.get::<i64, _>("health_status"));
    assert_eq!(1_i64, channel.get::<i64, _>("consecutive_error_count"));

    let fault_snapshot = sqlx::query(
        "SELECT health_status, error_code, provider_account_id FROM integration_provider_health_snapshot WHERE channel_id = 3001 ORDER BY id DESC LIMIT 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(2_i64, fault_snapshot.get::<i64, _>("health_status"));
    assert_eq!(
        "provider_relay_failed",
        fault_snapshot.get::<String, _>("error_code")
    );
    assert_eq!(
        3001_i64,
        fault_snapshot.get::<i64, _>("provider_account_id")
    );

    plugin
        .on_route_success(
            &context,
            &route,
            &OpenAiInvocationRelayOutcome::json(200, serde_json::json!({"usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}})),
        )
        .await
        .unwrap();

    let channel = sqlx::query(
        "SELECT health_status, consecutive_error_count FROM ai_channel WHERE id = 3001",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1_i64, channel.get::<i64, _>("health_status"));
    assert_eq!(0_i64, channel.get::<i64, _>("consecutive_error_count"));

    let snapshot_count: i64 =
        sqlx::query("SELECT COUNT(*) AS count FROM integration_provider_health_snapshot")
            .fetch_one(&pool)
            .await
            .unwrap()
            .get("count");
    assert_eq!(2, snapshot_count);
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_honors_channel_circuit_breaker_threshold() {
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
    install_schema(&pool).await;
    seed_channel_with_circuit_breaker_policy(&pool, r#"{"failure_threshold":2}"#).await;

    let plugin = SqliteOpenAiInvocationTelemetryPlugin::new(pool.clone());
    let context = invocation_context();
    let route = provider_route();

    plugin
        .on_route_fault(
            &context,
            &route,
            &OpenAiInvocationFault::relay_transport("first upstream failure"),
        )
        .await
        .unwrap();

    let channel = sqlx::query(
        "SELECT health_status, consecutive_error_count FROM ai_channel WHERE id = 3001",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1_i64, channel.get::<i64, _>("health_status"));
    assert_eq!(1_i64, channel.get::<i64, _>("consecutive_error_count"));

    let first_fault_snapshot = sqlx::query(
        "SELECT health_status, error_code FROM integration_provider_health_snapshot WHERE channel_id = 3001 ORDER BY id DESC LIMIT 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1_i64, first_fault_snapshot.get::<i64, _>("health_status"));
    assert_eq!(
        "provider_relay_failed",
        first_fault_snapshot.get::<String, _>("error_code")
    );

    plugin
        .on_route_fault(
            &context,
            &route,
            &OpenAiInvocationFault::relay_transport("second upstream failure"),
        )
        .await
        .unwrap();

    let channel = sqlx::query(
        "SELECT health_status, consecutive_error_count FROM ai_channel WHERE id = 3001",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(2_i64, channel.get::<i64, _>("health_status"));
    assert_eq!(2_i64, channel.get::<i64, _>("consecutive_error_count"));
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_counts_concurrent_faults_atomically() {
    let pool = SqlitePoolOptions::new()
        .max_connections(4)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    install_schema(&pool).await;
    seed_channel_with_circuit_breaker_policy(&pool, r#"{"failure_threshold":3}"#).await;

    let plugin = SqliteOpenAiInvocationTelemetryPlugin::new(pool.clone());
    let context = invocation_context();
    let route = provider_route();

    let faults = (0..8).map(|index| {
        let plugin = plugin.clone();
        let context = context.clone();
        let route = route.clone();
        async move {
            plugin
                .on_route_fault(
                    &context,
                    &route,
                    &OpenAiInvocationFault::relay_transport(format!(
                        "upstream connection failed {index}"
                    )),
                )
                .await
                .unwrap();
        }
    });
    join_all(faults).await;

    let channel = sqlx::query(
        "SELECT health_status, consecutive_error_count FROM ai_channel WHERE id = 3001",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(2_i64, channel.get::<i64, _>("health_status"));
    assert_eq!(8_i64, channel.get::<i64, _>("consecutive_error_count"));

    let snapshot_count: i64 =
        sqlx::query("SELECT COUNT(*) AS count FROM integration_provider_health_snapshot")
            .fetch_one(&pool)
            .await
            .unwrap()
            .get("count");
    assert_eq!(8, snapshot_count);
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_uses_default_threshold_when_policy_is_malformed() {
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
    install_schema(&pool).await;
    seed_channel_with_circuit_breaker_policy(&pool, r#"{"failureThreshold":2}"#).await;

    let plugin = SqliteOpenAiInvocationTelemetryPlugin::new(pool.clone());
    let context = invocation_context();
    let route = provider_route();

    plugin
        .on_route_fault(
            &context,
            &route,
            &OpenAiInvocationFault::relay_transport("upstream connection failed"),
        )
        .await
        .unwrap();

    let channel = sqlx::query(
        "SELECT health_status, consecutive_error_count FROM ai_channel WHERE id = 3001",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(2_i64, channel.get::<i64, _>("health_status"));
    assert_eq!(1_i64, channel.get::<i64, _>("consecutive_error_count"));

    let fault_snapshot = sqlx::query(
        "SELECT health_status, error_code FROM integration_provider_health_snapshot WHERE channel_id = 3001 ORDER BY id DESC LIMIT 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(2_i64, fault_snapshot.get::<i64, _>("health_status"));
    assert_eq!(
        "provider_relay_failed",
        fault_snapshot.get::<String, _>("error_code")
    );
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_does_not_trip_provider_health_for_non_retryable_http_statuses(
) {
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
    install_schema(&pool).await;
    seed_channel_with_circuit_breaker_policy(&pool, r#"{"failure_threshold":1}"#).await;

    let plugin = SqliteOpenAiInvocationTelemetryPlugin::new(pool.clone());
    let context = invocation_context();
    let route = provider_route();

    plugin
        .on_route_fault(
            &context,
            &route,
            &OpenAiInvocationFault::relay_http_status(
                400,
                false,
                "provider relay returned HTTP 400",
            ),
        )
        .await
        .unwrap();

    let channel = sqlx::query(
        "SELECT health_status, consecutive_error_count FROM ai_channel WHERE id = 3001",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1_i64, channel.get::<i64, _>("health_status"));
    assert_eq!(0_i64, channel.get::<i64, _>("consecutive_error_count"));

    let fault_snapshot = sqlx::query(
        "SELECT health_status, http_status, error_code FROM integration_provider_health_snapshot WHERE channel_id = 3001 ORDER BY id DESC LIMIT 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1_i64, fault_snapshot.get::<i64, _>("health_status"));
    assert_eq!(400_i64, fault_snapshot.get::<i64, _>("http_status"));
    assert_eq!(
        "upstream_http_400",
        fault_snapshot.get::<String, _>("error_code")
    );
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_does_not_trip_provider_health_for_usage_failures() {
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
    install_schema(&pool).await;
    seed_channel(&pool).await;

    let plugin = SqliteOpenAiInvocationTelemetryPlugin::new(pool.clone());
    let context = invocation_context();
    let route = provider_route();

    plugin
        .on_route_fault(
            &context,
            &route,
            &OpenAiInvocationFault::usage_recording("usage database unavailable"),
        )
        .await
        .unwrap();

    let channel = sqlx::query(
        "SELECT health_status, consecutive_error_count FROM ai_channel WHERE id = 3001",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1_i64, channel.get::<i64, _>("health_status"));
    assert_eq!(0_i64, channel.get::<i64, _>("consecutive_error_count"));

    let usage_fault_snapshot = sqlx::query(
        "SELECT health_status, error_code FROM integration_provider_health_snapshot WHERE channel_id = 3001 ORDER BY id DESC LIMIT 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1_i64, usage_fault_snapshot.get::<i64, _>("health_status"));
    assert_eq!(
        "provider_usage_record_failed",
        usage_fault_snapshot.get::<String, _>("error_code")
    );
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_records_route_latency_on_fault_and_success() {
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
    install_schema(&pool).await;
    seed_channel(&pool).await;

    let plugin = SqliteOpenAiInvocationTelemetryPlugin::new(pool.clone());
    let context = invocation_context();
    let route = provider_route();

    plugin
        .on_route_fault(
            &context,
            &route,
            &OpenAiInvocationFault::relay_transport("upstream connection failed")
                .with_latency_ms(37),
        )
        .await
        .unwrap();

    let fault_snapshot = sqlx::query(
        "SELECT latency_ms FROM integration_provider_health_snapshot WHERE channel_id = 3001 ORDER BY id DESC LIMIT 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(37_i64, fault_snapshot.get::<i64, _>("latency_ms"));

    let channel_latency: i64 =
        sqlx::query("SELECT last_latency_ms FROM ai_channel WHERE id = 3001")
            .fetch_one(&pool)
            .await
            .unwrap()
            .get("last_latency_ms");
    assert_eq!(37, channel_latency);

    plugin
        .on_route_success(
            &context,
            &route,
            &OpenAiInvocationRelayOutcome::json(
                200,
                serde_json::json!({"usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}}),
            )
            .with_latency_ms(19),
        )
        .await
        .unwrap();

    let success_snapshot = sqlx::query(
        "SELECT latency_ms FROM integration_provider_health_snapshot WHERE channel_id = 3001 ORDER BY id DESC LIMIT 1",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(19_i64, success_snapshot.get::<i64, _>("latency_ms"));

    let channel_latency: i64 =
        sqlx::query("SELECT last_latency_ms FROM ai_channel WHERE id = 3001")
            .fetch_one(&pool)
            .await
            .unwrap()
            .get("last_latency_ms");
    assert_eq!(19, channel_latency);
}

async fn install_schema(pool: &SqlitePool) {
    sqlx::query(
        r#"
        CREATE TABLE ai_channel (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            status INTEGER NOT NULL,
            updated_at TEXT,
            version INTEGER,
            deleted_at TEXT,
            provider_id INTEGER,
            provider_code TEXT,
            health_status INTEGER,
            last_latency_ms INTEGER,
            circuit_breaker_policy TEXT,
            consecutive_error_count INTEGER
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        CREATE TABLE integration_provider_health_snapshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            metadata TEXT NOT NULL,
            provider_id INTEGER,
            channel_id INTEGER,
            provider_account_id INTEGER,
            check_type INTEGER,
            health_status INTEGER,
            latency_ms INTEGER,
            http_status INTEGER,
            error_code TEXT,
            error_message_masked TEXT,
            checked_at TEXT
        )
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_channel(pool: &SqlitePool) {
    seed_channel_with_optional_circuit_breaker_policy(pool, None).await;
}

async fn seed_channel_with_circuit_breaker_policy(pool: &SqlitePool, policy_json: &str) {
    seed_channel_with_optional_circuit_breaker_policy(pool, Some(policy_json)).await;
}

async fn seed_channel_with_optional_circuit_breaker_policy(
    pool: &SqlitePool,
    policy_json: Option<&str>,
) {
    sqlx::query(
        r#"
        INSERT INTO ai_channel
            (id, uuid, tenant_id, organization_id, status, provider_id, provider_code, health_status, circuit_breaker_policy, consecutive_error_count)
        VALUES
            (3001, 'channel-3001', 100001, 0, 1, 7001, 'openrouter', 1, ?, 0)
        "#,
    )
    .bind(policy_json)
    .execute(pool)
    .await
    .unwrap();
}

fn invocation_context() -> OpenAiInvocationContext {
    let headers = HeaderMap::new();
    let uri: Uri = "/v1/chat/completions".parse().unwrap();
    OpenAiInvocationContext::new(
        OpenAiInvocationEndpoint::ChatCompletions,
        AuthenticatedApiKeyContext {
            api_key_id: 101,
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_name_snapshot: "sk-live".to_owned(),
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        },
        "gpt-4o-mini",
        false,
        serde_json::json!({"model": "gpt-4o-mini"}),
        &headers,
        &uri,
    )
}

fn provider_route() -> OpenAiProviderRoute {
    OpenAiProviderRoute {
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        policy_id: Some(9001),
        rule_id: Some(9102),
        group_id: 10,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
        provider_code: "openrouter".to_owned(),
        channel_id: 3001,
        region_code: "global".to_owned(),
        provider_model: "gpt-4o-mini".to_owned(),
        provider_base_url: Some("http://provider-proxy.internal/openrouter".to_owned()),
        provider_secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
        provider_auth_profile: ProviderAuthProfile::default(),
        provider_timeout_ms: Some(30_000),
        provider_retry_policy: None,
    }
}
