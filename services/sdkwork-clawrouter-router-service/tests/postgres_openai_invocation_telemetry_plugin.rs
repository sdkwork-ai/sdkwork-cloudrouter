use std::env;

use sdkwork_clawrouter_router_service::api::{
    OpenAiInvocationContext, OpenAiInvocationEndpoint, OpenAiInvocationFault,
    OpenAiInvocationPlugin, OpenAiInvocationRelayOutcome, OpenAiUpstreamRoute,
};
use sdkwork_clawrouter_router_service::application::AuthenticatedApiKeyContext;
use sdkwork_clawrouter_router_service::domain::ProviderAuthProfile;
use sdkwork_clawrouter_router_service::infrastructure::sql::postgres::PostgresOpenAiInvocationTelemetryPlugin;
use serde_json::json;
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const TENANT_ID: i64 = 100_001;
const ORGANIZATION_ID: i64 = 200_001;
const SUPPLIER_ID: i64 = 7_001;
const ACTIVE_ENDPOINT_ID: i64 = 7_101;
const DISABLED_ENDPOINT_ID: i64 = 7_102;
const FIRST_ACCOUNT_ID: i64 = 7_201;
const SECOND_ACCOUNT_ID: i64 = 7_202;
const ACTIVE_BASE_URL: &str = "https://api.example.test/v1";
const DISABLED_BASE_URL: &str = "https://disabled.example.test/v1";

#[tokio::test]
async fn postgres_invocation_telemetry_tracks_runtime_health_without_mutating_configuration() {
    let Some(context) = PostgresTestContext::new("invocation_telemetry").await else {
        return;
    };
    seed_upstream_configuration(&context.pool).await;
    let plugin = PostgresOpenAiInvocationTelemetryPlugin::new(context.pool.clone());
    let invocation = invocation_context();
    let first_route = upstream_route(FIRST_ACCOUNT_ID, ACTIVE_BASE_URL);
    let second_route = upstream_route(SECOND_ACCOUNT_ID, ACTIVE_BASE_URL);

    plugin
        .on_route_success(
            &invocation,
            &first_route,
            &OpenAiInvocationRelayOutcome::json(200, json!({"ok": true})).with_latency_ms(42),
        )
        .await
        .expect("record successful invocation");

    assert_account_health(&context.pool, FIRST_ACCOUNT_ID, 1, 0, Some(42)).await;
    assert_endpoint_health(&context.pool, ACTIVE_ENDPOINT_ID, 1, 0, Some(42)).await;
    assert_health_timestamps(&context.pool, FIRST_ACCOUNT_ID, ACTIVE_ENDPOINT_ID).await;

    plugin
        .on_route_fault(
            &invocation,
            &first_route,
            &OpenAiInvocationFault::relay_http_status(400, false, "invalid request")
                .with_latency_ms(77),
        )
        .await
        .expect("ignore non-retryable upstream response");

    assert_account_health(&context.pool, FIRST_ACCOUNT_ID, 1, 0, Some(42)).await;
    assert_endpoint_health(&context.pool, ACTIVE_ENDPOINT_ID, 1, 0, Some(42)).await;

    plugin
        .on_route_fault(
            &invocation,
            &first_route,
            &OpenAiInvocationFault::relay_http_status(503, true, "temporarily unavailable")
                .with_latency_ms(100),
        )
        .await
        .expect("record first account failure");
    plugin
        .on_route_fault(
            &invocation,
            &second_route,
            &OpenAiInvocationFault::relay_transport("connection reset").with_latency_ms(101),
        )
        .await
        .expect("record shared endpoint failure");

    assert_account_health(&context.pool, FIRST_ACCOUNT_ID, 1, 1, Some(100)).await;
    assert_account_health(&context.pool, SECOND_ACCOUNT_ID, 1, 1, Some(101)).await;
    assert_endpoint_health(&context.pool, ACTIVE_ENDPOINT_ID, 1, 2, Some(101)).await;

    for latency_ms in 102..=105 {
        plugin
            .on_route_fault(
                &invocation,
                &first_route,
                &OpenAiInvocationFault::relay_transport("connection reset")
                    .with_latency_ms(latency_ms),
            )
            .await
            .expect("record consecutive account failure");
    }

    assert_account_health(&context.pool, FIRST_ACCOUNT_ID, 2, 5, Some(105)).await;
    assert_endpoint_health(&context.pool, ACTIVE_ENDPOINT_ID, 2, 6, Some(105)).await;

    plugin
        .on_route_success(
            &invocation,
            &first_route,
            &OpenAiInvocationRelayOutcome::json(200, json!({"ok": true})).with_latency_ms(55),
        )
        .await
        .expect("recover account and endpoint health");

    assert_account_health(&context.pool, FIRST_ACCOUNT_ID, 1, 0, Some(55)).await;
    assert_endpoint_health(&context.pool, ACTIVE_ENDPOINT_ID, 1, 0, Some(55)).await;

    let disabled_route = upstream_route(FIRST_ACCOUNT_ID, DISABLED_BASE_URL);
    plugin
        .on_route_fault(
            &invocation,
            &disabled_route,
            &OpenAiInvocationFault::relay_transport("disabled endpoint").with_latency_ms(200),
        )
        .await
        .expect("ignore disabled endpoint health target");
    let disabled_health_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_upstream_supplier_endpoint_health_state WHERE endpoint_id = $1",
    )
    .bind(DISABLED_ENDPOINT_ID)
    .fetch_one(&context.pool)
    .await
    .expect("count disabled endpoint health rows");
    assert_eq!(0, disabled_health_count);

    assert_configuration_versions_unchanged(&context.pool).await;
    context.cleanup().await;
}

fn invocation_context() -> OpenAiInvocationContext {
    OpenAiInvocationContext {
        endpoint: OpenAiInvocationEndpoint::ChatCompletions,
        api_key_context: AuthenticatedApiKeyContext {
            api_key_id: 8_001,
            tenant_id: TENANT_ID,
            organization_id: ORGANIZATION_ID,
            user_id: 8_101,
            api_key_name_snapshot: "integration-test-key".to_owned(),
            group_id: 8_201,
            group_code: "default".to_owned(),
            pricing_plan_code: "commercial".to_owned(),
        },
        requested_model: "gpt-test".to_owned(),
        stream: false,
        request_body: json!({"model": "gpt-test"}),
        request_path: "/v1/chat/completions".to_owned(),
        http_method: "POST".to_owned(),
        request_id: "request-invocation-telemetry".to_owned(),
        trace_id: Some("trace-invocation-telemetry".to_owned()),
        user_agent: Some("integration-test".to_owned()),
    }
}

fn upstream_route(account_id: i64, provider_base_url: &str) -> OpenAiUpstreamRoute {
    OpenAiUpstreamRoute {
        catalog_key: "openai/gpt-test".to_owned(),
        policy_id: None,
        rule_id: None,
        group_id: 8_201,
        group_code: "default".to_owned(),
        pricing_plan_code: "commercial".to_owned(),
        supplier_code: "openai-test".to_owned(),
        region_code: "global".to_owned(),
        account_id,
        provider_model: "gpt-test".to_owned(),
        provider_base_url: Some(provider_base_url.to_owned()),
        provider_secret_ref: None,
        provider_auth_profile: ProviderAuthProfile::default(),
        provider_timeout_ms: Some(30_000),
        provider_retry_policy: None,
    }
}

async fn seed_upstream_configuration(pool: &PgPool) {
    sqlx::raw_sql(sqlx::AssertSqlSafe(format!(
        r#"
        INSERT INTO ai_upstream_supplier (
            id, uuid, tenant_id, organization_id, status,
            supplier_code, supplier_name, display_name, supplier_type,
            adapter_code, protocol_code, environment, version
        ) VALUES (
            {SUPPLIER_ID}, 'test-invocation-supplier', {TENANT_ID}, {ORGANIZATION_ID}, 1,
            'openai-test', 'OpenAI Test', 'OpenAI Test', 'official',
            'openai', 'openai', 1, 7
        );

        INSERT INTO ai_upstream_supplier_endpoint (
            id, uuid, tenant_id, organization_id, status,
            supplier_id, supplier_code, endpoint_code, endpoint_name, base_url,
            environment, priority, routing_weight, version
        ) VALUES
            ({ACTIVE_ENDPOINT_ID}, 'test-invocation-endpoint-active', {TENANT_ID}, {ORGANIZATION_ID}, 1,
             {SUPPLIER_ID}, 'openai-test', 'active', 'Active', '{ACTIVE_BASE_URL}',
             1, 10, 100, 11),
            ({DISABLED_ENDPOINT_ID}, 'test-invocation-endpoint-disabled', {TENANT_ID}, {ORGANIZATION_ID}, 0,
             {SUPPLIER_ID}, 'openai-test', 'disabled', 'Disabled', '{DISABLED_BASE_URL}',
             1, 20, 100, 12);

        INSERT INTO ai_upstream_supplier_auth_method (
            id, uuid, tenant_id, organization_id, status,
            supplier_id, supplier_code, auth_method_code, auth_method_name,
            auth_type, config_schema, runtime_auth_config, priority
        ) VALUES (
            7151, 'test-invocation-auth-method', {TENANT_ID}, {ORGANIZATION_ID}, 1,
            {SUPPLIER_ID}, 'openai-test', 'api-key', 'API key',
            'api_key', '{{}}'::jsonb,
            '{{"credentialTransport":"bearer","defaultHeaders":{{}}}}'::jsonb, 10
        );

        INSERT INTO ai_upstream_account (
            id, uuid, tenant_id, organization_id, status,
            supplier_id, supplier_code, preferred_endpoint_id,
            account_code, account_name, account_type, auth_method_code,
            environment, circuit_breaker_policy, version
        ) VALUES
            ({FIRST_ACCOUNT_ID}, 'test-invocation-account-first', {TENANT_ID}, {ORGANIZATION_ID}, 1,
             {SUPPLIER_ID}, 'openai-test', {ACTIVE_ENDPOINT_ID},
             'first', 'First', 'standard', 'api-key', 1,
             '{{"failure_threshold": 5}}'::jsonb, 21),
            ({SECOND_ACCOUNT_ID}, 'test-invocation-account-second', {TENANT_ID}, {ORGANIZATION_ID}, 1,
             {SUPPLIER_ID}, 'openai-test', {ACTIVE_ENDPOINT_ID},
             'second', 'Second', 'standard', 'api-key', 1,
             '{{"failure_threshold": 5}}'::jsonb, 22);
        "#,
    )))
    .execute(pool)
    .await
    .expect("seed upstream telemetry configuration");
}

async fn assert_account_health(
    pool: &PgPool,
    account_id: i64,
    expected_status: i32,
    expected_error_count: i64,
    expected_latency_ms: Option<i32>,
) {
    let row = sqlx::query(
        r#"
        SELECT health_status, consecutive_error_count, last_latency_ms
        FROM ai_upstream_account_health_state
        WHERE tenant_id = $1 AND organization_id = $2 AND account_id = $3
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(account_id)
    .fetch_one(pool)
    .await
    .expect("load account health");
    assert_eq!(expected_status, row.get::<i32, _>("health_status"));
    assert_eq!(
        expected_error_count,
        row.get::<i64, _>("consecutive_error_count")
    );
    assert_eq!(
        expected_latency_ms,
        row.get::<Option<i32>, _>("last_latency_ms")
    );
}

async fn assert_endpoint_health(
    pool: &PgPool,
    endpoint_id: i64,
    expected_status: i32,
    expected_error_count: i64,
    expected_latency_ms: Option<i32>,
) {
    let row = sqlx::query(
        r#"
        SELECT health_status, consecutive_error_count, last_latency_ms
        FROM ai_upstream_supplier_endpoint_health_state
        WHERE tenant_id = $1 AND organization_id = $2 AND endpoint_id = $3
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(endpoint_id)
    .fetch_one(pool)
    .await
    .expect("load endpoint health");
    assert_eq!(expected_status, row.get::<i32, _>("health_status"));
    assert_eq!(
        expected_error_count,
        row.get::<i64, _>("consecutive_error_count")
    );
    assert_eq!(
        expected_latency_ms,
        row.get::<Option<i32>, _>("last_latency_ms")
    );
}

async fn assert_health_timestamps(pool: &PgPool, account_id: i64, endpoint_id: i64) {
    let account_ready: bool = sqlx::query_scalar(
        r#"
        SELECT last_used_at IS NOT NULL AND last_success_at IS NOT NULL
        FROM ai_upstream_account_health_state
        WHERE tenant_id = $1 AND organization_id = $2 AND account_id = $3
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(account_id)
    .fetch_one(pool)
    .await
    .expect("load account health timestamps");
    assert!(account_ready);

    let endpoint_ready: bool = sqlx::query_scalar(
        r#"
        SELECT last_checked_at IS NOT NULL AND last_success_at IS NOT NULL
        FROM ai_upstream_supplier_endpoint_health_state
        WHERE tenant_id = $1 AND organization_id = $2 AND endpoint_id = $3
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(endpoint_id)
    .fetch_one(pool)
    .await
    .expect("load endpoint health timestamps");
    assert!(endpoint_ready);
}

async fn assert_configuration_versions_unchanged(pool: &PgPool) {
    let supplier_version: i64 =
        sqlx::query_scalar("SELECT version FROM ai_upstream_supplier WHERE id = $1")
            .bind(SUPPLIER_ID)
            .fetch_one(pool)
            .await
            .expect("load supplier version");
    assert_eq!(7, supplier_version);

    let endpoint_versions: Vec<i64> =
        sqlx::query_scalar("SELECT version FROM ai_upstream_supplier_endpoint ORDER BY id ASC")
            .fetch_all(pool)
            .await
            .expect("load endpoint versions");
    assert_eq!(vec![11, 12], endpoint_versions);

    let account_versions: Vec<i64> =
        sqlx::query_scalar("SELECT version FROM ai_upstream_account ORDER BY id ASC")
            .fetch_all(pool)
            .await
            .expect("load account versions");
    assert_eq!(vec![21, 22], account_versions);
}

struct PostgresTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
}

impl PostgresTestContext {
    async fn new(label: &str) -> Option<Self> {
        let database_url = match env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping PostgreSQL invocation telemetry test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = format!(
            "test_{}_{}_{}",
            label,
            std::process::id(),
            sdkwork_utils_rust::now().timestamp_millis().unsigned_abs()
        );
        let quoted_schema = quote_identifier(&schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .expect("connect PostgreSQL admin pool");
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE SCHEMA {quoted_schema}"
        )))
        .execute(&admin_pool)
        .await
        .expect("create test schema");
        admin_pool.close().await;

        let schema_for_connections = schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(4)
            .after_connect(move |connection, _metadata| {
                let schema = schema_for_connections.clone();
                Box::pin(async move {
                    sqlx::query(sqlx::AssertSqlSafe(format!(
                        "SET search_path TO {}",
                        quote_identifier(&schema)
                    )))
                    .execute(&mut *connection)
                    .await?;
                    Ok(())
                })
            })
            .connect(&database_url)
            .await
            .expect("connect PostgreSQL test pool");
        sqlx::raw_sql(include_str!(
            "../../../database/ddl/baseline/postgres/0001_clawrouter_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create ClawRouter schema");
        Some(Self {
            pool,
            database_url,
            schema,
        })
    }

    async fn cleanup(self) {
        self.pool.close().await;
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&self.database_url)
            .await
            .expect("reconnect PostgreSQL admin pool");
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&self.schema)
        )))
        .execute(&admin_pool)
        .await
        .expect("drop test schema");
        admin_pool.close().await;
    }
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
