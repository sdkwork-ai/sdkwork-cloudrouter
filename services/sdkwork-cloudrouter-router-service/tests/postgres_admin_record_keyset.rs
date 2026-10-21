//! Live-PostgreSQL contract for the admin request-record keyset read model.
//!
//! The endpoint used to rank the whole tenant with `ROW_NUMBER()`, count with
//! `COUNT(*) OVER()`, and page with `OFFSET`. It now pages by the
//! `(started_at, id)` keyset. This test proves the cursor actually advances and
//! that the filters still restrict the page.
//!
//! Skipped unless `SDKWORK_DATABASE_URL` is set.

use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresAdminRecordStore;
use sdkwork_cloudrouter_router_service::ports::{
    AdminRecordCursor, AdminRecordStore, AdminRecordSubject, ListAdminRecordLogsQuery,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const BASELINE: &str =
    include_str!("../../../database/ddl/baseline/postgres/0001_cloudrouter_baseline.sql");
const TENANT_ID: i64 = 100_001;
const ORGANIZATION_ID: i64 = 0;

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
                    "skipping admin record keyset test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock is after the epoch")
            .as_nanos();
        let schema = format!("cloudrouter_admin_record_{label}_{nanos}");
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
        // `iam_user` is owned by the federated IAM module and is created before
        // the router module baseline in production; the record read model only
        // projects its display columns.
        sqlx::raw_sql(
            r#"
            CREATE TABLE IF NOT EXISTS iam_user (
                tenant_id TEXT NOT NULL,
                id TEXT NOT NULL,
                display_name TEXT,
                email TEXT,
                username TEXT
            );
            "#,
        )
        .execute(&pool)
        .await
        .expect("create iam_user projection");
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

fn subject() -> AdminRecordSubject {
    AdminRecordSubject {
        tenant_id: TENANT_ID,
        organization_id: ORGANIZATION_ID,
        operator_id: 30,
        operator_type: 1,
    }
}

fn query(page_size: i64, cursor: Option<AdminRecordCursor>) -> ListAdminRecordLogsQuery {
    ListAdminRecordLogsQuery {
        subject: subject(),
        page_size,
        cursor,
        user: None,
        token: None,
        model: None,
    }
}

async fn seed_trace(
    pool: &PgPool,
    id: i64,
    request_id: &str,
    user_id: i64,
    owner: &str,
    started_at: &str,
    http_status: i32,
) {
    sqlx::query(
        r#"
        INSERT INTO ai_metering_request_trace
            (id, uuid, tenant_id, organization_id, user_id, request_id, attempt_no,
             status, started_at, created_at, owner_name_snapshot, http_status,
             http_method, request_path, requested_model, provider_model, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, 1, 1, $7::timestamptz, $7::timestamptz,
                $8, $9, 'POST', '/v1/chat/completions', 'gpt-4o-mini', 'gpt-4o-mini',
                '{"userAgent":"Mozilla/5.0"}'::jsonb)
        "#,
    )
    .bind(id)
    .bind(format!("trace-{id}"))
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(user_id)
    .bind(request_id)
    .bind(started_at)
    .bind(owner)
    .bind(http_status)
    .execute(pool)
    .await
    .expect("seed request trace");
}

#[tokio::test]
async fn admin_record_store_pages_by_keyset_and_keeps_filters() {
    let _ = tracing_subscriber::fmt()
        .with_max_level(tracing::Level::ERROR)
        .with_test_writer()
        .try_init();
    let Some(context) = PostgresTestContext::new("keyset").await else {
        return;
    };
    seed_trace(
        &context.pool,
        1,
        "req-1",
        30,
        "Owner One",
        "2026-01-01T00:00:00Z",
        200,
    )
    .await;
    seed_trace(
        &context.pool,
        2,
        "req-2",
        31,
        "Owner Two",
        "2026-01-01T00:01:00Z",
        500,
    )
    .await;
    seed_trace(
        &context.pool,
        3,
        "req-3",
        30,
        "Owner One",
        "2026-01-01T00:02:00Z",
        200,
    )
    .await;

    let store = PostgresAdminRecordStore::new(context.pool.clone());
    let first = store
        .list_logs(query(2, None))
        .await
        .expect("first record page");
    assert_eq!(2, first.items.len());
    assert_eq!("req-3", first.items[0].request_id);
    assert_eq!("req-2", first.items[1].request_id);
    assert!(first.has_more, "three traces with page_size=2 must page");
    let cursor = first.next_cursor.expect("first page must expose a cursor");

    let second = store
        .list_logs(query(2, Some(cursor)))
        .await
        .expect("second record page");
    assert_eq!(1, second.items.len());
    assert_eq!("req-1", second.items[0].request_id);
    assert!(!second.has_more);
    assert!(second.next_cursor.is_none());

    let mut filtered = query(10, None);
    filtered.user = Some("owner one".to_owned());
    let filtered_page = store
        .list_logs(filtered)
        .await
        .expect("filtered record page");
    assert_eq!(2, filtered_page.items.len());
    assert_eq!("req-3", filtered_page.items[0].request_id);
    assert_eq!("req-1", filtered_page.items[1].request_id);

    context.cleanup().await;
}
