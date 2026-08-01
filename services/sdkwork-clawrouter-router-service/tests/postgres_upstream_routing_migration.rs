use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const RECONCILIATION_MIGRATION: &str = include_str!(
    "../../../database/migrations/postgres/0005_reconcile_upstream_supplier_routing.up.sql"
);

#[tokio::test]
async fn migration_repairs_legacy_columns_when_0003_history_already_exists() {
    let Some(context) = PostgresMigrationTestContext::new().await else {
        return;
    };

    sqlx::raw_sql(PARTIALLY_MIGRATED_SCHEMA)
        .execute(&context.pool)
        .await
        .unwrap();
    let fallback_binding_table = format!(
        "{}.iam_gateway_api_key_account_group",
        quote_identifier(&context.fallback_schema)
    );
    sqlx::query(sqlx::AssertSqlSafe(format!(
        "CREATE TABLE {fallback_binding_table} (id BIGINT PRIMARY KEY)"
    )))
    .execute(&context.pool)
    .await
    .unwrap();
    sqlx::query(sqlx::AssertSqlSafe(format!(
        "INSERT INTO {fallback_binding_table} (id) VALUES (999)"
    )))
    .execute(&context.pool)
    .await
    .unwrap();
    sqlx::raw_sql(RECONCILIATION_MIGRATION)
        .execute(&context.pool)
        .await
        .unwrap();

    for (table, canonical_column, retired_column) in [
        ("ai_pricing_rule", "supplier_code", "provider_code"),
        ("ai_pricing_rule", "account_id", "channel_id"),
        ("ai_quota_policy", "account_group_id", "channel_group_id"),
        ("ai_request_trace", "supplier_id", "provider_id"),
        ("ai_request_trace", "account_id", "channel_id"),
        (
            "ai_routing_decision_log",
            "selected_supplier_id",
            "selected_provider_id",
        ),
        (
            "ai_routing_rule",
            "candidate_account_groups",
            "candidate_channels",
        ),
        ("ai_usage", "supplier_id", "provider_id"),
        ("ai_usage", "account_id", "channel_id"),
        (
            "iam_gateway_api_key",
            "account_group_id",
            "channel_group_id",
        ),
    ] {
        assert!(column_exists(&context.pool, table, canonical_column).await);
        assert!(!column_exists(&context.pool, table, retired_column).await);
    }

    assert!(table_exists(&context.pool, "iam_gateway_api_key_account_group").await);
    assert!(!table_exists(&context.pool, "iam_gateway_api_key_channel_group").await);
    assert!(!table_exists(&context.pool, "ai_usage_service_provider_edge").await);

    let binding = sqlx::query(
        "SELECT account_group_id, account_group_code FROM iam_gateway_api_key_account_group WHERE id = 1",
    )
    .fetch_one(&context.pool)
    .await
    .unwrap();
    assert_eq!(30_i64, binding.get::<i64, _>("account_group_id"));
    assert_eq!("group-a", binding.get::<String, _>("account_group_code"));

    let pricing = sqlx::query("SELECT supplier_code, account_id FROM ai_pricing_rule WHERE id = 1")
        .fetch_one(&context.pool)
        .await
        .unwrap();
    assert_eq!("supplier-a", pricing.get::<String, _>("supplier_code"));
    assert_eq!(10_i64, pricing.get::<i64, _>("account_id"));

    let decision = sqlx::query(
        "SELECT selected_supplier_id, selected_account_id, selected_credential_id FROM ai_routing_decision_log WHERE id = 1",
    )
    .fetch_one(&context.pool)
    .await
    .unwrap();
    assert_eq!(20_i64, decision.get::<i64, _>("selected_supplier_id"));
    assert_eq!(10_i64, decision.get::<i64, _>("selected_account_id"));
    assert_eq!(
        None,
        decision.get::<Option<i64>, _>("selected_credential_id")
    );

    let fallback_decoy_id = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(format!(
        "SELECT id FROM {fallback_binding_table}"
    )))
    .fetch_one(&context.pool)
    .await
    .unwrap();
    assert_eq!(999_i64, fallback_decoy_id);

    for table in ["ai_request_trace", "ai_usage"] {
        let row = sqlx::query(sqlx::AssertSqlSafe(format!(
            "SELECT supplier_id, account_id FROM {table} WHERE id = 1"
        )))
        .fetch_one(&context.pool)
        .await
        .unwrap();
        assert_eq!(20_i64, row.get::<i64, _>("supplier_id"));
        assert_eq!(10_i64, row.get::<i64, _>("account_id"));
    }

    let history = sqlx::query(
        "SELECT applied_by, execution_ms FROM ops_schema_migration_history WHERE module_id = 'clawrouter' AND version = '0003'",
    )
    .fetch_one(&context.pool)
    .await
    .unwrap();
    assert_eq!(
        "sdkwork-dev-manual-fix",
        history.get::<String, _>("applied_by")
    );
    assert_eq!(0_i64, history.get::<i64, _>("execution_ms"));

    context.cleanup().await;
}

struct PostgresMigrationTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
    fallback_schema: String,
}

impl PostgresMigrationTestContext {
    async fn new() -> Option<Self> {
        let database_url = match env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping Postgres migration test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = unique_schema_name();
        let fallback_schema = format!("{schema}_fallback");
        let quoted_schema = quote_identifier(&schema);
        let quoted_fallback_schema = quote_identifier(&fallback_schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE SCHEMA {quoted_schema}"
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE SCHEMA {quoted_fallback_schema}"
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        admin_pool.close().await;

        let schema_for_connections = schema.clone();
        let fallback_schema_for_connections = fallback_schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(2)
            .after_connect(move |connection, _metadata| {
                let schema = schema_for_connections.clone();
                let fallback_schema = fallback_schema_for_connections.clone();
                Box::pin(async move {
                    sqlx::query(sqlx::AssertSqlSafe(format!(
                        "SET search_path TO {}, {}",
                        quote_identifier(&schema),
                        quote_identifier(&fallback_schema)
                    )))
                    .execute(&mut *connection)
                    .await?;
                    Ok(())
                })
            })
            .connect(&database_url)
            .await
            .unwrap();

        Some(Self {
            pool,
            database_url,
            schema,
            fallback_schema,
        })
    }

    async fn cleanup(self) {
        let Self {
            pool,
            database_url,
            schema,
            fallback_schema,
        } = self;
        pool.close().await;
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&schema)
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&fallback_schema)
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        admin_pool.close().await;
    }
}

async fn column_exists(pool: &PgPool, table: &str, column: &str) -> bool {
    sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS (
            SELECT 1
              FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = $1
               AND column_name = $2
        )
        "#,
    )
    .bind(table)
    .bind(column)
    .fetch_one(pool)
    .await
    .unwrap()
}

async fn table_exists(pool: &PgPool, table: &str) -> bool {
    sqlx::query_scalar::<_, bool>("SELECT to_regclass($1) IS NOT NULL")
        .bind(table)
        .fetch_one(pool)
        .await
        .unwrap()
}

fn unique_schema_name() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    format!("sdkwork_claw_migration_{}_{}", std::process::id(), nanos)
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

const PARTIALLY_MIGRATED_SCHEMA: &str = r#"
CREATE TABLE ops_schema_migration_history (
    module_id TEXT NOT NULL,
    version TEXT NOT NULL,
    applied_by TEXT NOT NULL,
    execution_ms BIGINT NOT NULL,
    PRIMARY KEY (module_id, version)
);
INSERT INTO ops_schema_migration_history
    (module_id, version, applied_by, execution_ms)
VALUES
    ('clawrouter', '0003', 'sdkwork-dev-manual-fix', 0);

CREATE TABLE ai_upstream_account (
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    supplier_code VARCHAR(64) NOT NULL,
    PRIMARY KEY (tenant_id, organization_id, id)
);
INSERT INTO ai_upstream_account
    (tenant_id, organization_id, id, supplier_id, supplier_code)
VALUES
    (1, 0, 10, 20, 'supplier-a');

CREATE TABLE ai_pricing_rule (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    provider_code VARCHAR(64),
    channel_id BIGINT
);
INSERT INTO ai_pricing_rule VALUES (1, 1, 0, 'legacy-provider', 10);

CREATE TABLE ai_quota_policy (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    model VARCHAR(256),
    channel_group_id BIGINT,
    status INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_ai_quota_policy_model_channel_group
    ON ai_quota_policy (tenant_id, organization_id, model, channel_group_id, status);
CREATE INDEX idx_ai_quota_policy_model_account_group
    ON ai_quota_policy (tenant_id, organization_id, model, channel_group_id, status);
INSERT INTO ai_quota_policy VALUES (1, 1, 0, 'model-a', 30, 1);

CREATE TABLE ai_request_trace (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    legacy_api_key_id BIGINT,
    channel_group_id BIGINT,
    channel_group_snapshot VARCHAR(128),
    provider_id BIGINT,
    channel_id BIGINT,
    channel_name_snapshot VARCHAR(128)
);
INSERT INTO ai_request_trace VALUES (1, 1, 0, NULL, 30, 'group-a', 999, 10, 'account-a');

CREATE TABLE ai_routing_decision_log (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    legacy_api_key_id BIGINT,
    selected_provider_id BIGINT,
    selected_channel_id BIGINT,
    selected_account_id BIGINT
);
INSERT INTO ai_routing_decision_log VALUES (1, 1, 0, NULL, 999, 10, NULL);

CREATE TABLE ai_routing_rule (
    id BIGINT PRIMARY KEY,
    candidate_channels JSONB
);
INSERT INTO ai_routing_rule VALUES (1, '[30]'::jsonb);

CREATE TABLE ai_usage (
    id BIGINT,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    legacy_api_key_id BIGINT,
    channel_group_id BIGINT,
    channel_group_snapshot VARCHAR(128),
    provider_id BIGINT,
    channel_id BIGINT,
    cost_amount NUMERIC(38, 12),
    unit_price_snapshot NUMERIC(38, 12),
    CONSTRAINT ai_usage_fact_pkey PRIMARY KEY (id)
);
INSERT INTO ai_usage VALUES (1, 1, 0, NULL, 30, 'group-a', 999, 10, 0, NULL);

CREATE TABLE ai_upstream_object_route (
    id BIGINT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    account_group_id BIGINT,
    supplier_code VARCHAR(64),
    account_id BIGINT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE iam_gateway_api_key (
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    legacy_api_key_id BIGINT,
    channel_group_id BIGINT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_iam_gateway_api_key_ai_channel_group_status
    ON iam_gateway_api_key (tenant_id, organization_id, channel_group_id, status, updated_at, id);
CREATE INDEX idx_iam_gateway_api_key_ai_account_group_status
    ON iam_gateway_api_key (tenant_id, organization_id, channel_group_id, status, updated_at, id);
INSERT INTO iam_gateway_api_key VALUES (1, 'key-1', 1, 0, NULL, 30, 1, CURRENT_TIMESTAMP);

CREATE TABLE iam_gateway_api_key_channel_group (
    id BIGINT,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL DEFAULT 0,
    owner_type INTEGER,
    owner_id BIGINT,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    api_key_id BIGINT NOT NULL,
    channel_group_id BIGINT NOT NULL,
    channel_group_code VARCHAR(64),
    binding_role VARCHAR(32) NOT NULL DEFAULT 'route',
    routing_strategy VARCHAR(32) NOT NULL DEFAULT 'auto',
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT iam_gateway_api_key_channel_group_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX uk_iam_gateway_api_key_channel_group_uuid
    ON iam_gateway_api_key_channel_group (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uk_iam_gateway_api_key_channel_group_binding
    ON iam_gateway_api_key_channel_group
        (tenant_id, organization_id, api_key_id, channel_group_id, binding_role)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_iam_gateway_api_key_channel_group_active
    ON iam_gateway_api_key_channel_group
        (tenant_id, organization_id, api_key_id, status, priority, weight, id);
CREATE INDEX idx_iam_gateway_api_key_channel_group_group
    ON iam_gateway_api_key_channel_group
        (tenant_id, organization_id, channel_group_id, status, priority, id);
INSERT INTO iam_gateway_api_key_channel_group
    (id, uuid, tenant_id, organization_id, user_id, api_key_id, channel_group_id, channel_group_code, binding_role)
VALUES
    (1, 'binding-1', 1, 0, 100, 1, 30, 'group-a', 'route');

CREATE TABLE iam_gateway_api_key_account_group (
    id BIGINT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL DEFAULT 0,
    owner_type INTEGER,
    owner_id BIGINT,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    api_key_id BIGINT NOT NULL,
    account_group_id BIGINT NOT NULL,
    account_group_code VARCHAR(64),
    binding_role VARCHAR(32) NOT NULL DEFAULT 'route',
    routing_strategy VARCHAR(32) NOT NULL DEFAULT 'auto',
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE TABLE ai_usage_service_provider_edge (id BIGINT PRIMARY KEY);
"#;
