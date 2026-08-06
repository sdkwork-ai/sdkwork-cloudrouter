//! Live-PostgreSQL end-to-end tests for usage settlement (S3).
//!
//! Usage settlement now debits the USER points wallet exclusively through the
//! account-domain port (`PostgresCommerceAccountStore::append_ledger_entry`)
//! on the shared commerce pool; the legacy `commerce_account` direct-write SQL
//! is gone. These tests exercise the happy path, insufficient balance,
//! idempotent replay, and zero-amount deferral against a real database.
//!
//! Skipped unless `SDKWORK_DATABASE_URL` is set (same convention as
//! `postgres_transaction_integration`).

use sdkwork_account_repository_sqlx::PostgresCommerceAccountStore;
use sdkwork_account_service::AppendLedgerEntryCommand;
use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresUsageSettlementStore;
use sdkwork_cloudrouter_router_service::ports::{UsageSettlementCommand, UsageSettlementStore as _};
use sdkwork_contract_service::{
    CommerceAccountAssetType, CommerceLedgerDirection, CommerceMoney, CommerceRequestHash,
};
use sdkwork_utils_rust::sha256_hash;
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};
use std::env;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const ACCOUNT_BASELINE: &str = include_str!(
    "../../../../sdkwork-account/database/ddl/baseline/postgres/0001_account_baseline.sql"
);
const AI_METERING_BASELINE: &str = include_str!(
    "../../../database/modules/ai-metering/ddl/baseline/postgres/0001_ai_metering_baseline.sql"
);

const TENANT_ID: i64 = 100_001;
const ORGANIZATION_ID: i64 = 0;
const USER_ID: i64 = 30;

#[tokio::test]
async fn settlement_debits_user_points_wallet_and_marks_facts_settled() {
    let Some(ctx) = PostgresTestContext::new("usage_settlement_debit").await else {
        return;
    };
    let store = PostgresCommerceAccountStore::new(ctx.pool.clone());
    credit_points(&ctx.pool, USER_ID, "settle-e2e-credit-1", 1000)
        .await
        .expect("credit points wallet");
    insert_usage_fact(&ctx.pool, 1, USER_ID, "settle-e2e-fact-1", "10.000000")
        .await
        .expect("insert pending usage fact");
    insert_usage_fact(&ctx.pool, 2, USER_ID, "settle-e2e-fact-2", "50.000000")
        .await
        .expect("insert pending usage fact");

    let settlement = PostgresUsageSettlementStore::new(ctx.pool.clone(), store);
    let outcome = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("settle pending usage");

    assert_eq!(2, outcome.settled_count);
    assert_eq!(0, outcome.failed_count);
    assert_eq!(60, outcome.debited_points);

    let (status, settled_at) = usage_fact_settlement(&ctx.pool, 1).await;
    assert_eq!(2, status, "usage fact must be marked settled");
    assert!(settled_at.is_some(), "successful settlement must record settled_at");

    let balance = points_balance(&ctx.pool, USER_ID).await;
    assert_eq!(940, balance, "wallet must be debited through the account ledger");

    let debits = ledger_debit_total(&ctx.pool, USER_ID).await;
    assert_eq!(
        60,
        debits,
        "exactly one usage_settlement ledger entry must exist for the batch"
    );

    ctx.cleanup().await;
}

#[tokio::test]
async fn settlement_marks_insufficient_balance_failed() {
    let Some(ctx) = PostgresTestContext::new("usage_settlement_insufficient").await else {
        return;
    };
    // No wallet exists for USER_ID + 1; a Debit on a missing account is an
    // insufficient-balance failure, not a phantom account creation.
    insert_usage_fact(&ctx.pool, 1, USER_ID + 1, "settle-e2e-poor-1", "5.000000")
        .await
        .expect("insert pending usage fact");

    let settlement = PostgresUsageSettlementStore::new(
        ctx.pool.clone(),
        PostgresCommerceAccountStore::new(ctx.pool.clone()),
    );
    let outcome = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("settle pending usage");

    assert_eq!(0, outcome.settled_count);
    assert_eq!(1, outcome.failed_count);
    assert_eq!(0, outcome.debited_points);

    let row = sqlx::query(
        "SELECT settlement_status, failure_code FROM ai_metering_usage WHERE id = 1",
    )
    .fetch_one(&ctx.pool)
    .await
    .expect("read usage fact settlement state");
    assert_eq!(3_i32, row.get::<i32, _>("settlement_status"));
    assert_eq!("INSUFFICIENT_POINTS", row.get::<String, _>("failure_code"));

    ctx.cleanup().await;
}

#[tokio::test]
async fn settlement_replays_idempotently_without_double_debit() {
    let Some(ctx) = PostgresTestContext::new("usage_settlement_replay").await else {
        return;
    };
    credit_points(&ctx.pool, USER_ID, "settle-e2e-credit-2", 1000)
        .await
        .expect("credit points wallet");
    insert_usage_fact(&ctx.pool, 1, USER_ID, "settle-e2e-fact-3", "20.000000")
        .await
        .expect("insert pending usage fact");

    let settlement = PostgresUsageSettlementStore::new(
        ctx.pool.clone(),
        PostgresCommerceAccountStore::new(ctx.pool.clone()),
    );
    let first = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("first settlement run");
    assert_eq!(1, first.settled_count);
    assert_eq!(20, first.debited_points);

    // Second run must settle nothing and must not debit the wallet again.
    let second = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("second settlement run");
    assert_eq!(0, second.settled_count);
    assert_eq!(0, second.debited_points);

    let balance = points_balance(&ctx.pool, USER_ID).await;
    assert_eq!(980, balance, "wallet must be debited exactly once");
    let debits = ledger_debit_total(&ctx.pool, USER_ID).await;
    assert_eq!(20, debits, "only one usage_settlement ledger entry may exist");

    ctx.cleanup().await;
}

#[tokio::test]
async fn settlement_defers_zero_amount_groups() {
    let Some(ctx) = PostgresTestContext::new("usage_settlement_zero").await else {
        return;
    };
    insert_usage_fact(&ctx.pool, 1, USER_ID, "settle-e2e-zero-1", "0.000000")
        .await
        .expect("insert zero amount usage fact");

    let settlement = PostgresUsageSettlementStore::new(
        ctx.pool.clone(),
        PostgresCommerceAccountStore::new(ctx.pool.clone()),
    );
    let outcome = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("settle pending usage");

    assert_eq!(0, outcome.settled_count);
    assert_eq!(0, outcome.failed_count);
    assert_eq!(0, outcome.debited_points);

    let (status, _) = usage_fact_settlement(&ctx.pool, 1).await;
    assert_eq!(0, status, "micro zero-amount facts must stay pending for deferral");

    ctx.cleanup().await;
}

fn settlement_command(limit: i64) -> UsageSettlementCommand {
    UsageSettlementCommand {
        tenant_id: TENANT_ID,
        organization_id: ORGANIZATION_ID,
        limit,
        requested_at: "2026-08-06T00:00:00Z".to_owned(),
    }
}

async fn credit_points(pool: &PgPool, user_id: i64, idempotency_key: &str, points: i64) -> Result<(), String> {
    let store = PostgresCommerceAccountStore::new(pool.clone());
    let append = AppendLedgerEntryCommand {
        tenant_id: TENANT_ID.to_string(),
        organization_id: Some(ORGANIZATION_ID.to_string()),
        owner_user_id: user_id.to_string(),
        account_id: String::new(),
        asset_type: CommerceAccountAssetType::Points,
        currency_code: Some("POINT".to_owned()),
        direction: CommerceLedgerDirection::Credit,
        amount: {
            let rendered = points.to_string();
            eprintln!("DEBUG credit points value={rendered}");
            CommerceMoney::new(&rendered).map_err(|error| error.to_string())?
        },
        business_type: "points_recharge".to_owned(),
        transaction_no: idempotency_key.to_owned(),
        request_no: idempotency_key.to_owned(),
        idempotency_key: idempotency_key.to_owned(),
        owner_type: None,
        account_purpose: None,
        expires_at: None,
        reversed_ledger_id: None,
    };
    let digest = sha256_hash(idempotency_key.as_bytes());
    let request_hash = CommerceRequestHash::new(&digest).map_err(|error| error.message().to_owned())?;
    store
        .append_ledger_entry(append, request_hash)
        .await
        .map(|_| ())
        .map_err(|error| {
            eprintln!("DEBUG append error code={} message={}", error.code(), error.message());
            error.message().to_owned()
        })
}

async fn insert_usage_fact(
    pool: &PgPool,
    id: i64,
    user_id: i64,
    request_id: &str,
    amount: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO ai_metering_usage
            (id, uuid, tenant_id, organization_id, user_id, request_id, idempotency_key,
             status, catalog_key, usage_type, billing_meter_code, billable_quantity,
             currency, customer_charge_amount, occurred_at, settlement_status)
        VALUES
            ($1, $2, $3, $4, $5, $6, $6, 1, 'gpt-4o', 1, 'tokens', 1, 'USD', CAST($7 AS NUMERIC),
             CURRENT_TIMESTAMP, 0)
        "#,
    )
    .bind(id)
    .bind(format!("uuid-{request_id}"))
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(user_id)
    .bind(request_id)
    .bind(amount)
    .execute(pool)
    .await?;
    Ok(())
}

async fn usage_fact_settlement(pool: &PgPool, id: i64) -> (i32, Option<String>) {
    let row = sqlx::query(
        "SELECT settlement_status, settled_at FROM ai_metering_usage WHERE id = $1",
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .expect("read usage fact settlement state");
    (
        row.get::<i32, _>("settlement_status"),
        row.get::<Option<String>, _>("settled_at"),
    )
}

async fn points_balance(pool: &PgPool, user_id: i64) -> i64 {
    let row = sqlx::query(
        r#"
        SELECT available_amount
        FROM acct_account
        WHERE tenant_id = $1
          AND organization_id = $2
          AND owner_type = 'USER'
          AND owner_id = $3
          AND asset_code = 'points'
          AND account_purpose = 'GENERAL'
          AND status = 1
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(user_id)
    .fetch_one(pool)
    .await
    .expect("read points wallet balance");
    row.get::<i64, _>("available_amount")
}

async fn ledger_debit_total(pool: &PgPool, user_id: i64) -> i64 {
    let row = sqlx::query(
        r#"
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM acct_ledger_entry
        WHERE tenant_id = $1
          AND organization_id = $2
          AND owner_id = $3
          AND business_type = 'usage_settlement'
          AND direction = 'debit'
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(user_id)
    .fetch_one(pool)
    .await
    .expect("read usage settlement ledger entries");
    row.get::<i64, _>("total")
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
                    "skipping usage settlement e2e test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = format!("sdkwork_usage_settlement_e2e_{label}");
        let quoted_schema = quote_identifier(&schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {quoted_schema} CASCADE"
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE SCHEMA {quoted_schema}"
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
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
            .unwrap();
        create_schema(&pool).await;

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
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&schema)
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        admin_pool.close().await;
    }
}

async fn create_schema(pool: &PgPool) {
    for baseline in [ACCOUNT_BASELINE, AI_METERING_BASELINE] {
        for statement in split_statements(baseline) {
            sqlx::query(sqlx::AssertSqlSafe(statement.to_owned()))
                .execute(pool)
                .await
                .expect("apply baseline DDL");
        }
    }
}

fn split_statements(baseline: &str) -> Vec<String> {
    // Drop full-line `--` comments first so comment text containing `;` never
    // splits a real statement.
    let without_comments = baseline
        .lines()
        .filter(|line| !line.trim_start().starts_with("--"))
        .collect::<Vec<_>>()
        .join("\n");
    without_comments
        .split(';')
        .map(str::trim)
        .filter(|statement| !statement.is_empty())
        .map(str::to_owned)
        .collect()
}

fn quote_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}
