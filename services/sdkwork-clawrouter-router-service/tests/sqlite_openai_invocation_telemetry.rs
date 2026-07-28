use axum::http::{HeaderMap, Uri};
use futures_util::future::join_all;
use sdkwork_clawrouter_router_service::api::{
    OpenAiInvocationContext, OpenAiInvocationEndpoint, OpenAiInvocationFault,
    OpenAiInvocationPlugin, OpenAiInvocationRelayOutcome, OpenAiProviderRoute,
};
use sdkwork_clawrouter_router_service::application::AuthenticatedApiKeyContext;
use sdkwork_clawrouter_router_service::domain::ProviderAuthProfile;
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteOpenAiInvocationTelemetryPlugin;
use sdkwork_clawrouter_router_service_test_support::schema_sqlite_pool;
use sqlx::{Row, SqlitePool};

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_records_faults_and_recovers_on_success() {
    let pool = schema_sqlite_pool().await;
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

    assert_projection_table_absent(&pool).await;
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_honors_channel_circuit_breaker_threshold() {
    let pool = schema_sqlite_pool().await;
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
    let pool = schema_sqlite_pool().await;
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

    assert_projection_table_absent(&pool).await;
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_uses_default_threshold_when_policy_is_malformed() {
    let pool = schema_sqlite_pool().await;
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
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_does_not_trip_provider_health_for_non_retryable_http_statuses(
) {
    let pool = schema_sqlite_pool().await;
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

    assert_projection_table_absent(&pool).await;
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_does_not_trip_provider_health_for_usage_failures() {
    let pool = schema_sqlite_pool().await;
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

    assert_projection_table_absent(&pool).await;
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_cannot_update_a_foreign_tenant_channel() {
    let pool = schema_sqlite_pool().await;
    seed_channel(&pool).await;

    let plugin = SqliteOpenAiInvocationTelemetryPlugin::new(pool.clone());
    let context = invocation_context_for_scope(200002, 0);
    let route = provider_route();

    plugin
        .on_route_fault(
            &context,
            &route,
            &OpenAiInvocationFault::relay_transport("foreign tenant fault"),
        )
        .await
        .unwrap();
    plugin
        .on_route_success(
            &context,
            &route,
            &OpenAiInvocationRelayOutcome::json(200, serde_json::json!({})),
        )
        .await
        .unwrap();

    let channel = sqlx::query(
        "SELECT health_status, consecutive_error_count, last_latency_ms FROM ai_channel WHERE id = 3001",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1_i64, channel.get::<i64, _>("health_status"));
    assert_eq!(0_i64, channel.get::<i64, _>("consecutive_error_count"));
    assert_eq!(None, channel.get::<Option<i64>, _>("last_latency_ms"));
}

#[tokio::test]
async fn sqlite_openai_invocation_telemetry_records_route_latency_on_fault_and_success() {
    let pool = schema_sqlite_pool().await;
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

    let channel_latency: i64 =
        sqlx::query("SELECT last_latency_ms FROM ai_channel WHERE id = 3001")
            .fetch_one(&pool)
            .await
            .unwrap()
            .get("last_latency_ms");
    assert_eq!(19, channel_latency);
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
            (id, uuid, tenant_id, organization_id, account_code, channel_name, channel_type, status, provider_id, supplier_code, health_status, circuit_breaker_policy, consecutive_error_count)
        VALUES
            (3001, 'channel-3001', 100001, 0, 'openrouter-main', 'OpenRouter Main', 'relay', 1, 7001, 'openrouter', 1, ?, 0)
        "#,
    )
    .bind(policy_json)
    .execute(pool)
    .await
    .unwrap();
}

async fn assert_projection_table_absent(pool: &SqlitePool) {
    let table_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'integration_provider_health_snapshot'",
    )
    .fetch_one(pool)
    .await
    .unwrap();
    assert_eq!(0, table_count);
}

fn invocation_context() -> OpenAiInvocationContext {
    invocation_context_for_scope(100001, 0)
}

fn invocation_context_for_scope(tenant_id: i64, organization_id: i64) -> OpenAiInvocationContext {
    let headers = HeaderMap::new();
    let uri: Uri = "/v1/chat/completions".parse().unwrap();
    OpenAiInvocationContext::new(
        OpenAiInvocationEndpoint::ChatCompletions,
        AuthenticatedApiKeyContext {
            api_key_id: 101,
            tenant_id,
            organization_id,
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
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        provider_model: "gpt-4o-mini".to_owned(),
        provider_base_url: Some("http://provider-proxy.internal/openrouter".to_owned()),
        provider_secret_ref: Some("vault://providers/openrouter/account/main".to_owned()),
        provider_auth_profile: ProviderAuthProfile::default(),
        provider_timeout_ms: Some(30_000),
        provider_retry_policy: None,
    }
}
