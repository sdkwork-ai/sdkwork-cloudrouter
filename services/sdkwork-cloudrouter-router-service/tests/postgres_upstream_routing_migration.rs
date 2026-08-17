use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const BASELINE_DDL: &str =
    include_str!("../../../database/ddl/baseline/postgres/0001_cloudrouter_baseline.sql");

#[tokio::test]
async fn baseline_initializes_canonical_upstream_routing_schema() {
    let Some(context) = PostgresMigrationTestContext::new().await else {
        return;
    };

    // Initialization state: the consolidated baseline carries the full DDL snapshot
    // (previous migrations were folded into it), so applying it to an empty schema
    // must produce the canonical post-0005 routing shape without touching the
    // fallback schema. Folded migrations also touch cross-module tables that are
    // owned by sibling modules (sdkwork-models ai_resource, storage object_provider);
    // composite deployments initialize those modules first, so this test creates
    // minimal stubs to stand in for them.
    sqlx::raw_sql("CREATE TABLE ai_resource (id BIGINT PRIMARY KEY)")
        .execute(&context.pool)
        .await
        .unwrap();
    sqlx::raw_sql("CREATE TABLE object_provider (id BIGINT PRIMARY KEY)")
        .execute(&context.pool)
        .await
        .unwrap();
    sqlx::raw_sql(BASELINE_DDL)
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

    for (table, canonical_column, retired_column) in [
        ("ai_quota_policy", "account_group_id", "channel_group_id"),
        ("ai_metering_request_trace", "supplier_id", "provider_id"),
        ("ai_metering_request_trace", "account_id", "channel_id"),
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
        ("ai_metering_usage", "supplier_id", "provider_id"),
        ("ai_metering_usage", "account_id", "channel_id"),
        (
            "iam_gateway_api_key",
            "account_group_id",
            "channel_group_id",
        ),
    ] {
        assert!(
            column_exists(&context.pool, table, canonical_column).await,
            "{table}.{canonical_column} must exist after baseline initialization"
        );
        assert!(
            !column_exists(&context.pool, table, retired_column).await,
            "{table}.{retired_column} must not exist after baseline initialization"
        );
    }

    assert!(table_exists(&context.pool, "iam_gateway_api_key_account_group").await);
    assert!(!table_exists(&context.pool, "iam_gateway_api_key_channel_group").await);
    assert!(!table_exists(&context.pool, "ai_metering_usage_service_provider_edge").await);

    let fallback_decoy_id = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(format!(
        "SELECT id FROM {fallback_binding_table}"
    )))
    .fetch_one(&context.pool)
    .await
    .unwrap();
    assert_eq!(999_i64, fallback_decoy_id);

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
    format!(
        "sdkwork_cloudrouter_migration_{}_{}",
        std::process::id(),
        nanos
    )
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
