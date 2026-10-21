//! Live-PostgreSQL contract for soft-delete active uniqueness.
//!
//! `iam_user_preference` and `integration_webhook_endpoint` are soft-deleted,
//! so their natural keys must be unique among active rows only. Before the
//! `active_unique` policy a user could delete a webhook endpoint and never
//! re-create the same `endpoint_code`, because the unique index also covered
//! deleted rows.
//!
//! Skipped unless `SDKWORK_DATABASE_URL` is set (same convention as the other
//! PostgreSQL integration tests).

use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const BASELINE: &str =
    include_str!("../../../database/ddl/baseline/postgres/0001_cloudrouter_baseline.sql");
const ACTIVE_UNIQUE_MIGRATION: &str = include_str!(
    "../../../database/migrations/postgres/0048_soft_delete_active_unique_indexes.up.sql"
);
const TENANT_ID: i64 = 100_001;
const ORGANIZATION_ID: i64 = 0;
const USER_ID: i64 = 30;

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
                    "skipping soft-delete active unique test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock is after the epoch")
            .as_nanos();
        let schema = format!("cloudrouter_soft_delete_{label}_{nanos}");
        let quoted_schema = quote_identifier(&schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .expect("connect admin pool");
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {quoted_schema} CASCADE"
        )))
        .execute(&admin_pool)
        .await
        .expect("drop test schema");
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE SCHEMA {quoted_schema}"
        )))
        .execute(&admin_pool)
        .await
        .expect("create test schema");
        admin_pool.close().await;

        let schema_for_connections = schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(2)
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
            .expect("connect scoped pool");

        sqlx::raw_sql(BASELINE)
            .execute(&pool)
            .await
            .expect("apply root baseline");
        sqlx::raw_sql(ACTIVE_UNIQUE_MIGRATION)
            .execute(&pool)
            .await
            .expect("apply active-unique migration (idempotent after baseline)");

        Some(Self {
            pool,
            database_url,
            schema,
        })
    }

    async fn cleanup(self) {
        let Self {
            pool,
            database_url,
            schema,
        } = self;
        pool.close().await;
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .expect("connect admin pool for cleanup");
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&schema)
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

fn assert_unique_violation(error: &sqlx::Error) {
    match error {
        sqlx::Error::Database(database_error) => {
            assert_eq!(
                Some("23505"),
                database_error.code().as_deref(),
                "expected a unique violation, got: {error}"
            );
        }
        other => panic!("expected a unique violation, got: {other}"),
    }
}

#[tokio::test]
async fn deleted_user_preference_and_webhook_codes_are_reusable() {
    let Some(context) = PostgresTestContext::new("reusable").await else {
        return;
    };

    sqlx::query(
        r#"
        INSERT INTO iam_user_preference
            (id, uuid, tenant_id, organization_id, user_id, owner_id, language, timezone)
        VALUES (1, 'pref-1', $1, $2, $3, $3, 'en-US', 'UTC')
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(USER_ID)
    .execute(&context.pool)
    .await
    .expect("insert preference");

    let duplicate = sqlx::query(
        r#"
        INSERT INTO iam_user_preference
            (id, uuid, tenant_id, organization_id, user_id, owner_id)
        VALUES (2, 'pref-2', $1, $2, $3, $3)
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(USER_ID)
    .execute(&context.pool)
    .await
    .expect_err("two active preferences for one user must conflict");
    assert_unique_violation(&duplicate);

    sqlx::query("UPDATE iam_user_preference SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1")
        .execute(&context.pool)
        .await
        .expect("soft delete preference");

    sqlx::query(
        r#"
        INSERT INTO iam_user_preference
            (id, uuid, tenant_id, organization_id, user_id, owner_id)
        VALUES (3, 'pref-3', $1, $2, $3, $3)
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(USER_ID)
    .execute(&context.pool)
    .await
    .expect("a deleted preference must not block re-creation");

    sqlx::query(
        r#"
        INSERT INTO integration_webhook_endpoint
            (id, uuid, tenant_id, organization_id, user_id, owner_id, endpoint_code, name)
        VALUES (1, 'hook-1', $1, $2, $3, $3, 'console-events', 'Console events')
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(USER_ID)
    .execute(&context.pool)
    .await
    .expect("insert webhook endpoint");

    sqlx::query(
        "UPDATE integration_webhook_endpoint SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1",
    )
    .execute(&context.pool)
    .await
    .expect("soft delete webhook endpoint");

    sqlx::query(
        r#"
        INSERT INTO integration_webhook_endpoint
            (id, uuid, tenant_id, organization_id, user_id, owner_id, endpoint_code, name)
        VALUES (2, 'hook-2', $1, $2, $3, $3, 'console-events', 'Console events')
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(USER_ID)
    .execute(&context.pool)
    .await
    .expect("a deleted endpoint code must be reusable");

    let active = sqlx::query(
        "SELECT COUNT(*) AS count FROM integration_webhook_endpoint WHERE deleted_at IS NULL",
    )
    .fetch_one(&context.pool)
    .await
    .expect("count active endpoints")
    .get::<i64, _>("count");
    assert_eq!(1, active);

    context.cleanup().await;
}
