//! Live-PostgreSQL end-to-end tests for usage settlement (S3).
//!
//! Usage settlement debits the USER token-bank wallet exclusively through the
//! account-domain port (`PostgresCommerceAccountStore::append_ledger_entry`)
//! on the shared commerce pool; the legacy `commerce_account` direct-write SQL
//! is gone. These tests exercise the happy path, insufficient balance,
//! idempotent replay, and zero-amount deferral against a real database.
//!
//! Skipped unless `SDKWORK_DATABASE_URL` is set (same convention as
//! `postgres_transaction_integration`).

use chrono::{DateTime, Utc};
use sdkwork_account_service::AppendLedgerEntryCommand;
use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::PostgresUsageSettlementStore;
use sdkwork_cloudrouter_router_service::ports::{
    UsageSettlementCommand, UsageSettlementStore as _,
};
use sdkwork_cloudrouter_test_support::postgres_account_ledger_append_port;
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
const PRICING_BASELINE: &str = include_str!(
    "../../../database/modules/pricing/ddl/baseline/postgres/0001_pricing_baseline.sql"
);
const CLOUDROUTER_BILLING_BASELINE: &str = include_str!(
    "../../../database/modules/cloudrouter-billing/ddl/baseline/postgres/0001_cloudrouter_billing_baseline.sql"
);

const TENANT_ID: i64 = 100_001;
const ORGANIZATION_ID: i64 = 0;
const USER_ID: i64 = 30;

#[tokio::test]
async fn settlement_debits_user_token_bank_wallet_and_marks_facts_settled() {
    let Some(ctx) = PostgresTestContext::new("usage_settlement_debit").await else {
        return;
    };
    credit_token_bank(&ctx.pool, USER_ID, "settle-e2e-credit-1", 1000)
        .await
        .expect("credit token bank wallet");
    insert_usage_fact(&ctx.pool, 1, USER_ID, "settle-e2e-fact-1", "10.000000")
        .await
        .expect("insert pending usage fact");
    insert_usage_fact(&ctx.pool, 2, USER_ID, "settle-e2e-fact-2", "50.000000")
        .await
        .expect("insert pending usage fact");

    let settlement = PostgresUsageSettlementStore::new(
        ctx.pool.clone(),
        postgres_account_ledger_append_port(ctx.pool.clone()),
    );
    let outcome = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("settle pending usage");

    assert_eq!(2, outcome.settled_count);
    assert_eq!(0, outcome.failed_count);
    assert_eq!(
        600, outcome.debited_tokens,
        "60.00 USD at 10 tokens per major unit"
    );

    let (status, settled_at) = usage_fact_settlement(&ctx.pool, 1).await;
    assert_eq!(2, status, "usage fact must be marked settled");
    assert!(
        settled_at.is_some(),
        "successful settlement must record settled_at"
    );

    let balance = token_bank_balance(&ctx.pool, USER_ID).await;
    assert_eq!(
        400, balance,
        "wallet must be debited through the account ledger"
    );

    let debits = ledger_debit_total(&ctx.pool, USER_ID).await;
    assert_eq!(
        600, debits,
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
        postgres_account_ledger_append_port(ctx.pool.clone()),
    );
    let outcome = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("settle pending usage");

    assert_eq!(0, outcome.settled_count);
    assert_eq!(1, outcome.failed_count);
    assert_eq!(0, outcome.debited_tokens);

    let row =
        sqlx::query("SELECT settlement_status, failure_code FROM ai_metering_usage WHERE id = 1")
            .fetch_one(&ctx.pool)
            .await
            .expect("read usage fact settlement state");
    assert_eq!(3_i32, row.get::<i32, _>("settlement_status"));
    assert_eq!(
        "INSUFFICIENT_TOKEN_BANK",
        row.get::<String, _>("failure_code")
    );

    ctx.cleanup().await;
}

#[tokio::test]
async fn settlement_replays_idempotently_without_double_debit() {
    let Some(ctx) = PostgresTestContext::new("usage_settlement_replay").await else {
        return;
    };
    credit_token_bank(&ctx.pool, USER_ID, "settle-e2e-credit-2", 1000)
        .await
        .expect("credit token bank wallet");
    insert_usage_fact(&ctx.pool, 1, USER_ID, "settle-e2e-fact-3", "20.000000")
        .await
        .expect("insert pending usage fact");

    let settlement = PostgresUsageSettlementStore::new(
        ctx.pool.clone(),
        postgres_account_ledger_append_port(ctx.pool.clone()),
    );
    let first = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("first settlement run");
    assert_eq!(1, first.settled_count);
    assert_eq!(
        200, first.debited_tokens,
        "20.00 USD at 10 tokens per major unit"
    );

    // Second run must settle nothing and must not debit the wallet again.
    let second = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("second settlement run");
    assert_eq!(0, second.settled_count);
    assert_eq!(0, second.debited_tokens);

    let balance = token_bank_balance(&ctx.pool, USER_ID).await;
    assert_eq!(800, balance, "wallet must be debited exactly once");
    let debits = ledger_debit_total(&ctx.pool, USER_ID).await;
    assert_eq!(
        200, debits,
        "only one usage_settlement ledger entry may exist"
    );

    ctx.cleanup().await;
}

#[tokio::test]
async fn settlement_defers_zero_amount_groups() {
    let Some(ctx) = PostgresTestContext::new("usage_settlement_zero").await else {
        return;
    };
    insert_usage_fact(&ctx.pool, 1, USER_ID, "settle-e2e-zero-1", "0.0000000001")
        .await
        .expect("insert sub-point usage fact");

    let settlement = PostgresUsageSettlementStore::new(
        ctx.pool.clone(),
        postgres_account_ledger_append_port(ctx.pool.clone()),
    );
    let outcome = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("settle pending usage");

    assert_eq!(0, outcome.settled_count);
    assert_eq!(0, outcome.failed_count);
    assert_eq!(0, outcome.debited_tokens);

    let (status, _) = usage_fact_settlement(&ctx.pool, 1).await;
    assert_eq!(
        0, status,
        "sub-point usage facts must stay pending for deferral until they aggregate"
    );

    ctx.cleanup().await;
}

#[tokio::test]
async fn settlement_marks_shadow_charge_lines_settled_in_the_same_transaction() {
    let Some(ctx) = PostgresTestContext::new("usage_settlement_charge_line").await else {
        return;
    };
    credit_token_bank(&ctx.pool, USER_ID, "settle-e2e-credit-3", 1000)
        .await
        .expect("credit token bank wallet");
    insert_usage_fact(&ctx.pool, 1, USER_ID, "settle-e2e-charge-1", "10.000000")
        .await
        .expect("insert pending usage fact");
    insert_billing_ledger_chain(&ctx.pool, "settle-e2e-charge-1")
        .await
        .expect("insert shadow measurement, decision, and charge line");

    let settlement = PostgresUsageSettlementStore::new(
        ctx.pool.clone(),
        postgres_account_ledger_append_port(ctx.pool.clone()),
    );
    let outcome = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("settle pending usage");

    assert_eq!(1, outcome.settled_count);
    assert_eq!(0, outcome.failed_count);

    let row = sqlx::query(
        r#"
        SELECT charge_status, settlement_id, settled_at
        FROM cloudrouter_charge_line
        WHERE id = 1
        "#,
    )
    .fetch_one(&ctx.pool)
    .await
    .expect("read charge line settlement state");
    assert_eq!(
        "settled",
        row.get::<String, _>("charge_status"),
        "rated charge line must be settled together with its usage fact"
    );
    assert_eq!(
        1_i64,
        row.get::<i64, _>("settlement_id"),
        "charge line settlement must reference the settled usage fact"
    );
    assert!(
        row.get::<Option<DateTime<Utc>>, _>("settled_at").is_some(),
        "settled charge line must record settled_at"
    );

    ctx.cleanup().await;
}

#[tokio::test]
async fn settlement_terminal_failure_marks_shadow_charge_lines_failed() {
    let Some(ctx) = PostgresTestContext::new("usage_settlement_charge_line_failed").await else {
        return;
    };
    // An unparseable amount is a terminal failure that must mirror onto the
    // shadow charge line so the new ledger never shows it as pending forever.
    insert_usage_fact(
        &ctx.pool,
        1,
        USER_ID,
        "settle-e2e-charge-bad",
        "not-a-number",
    )
    .await
    .expect("insert malformed pending usage fact");
    insert_billing_ledger_chain(&ctx.pool, "settle-e2e-charge-bad")
        .await
        .expect("insert shadow measurement, decision, and charge line");

    let settlement = PostgresUsageSettlementStore::new(
        ctx.pool.clone(),
        postgres_account_ledger_append_port(ctx.pool.clone()),
    );
    let outcome = settlement
        .settle_pending_usage(settlement_command(100))
        .await
        .expect("settle pending usage");

    assert_eq!(0, outcome.settled_count);
    assert_eq!(1, outcome.failed_count);

    let row = sqlx::query("SELECT charge_status FROM cloudrouter_charge_line WHERE id = 1")
        .fetch_one(&ctx.pool)
        .await
        .expect("read charge line settlement state");
    assert_eq!(
        "failed",
        row.get::<String, _>("charge_status"),
        "terminally failed usage facts must mark the shadow charge line failed"
    );

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

async fn credit_token_bank(
    pool: &PgPool,
    user_id: i64,
    idempotency_key: &str,
    tokens: i64,
) -> Result<(), String> {
    let store = postgres_account_ledger_append_port(pool.clone());
    let append = AppendLedgerEntryCommand {
        tenant_id: TENANT_ID.to_string(),
        organization_id: Some(ORGANIZATION_ID.to_string()),
        owner_user_id: user_id.to_string(),
        account_id: String::new(),
        asset_type: CommerceAccountAssetType::TokenBank,
        currency_code: Some("TOKEN_BANK".to_owned()),
        direction: CommerceLedgerDirection::Credit,
        amount: CommerceMoney::new(&tokens.to_string()).map_err(|error| error.to_string())?,
        business_type: "token_bank_recharge".to_owned(),
        transaction_no: idempotency_key.to_owned(),
        request_no: idempotency_key.to_owned(),
        idempotency_key: idempotency_key.to_owned(),
        owner_type: None,
        account_purpose: None,
        expires_at: None,
        reversed_ledger_id: None,
    };
    let digest = sha256_hash(idempotency_key.as_bytes());
    let request_hash =
        CommerceRequestHash::new(&digest).map_err(|error| error.message().to_owned())?;
    store
        .append_ledger_entry(append, request_hash)
        .await
        .map(|_| ())
        .map_err(|error| error.message().to_owned())
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

/// Persists the shadow-write billing chain that the gateway usage recorder
/// writes in one transaction: usage measurement -> rating decision -> charge
/// line. `invocation_id` mirrors the gateway request id so the settlement
/// store can link the charge line back to the `ai_metering_usage` fact.
async fn insert_billing_ledger_chain(pool: &PgPool, request_id: &str) -> Result<(), sqlx::Error> {
    // Global (tenant 0) pricing identities referenced by the rated decision.
    sqlx::query(
        r#"
        INSERT INTO pricing_price_book
            (id, uuid, tenant_id, organization_id, namespace_code, price_book_code,
             price_book_version, price_side, source_system, vendor_code, region_code,
             source_catalog_version, source_hash, lifecycle_state, currency_code,
             effective_from)
        VALUES (1, 'book-uuid-1', 0, 0, 'models', 'models.global.official', '1',
                'official_reference', 'sdkwork_models', 'openai', 'global', '1',
                'hash-1', 'active', 'USD', '2026-01-01T00:00:00Z')
        "#,
    )
    .execute(&mut *pool.acquire().await?)
    .await?;
    sqlx::query(
        r#"
        INSERT INTO pricing_rate
            (id, uuid, tenant_id, organization_id, price_book_id, rate_code, rate_hash,
             product_code, product_kind, product_display_name, operation_code,
             operation_kind, operation_display_name, meter_code, meter_display_name,
             quantity_kind, unit_code, vendor_code, provider_code, region_code,
             resource_type, resource_code, catalog_key, billability, charge_timing,
             calculation_mode, quantity_aggregation, unit_size, unit_price,
             minimum_quantity, currency_code, conditions, tiers, priority, effective_from,
             source_url, source_observed_at)
        VALUES (1, 'rate-uuid-1', 0, 0, 1, 'rate-1', 'rate-hash-1', 'models.chat',
                'chat', 'Chat', 'inference.generate', 'inference', 'Generate', 'tokens',
                'Tokens', 'count', 'token', 'openai', 'openai', 'global', 'model',
                'gpt-4o', 'openai/gpt-4o', 'chargeable', 'usage_reported', 'per_unit',
                'sum', 1, 10, 0, 'USD', '[]'::jsonb, '[]'::jsonb, 1,
                '2026-01-01T00:00:00Z', 'https://example.test/pricing',
                '2026-01-01T00:00:00Z')
        "#,
    )
    .execute(&mut *pool.acquire().await?)
    .await?;
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_pricing_plan
            (id, uuid, tenant_id, organization_id, plan_code, plan_name,
             base_price_side, currency_code, fallback_policy, rounding_mode,
             minimum_charge_amount, effective_from)
        VALUES (1, 'plan-uuid-1', 0, 0, 'default', 'Default',
                'official_reference', 'USD', 'fail_closed', 'half_up', 0,
                '2026-01-01T00:00:00Z')
        "#,
    )
    .execute(&mut *pool.acquire().await?)
    .await?;
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_pricing_rule
            (id, uuid, tenant_id, organization_id, pricing_plan_id, rule_code,
             formula_mode, multiplier, markup_amount, priority, effective_from)
        VALUES (1, 'rule-uuid-1', 0, 0, 1, 'plan-default',
                'multiplier_markup', 1, 0, 1, '2026-01-01T00:00:00Z')
        "#,
    )
    .execute(&mut *pool.acquire().await?)
    .await?;
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_account_rate_card
            (id, uuid, tenant_id, organization_id, subject_type, subject_code,
             pricing_plan_tenant_id, pricing_plan_organization_id, pricing_plan_id,
             priority, effective_from)
        VALUES (1, 'card-uuid-1', 0, 0, 'default', 'default', 0, 0, 1, 1,
                '2026-01-01T00:00:00Z')
        "#,
    )
    .execute(&mut *pool.acquire().await?)
    .await?;

    let mut connection = pool.acquire().await?;
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_usage_measurement
            (id, uuid, tenant_id, organization_id, invocation_id, measurement_key,
             product_code, operation_code, meter_code, vendor_code, quantity,
             unit_code, measurement_source, dimensions_json, occurred_at)
        VALUES (1, 'meas-uuid-1', $1, $2, $3, 'tokens:1', 'models.chat',
                'inference.generate', 'tokens', 'openai', 1, 'token',
                'provider_response', '{}'::jsonb, CURRENT_TIMESTAMP)
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(request_id)
    .execute(&mut *connection)
    .await?;
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_rating_decision
            (id, uuid, tenant_id, organization_id, invocation_id, measurement_id,
             decision_status, billability, reason_code, strategy_code,
             calculation_mode, charge_timing, quantity_aggregation,
             price_book_tenant_id, price_book_organization_id, price_book_id, rate_id,
             account_rate_card_tenant_id, account_rate_card_organization_id,
             account_rate_card_id, pricing_plan_tenant_id, pricing_plan_organization_id,
             pricing_plan_id, pricing_rule_id, measured_quantity, rated_quantity,
             unit_size, reference_unit_price, unit_price, reference_amount, amount,
             currency_code, billing_components, pricing_snapshot, decided_at)
        VALUES (1, 'decision-uuid-1', $1, $2, $3, 1, 'rated', 'chargeable',
                'price_service_rated', 'token_usage', 'per_unit', 'usage_reported',
                'sum', 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1,
                10, 10, 10, 10, 'USD', '{}'::jsonb, '{}'::jsonb, CURRENT_TIMESTAMP)
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(request_id)
    .execute(&mut *connection)
    .await?;
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_charge_line
            (id, uuid, tenant_id, organization_id, invocation_id, rating_decision_id,
             charge_status, product_code, operation_code, meter_code, quantity,
             reference_amount, cost_amount, amount, currency_code, charged_at)
        VALUES (1, 'charge-uuid-1', $1, $2, $3, 1, 'rated', 'models.chat',
                'inference.generate', 'tokens', 1, 10, 0, 10, 'USD', CURRENT_TIMESTAMP)
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(request_id)
    .execute(&mut *connection)
    .await?;
    Ok(())
}

async fn usage_fact_settlement(pool: &PgPool, id: i64) -> (i32, Option<String>) {
    let row =
        sqlx::query("SELECT settlement_status, settled_at FROM ai_metering_usage WHERE id = $1")
            .bind(id)
            .fetch_one(pool)
            .await
            .expect("read usage fact settlement state");
    let settled_at = row
        .try_get::<Option<DateTime<Utc>>, _>("settled_at")
        .ok()
        .flatten()
        .map(|value| value.to_rfc3339());
    (row.get::<i32, _>("settlement_status"), settled_at)
}

async fn token_bank_balance(pool: &PgPool, user_id: i64) -> i64 {
    let row = sqlx::query(
        r#"
        SELECT available_amount
        FROM acct_account
        WHERE tenant_id = $1
          AND organization_id = $2
          AND owner_type = 'USER'
          AND owner_id = $3
          AND asset_code = 'token_bank'
          AND account_purpose = 'GENERAL'
          AND status = 1
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORGANIZATION_ID)
    .bind(user_id)
    .fetch_one(pool)
    .await
    .expect("read token bank wallet balance");
    row.get::<i64, _>("available_amount")
}

async fn ledger_debit_total(pool: &PgPool, user_id: i64) -> i64 {
    let row = sqlx::query(
        r#"
        SELECT CAST(COALESCE(SUM(amount), 0) AS BIGINT) AS total
        FROM acct_ledger_entry
        WHERE tenant_id = $1
          AND organization_id = $2
          AND owner_id = $3
          AND business_type = 'usage_settlement'
          AND direction = 'DEBIT'
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
    // Order matters: `cloudrouter_*` billing tables reference `pricing_*`
    // tables (rating decisions carry price-book/rate identities).
    for baseline in [
        ACCOUNT_BASELINE,
        AI_METERING_BASELINE,
        PRICING_BASELINE,
        CLOUDROUTER_BILLING_BASELINE,
    ] {
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
