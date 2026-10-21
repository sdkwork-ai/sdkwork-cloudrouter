//! Live-PostgreSQL contract for the runtime invocation reaper.
//!
//! A stream producer that exceeds the hard shutdown deadline is killed before
//! it writes its terminal event. The reaper must close those invocations
//! exactly once: mark them failed and append the missing `runtime.failed`
//! event. Fresh invocations and invocations that already own a terminal event
//! must be left alone.
//!
//! Skipped unless `SDKWORK_DATABASE_URL` is set.

use std::env;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresRuntimeInvocationReaperStore;
use sdkwork_cloudrouter_router_service::ports::RuntimeInvocationReaperStore;
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const BASELINE: &str =
    include_str!("../../../database/ddl/baseline/postgres/0001_cloudrouter_baseline.sql");
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
                    "skipping runtime reaper test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock is after the epoch")
            .as_nanos();
        let schema = format!("cloudrouter_runtime_reaper_{label}_{nanos}");
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

async fn seed_invocation(pool: &PgPool, id: i64, status: &str, started_at_sql: &str, uuid: &str) {
    sqlx::query(sqlx::AssertSqlSafe(format!(
        r#"
        INSERT INTO ai_runtime_invocation
            (id, uuid, tenant_id, organization_id, user_id, invocation_no,
             invocation_type, runtime, status, started_at, created_at,
             conversation_id)
        VALUES ($1, $2, $3, $4, $5, 1, 'chat_response', 'openai_compatible',
                $6, {started_at_sql}, CURRENT_TIMESTAMP,
                'conversation-' || CAST($1 AS TEXT))
        "#
    )))
    .bind(id)
    .bind(uuid)
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(USER_ID)
    .bind(status)
    .execute(pool)
    .await
    .expect("seed runtime invocation");
}

#[tokio::test]
async fn reaper_closes_abandoned_invocations_once_and_leaves_live_ones_alone() {
    let Some(context) = PostgresTestContext::new("reap").await else {
        return;
    };
    // Abandoned two hours ago: replays the hard-deadline kill.
    seed_invocation(
        &context.pool,
        9_001,
        "streaming",
        "CURRENT_TIMESTAMP - INTERVAL '2 hours'",
        "runtime-reaper-abandoned",
    )
    .await;
    // Still inside the threshold: must not be touched.
    seed_invocation(
        &context.pool,
        9_002,
        "running",
        "CURRENT_TIMESTAMP",
        "runtime-reaper-fresh",
    )
    .await;
    // Already terminal: has its own terminal event and must not gain a second.
    seed_invocation(
        &context.pool,
        9_003,
        "completed",
        "CURRENT_TIMESTAMP - INTERVAL '2 hours'",
        "runtime-reaper-completed",
    )
    .await;
    sqlx::query(
        r#"
        INSERT INTO ai_runtime_invocation_event
            (id, uuid, tenant_id, organization_id, user_id, invocation_id,
             event_no, event_type, event_source, payload_json)
        VALUES (99_003, 'runtime-reaper-terminal-event', $1, $2, $3, 9_003,
                1, 'runtime.completed', 'cloudrouter.runtime', '{}'::jsonb)
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(USER_ID)
    .execute(&context.pool)
    .await
    .expect("seed completed terminal event");

    let store = PostgresRuntimeInvocationReaperStore::new(context.pool.clone());
    let reaped = store
        .reap_stale(Duration::from_secs(15 * 60), 10)
        .await
        .expect("reap stale invocations");
    assert_eq!(1, reaped, "only the abandoned invocation may be reaped");

    let abandoned = sqlx::query(
        "SELECT status, error_code, completed_at FROM ai_runtime_invocation WHERE id = 9_001",
    )
    .fetch_one(&context.pool)
    .await
    .expect("read abandoned invocation");
    assert_eq!("failed", abandoned.get::<String, _>("status"));
    assert_eq!(
        "runtime_invocation_abandoned",
        abandoned.get::<String, _>("error_code")
    );
    assert!(abandoned
        .get::<Option<chrono::DateTime<chrono::Utc>>, _>("completed_at")
        .is_some());

    let terminal_events: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_runtime_invocation_event \
         WHERE invocation_id = 9_001 AND event_type = 'runtime.failed'",
    )
    .fetch_one(&context.pool)
    .await
    .expect("count reaped terminal events");
    assert_eq!(1, terminal_events);

    let fresh_status: String =
        sqlx::query_scalar("SELECT status FROM ai_runtime_invocation WHERE id = 9_002")
            .fetch_one(&context.pool)
            .await
            .expect("read fresh invocation");
    assert_eq!("running", fresh_status);

    let completed_events: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_runtime_invocation_event WHERE invocation_id = 9_003",
    )
    .fetch_one(&context.pool)
    .await
    .expect("count completed events");
    assert_eq!(1, completed_events, "terminal invocation keeps one event");

    let replayed = store
        .reap_stale(Duration::from_secs(15 * 60), 10)
        .await
        .expect("replay reaper");
    assert_eq!(0, replayed, "replayed sweep must be idempotent");

    context.cleanup().await;
}
