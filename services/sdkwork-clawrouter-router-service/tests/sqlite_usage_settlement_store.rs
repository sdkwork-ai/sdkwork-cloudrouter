use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteUsageSettlementStore;
use sdkwork_clawrouter_router_service::ports::{UsageSettlementCommand, UsageSettlementStore};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Row, SqlitePool};

const SQLITE_USAGE_SETTLEMENT_STORE: &str =
    include_str!("../src/infrastructure/sql/sqlite/usage_settlement_store.rs");

#[test]
fn sqlite_usage_settlement_upsert_never_reopens_successful_bridge() {
    assert!(
        SQLITE_USAGE_SETTLEMENT_STORE.contains("WHERE commerce_settlement.settlement_status <> ?"),
        "SQLite usage settlement upsert must not overwrite successful settlement bridge rows"
    );
    assert!(
        SQLITE_USAGE_SETTLEMENT_STORE.contains(".bind(USAGE_SETTLEMENT_SUCCESS)"),
        "SQLite usage settlement upsert must bind the success status guard"
    );
}

#[tokio::test]
async fn sqlite_usage_settlement_debits_appbase_points_once_and_links_usage_to_ledger() {
    let pool = test_pool().await;
    seed_points_account(&pool, "account-701", 1000).await;
    seed_usage_fact(&pool, 501, "req-usage-501", "7.722000", 18, Some(0)).await;
    let store = SqliteUsageSettlementStore::new(pool.clone());

    let outcome = store
        .settle_pending_usage(settlement_command())
        .await
        .unwrap();
    let duplicate = store
        .settle_pending_usage(settlement_command())
        .await
        .unwrap();

    assert_eq!(1, outcome.settled_count);
    assert_eq!(0, outcome.failed_count);
    assert_eq!(78, outcome.debited_points);
    assert_eq!(0, duplicate.settled_count);
    assert_eq!(0, duplicate.failed_count);
    assert_eq!(0, duplicate.debited_points);
    assert_eq!(
        922,
        scalar_i64(
            &pool,
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT version FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
    assert_eq!(
        1,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_settlement").await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_account_ledger_entry WHERE business_type = 'usage'"
        )
        .await
    );

    let settlement = sqlx::query(
        r#"
        SELECT id, settlement_no, usage_fact_id, account_id, account_ledger_entry_id, asset_type, direction, amount, points, tokens, currency, settlement_status, failure_code
        FROM commerce_settlement
        WHERE usage_fact_id = 501
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    let settlement_id = settlement.get::<i64, _>("id");
    let ledger_entry_id = settlement.get::<String, _>("account_ledger_entry_id");
    let settlement_no = settlement.get::<String, _>("settlement_no");
    assert_eq!("usage-settlement-501", settlement_no);
    assert_eq!(501, settlement.get::<i64, _>("usage_fact_id"));
    assert_eq!("account-701", settlement.get::<String, _>("account_id"));
    assert!(!ledger_entry_id.is_empty());
    assert_eq!("points", settlement.get::<String, _>("asset_type"));
    assert_eq!("debit", settlement.get::<String, _>("direction"));
    assert_eq!("7.722000", settlement.get::<String, _>("amount"));
    assert_eq!(78, settlement.get::<i64, _>("points"));
    assert_eq!(18, settlement.get::<i64, _>("tokens"));
    assert_eq!("USD", settlement.get::<String, _>("currency"));
    assert_eq!(2, settlement.get::<i64, _>("settlement_status"));
    assert_eq!(
        None::<String>,
        settlement.get::<Option<String>, _>("failure_code")
    );

    let ledger = sqlx::query(
        r#"
        SELECT tenant_id, organization_id, account_id, owner_user_id, asset_type, direction, amount, balance_after, business_type, transaction_no, request_no, idempotency_key, source_type, source_id, remark
        FROM commerce_account_ledger_entry
        WHERE id = ?
        "#,
    )
    .bind(&ledger_entry_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("10", ledger.get::<String, _>("tenant_id"));
    assert_eq!("20", ledger.get::<String, _>("organization_id"));
    assert_eq!("account-701", ledger.get::<String, _>("account_id"));
    assert_eq!("30", ledger.get::<String, _>("owner_user_id"));
    assert_eq!("points", ledger.get::<String, _>("asset_type"));
    assert_eq!("debit", ledger.get::<String, _>("direction"));
    assert_eq!("78", ledger.get::<String, _>("amount"));
    assert_eq!("922", ledger.get::<String, _>("balance_after"));
    assert_eq!("usage", ledger.get::<String, _>("business_type"));
    assert_eq!(settlement_no, ledger.get::<String, _>("transaction_no"));
    assert_eq!("req-usage-501", ledger.get::<String, _>("request_no"));
    assert_eq!(
        "usage-settlement-501",
        ledger.get::<String, _>("idempotency_key")
    );
    assert_eq!("ai_usage", ledger.get::<String, _>("source_type"));
    assert_eq!("501", ledger.get::<String, _>("source_id"));
    assert!(ledger
        .get::<String, _>("remark")
        .contains("usage_request=req-usage-501"));

    let usage = sqlx::query("SELECT settlement_status, settlement_id FROM ai_usage WHERE id = 501")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(2, usage.get::<i64, _>("settlement_status"));
    assert_eq!(settlement_id, usage.get::<i64, _>("settlement_id"));
}

#[tokio::test]
async fn sqlite_usage_settlement_skips_usage_without_explicit_settlement_status() {
    let pool = test_pool().await;
    seed_points_account(&pool, "account-701", 1000).await;
    seed_usage_fact(&pool, 504, "req-usage-504", "5.000000", 10, None).await;
    let store = SqliteUsageSettlementStore::new(pool.clone());

    let outcome = store
        .settle_pending_usage(settlement_command())
        .await
        .unwrap();

    assert_eq!(0, outcome.settled_count);
    assert_eq!(0, outcome.failed_count);
    assert_eq!(0, outcome.debited_points);
    assert_eq!(
        1000,
        scalar_i64(
            &pool,
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
    assert_eq!(
        0,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_settlement").await
    );
    assert_eq!(
        0,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_account_ledger_entry").await
    );
    assert!(
        sqlx::query("SELECT settlement_status FROM ai_usage WHERE id = 504")
            .fetch_one(&pool)
            .await
            .unwrap()
            .get::<Option<i64>, _>("settlement_status")
            .is_none()
    );
}

#[tokio::test]
async fn sqlite_usage_settlement_marks_insufficient_points_failed_and_allows_retry() {
    let pool = test_pool().await;
    seed_points_account(&pool, "account-701", 1000).await;
    seed_usage_fact(&pool, 502, "req-usage-502", "100.060000", 99, Some(0)).await;
    let store = SqliteUsageSettlementStore::new(pool.clone());

    let failed = store
        .settle_pending_usage(settlement_command())
        .await
        .unwrap();

    assert_eq!(0, failed.settled_count);
    assert_eq!(1, failed.failed_count);
    assert_eq!(0, failed.debited_points);
    assert_eq!(
        1000,
        scalar_i64(
            &pool,
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
    assert_eq!(
        0,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_account_ledger_entry").await
    );
    assert_eq!(
        3,
        scalar_i64(
            &pool,
            "SELECT settlement_status FROM ai_usage WHERE id = 502"
        )
        .await
    );
    assert_eq!(
        "INSUFFICIENT_POINTS",
        scalar_string(
            &pool,
            "SELECT failure_code FROM commerce_settlement WHERE usage_fact_id = 502"
        )
        .await
    );

    sqlx::query("UPDATE commerce_account SET available_amount = '2000' WHERE id = 'account-701'")
        .execute(&pool)
        .await
        .unwrap();
    let retried = store
        .settle_pending_usage(settlement_command())
        .await
        .unwrap();

    assert_eq!(1, retried.settled_count);
    assert_eq!(0, retried.failed_count);
    assert_eq!(1001, retried.debited_points);
    assert_eq!(
        999,
        scalar_i64(
            &pool,
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
    assert_eq!(
        1,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_settlement").await
    );
    assert_eq!(
        1,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_account_ledger_entry").await
    );
    assert_eq!(
        2,
        scalar_i64(
            &pool,
            "SELECT settlement_status FROM ai_usage WHERE id = 502"
        )
        .await
    );
    assert_eq!(
        2,
        scalar_i64(
            &pool,
            "SELECT settlement_status FROM commerce_settlement WHERE usage_fact_id = 502"
        )
        .await
    );
    assert_eq!(
        0,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_settlement WHERE usage_fact_id = 502 AND failure_code IS NOT NULL"
        )
        .await
    );
}

#[tokio::test]
async fn sqlite_usage_settlement_zero_tenant_command_settles_global_pending_usage() {
    let pool = test_pool().await;
    seed_points_account(&pool, "account-701", 1000).await;
    seed_usage_fact(&pool, 503, "req-usage-503", "0.990000", 2, Some(0)).await;
    let store = SqliteUsageSettlementStore::new(pool.clone());

    let outcome = store
        .settle_pending_usage(UsageSettlementCommand {
            tenant_id: 0,
            organization_id: 0,
            limit: 50,
            requested_at: "2026-04-30T12:00:00Z".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!(1, outcome.settled_count);
    assert_eq!(10, outcome.debited_points);
    assert_eq!(
        2,
        scalar_i64(
            &pool,
            "SELECT settlement_status FROM ai_usage WHERE id = 503"
        )
        .await
    );
    assert_eq!(
        990,
        scalar_i64(
            &pool,
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
}

#[tokio::test]
async fn sqlite_usage_settlement_keeps_micro_amount_pending_until_billable_point_exists() {
    let pool = test_pool().await;
    seed_points_account(&pool, "account-701", 1000).await;
    seed_usage_fact(&pool, 505, "req-usage-505", "0.000000990000", 1, Some(0)).await;
    let store = SqliteUsageSettlementStore::new(pool.clone());

    let outcome = store
        .settle_pending_usage(settlement_command())
        .await
        .unwrap();

    assert_eq!(0, outcome.settled_count);
    assert_eq!(0, outcome.failed_count);
    assert_eq!(0, outcome.debited_points);
    assert_eq!(
        1000,
        scalar_i64(
            &pool,
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
    assert_eq!(
        0,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_settlement").await
    );
    assert_eq!(
        0,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_account_ledger_entry").await
    );
    assert_eq!(
        0,
        scalar_i64(
            &pool,
            "SELECT settlement_status FROM ai_usage WHERE id = 505"
        )
        .await
    );
}

#[tokio::test]
async fn sqlite_usage_settlement_keeps_sub_point_aggregate_pending() {
    let pool = test_pool().await;
    seed_points_account(&pool, "account-701", 1000).await;
    seed_usage_fact(&pool, 506, "req-usage-506", "0.040000000000", 4, Some(0)).await;
    seed_usage_fact(&pool, 507, "req-usage-507", "0.040000000000", 4, Some(0)).await;
    let store = SqliteUsageSettlementStore::new(pool.clone());

    let outcome = store
        .settle_pending_usage(settlement_command())
        .await
        .unwrap();

    assert_eq!(0, outcome.settled_count);
    assert_eq!(0, outcome.failed_count);
    assert_eq!(0, outcome.debited_points);
    assert_eq!(
        1000,
        scalar_i64(
            &pool,
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
    assert_eq!(
        0,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_settlement").await
    );
    assert_eq!(
        0,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_account_ledger_entry WHERE business_type = 'usage'"
        )
        .await
    );
    assert_eq!(
        0,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM ai_usage WHERE id IN (506, 507) AND settlement_status = 2"
        )
        .await
    );
    assert_eq!(
        0,
        scalar_i64(
            &pool,
            "SELECT COALESCE(SUM(points), 0) FROM commerce_settlement WHERE usage_fact_id IN (506, 507)"
        )
        .await
    );
}

#[tokio::test]
async fn sqlite_usage_settlement_aggregates_to_minimum_billable_point_before_debiting() {
    let pool = test_pool().await;
    seed_points_account(&pool, "account-701", 1000).await;
    seed_usage_fact(&pool, 510, "req-usage-510", "0.040000000000", 4, Some(0)).await;
    seed_usage_fact(&pool, 511, "req-usage-511", "0.060000000000", 6, Some(0)).await;
    let store = SqliteUsageSettlementStore::new(pool.clone());

    let outcome = store
        .settle_pending_usage(settlement_command())
        .await
        .unwrap();

    assert_eq!(2, outcome.settled_count);
    assert_eq!(0, outcome.failed_count);
    assert_eq!(1, outcome.debited_points);
    assert_eq!(
        999,
        scalar_i64(
            &pool,
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
    assert_eq!(
        2,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_settlement").await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_account_ledger_entry WHERE business_type = 'usage'"
        )
        .await
    );
    assert_eq!(
        2,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM ai_usage WHERE id IN (510, 511) AND settlement_status = 2"
        )
        .await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COALESCE(SUM(points), 0) FROM commerce_settlement WHERE usage_fact_id IN (510, 511)"
        )
        .await
    );
}

#[tokio::test]
async fn sqlite_usage_settlement_marks_invalid_amount_failed_without_blocking_valid_usage() {
    let pool = test_pool().await;
    seed_points_account(&pool, "account-701", 1000).await;
    seed_usage_fact(&pool, 508, "req-usage-508", "invalid-amount", 4, Some(0)).await;
    seed_usage_fact(&pool, 509, "req-usage-509", "0.990000", 4, Some(0)).await;
    let store = SqliteUsageSettlementStore::new(pool.clone());

    let outcome = store
        .settle_pending_usage(settlement_command())
        .await
        .expect("invalid usage amount should be isolated to that usage fact");

    assert_eq!(1, outcome.settled_count);
    assert_eq!(1, outcome.failed_count);
    assert_eq!(10, outcome.debited_points);
    assert_eq!(
        990,
        scalar_i64(
            &pool,
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'"
        )
        .await
    );
    assert_eq!(
        3,
        scalar_i64(
            &pool,
            "SELECT settlement_status FROM ai_usage WHERE id = 508"
        )
        .await
    );
    assert_eq!(
        "INVALID_USAGE_AMOUNT",
        scalar_string(
            &pool,
            "SELECT failure_code FROM commerce_settlement WHERE usage_fact_id = 508"
        )
        .await
    );
    assert_eq!(
        2,
        scalar_i64(
            &pool,
            "SELECT settlement_status FROM ai_usage WHERE id = 509"
        )
        .await
    );
}

fn settlement_command() -> UsageSettlementCommand {
    UsageSettlementCommand {
        tenant_id: 100001,
        organization_id: 0,
        limit: 50,
        requested_at: "2026-04-30T12:00:00Z".to_owned(),
    }
}

async fn test_pool() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_schema(&pool).await;
    pool
}

async fn create_schema(pool: &SqlitePool) {
    for statement in [
        r#"CREATE TABLE ai_usage (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT NOT NULL,
            trace_id TEXT,
            status INTEGER NOT NULL,
            api_key_id INTEGER,
            api_key_name_snapshot TEXT,
            channel_group_id INTEGER,
            channel_group_snapshot TEXT,
            owner_type INTEGER,
            owner_id INTEGER,
            owner_name_snapshot TEXT,
            model TEXT,
            provider_id INTEGER,
            channel_id INTEGER,
            provider_account_id INTEGER,
            modality INTEGER,
            usage_type INTEGER,
            billing_type INTEGER,
            billing_mode INTEGER,
            billing_meter_id INTEGER,
            billing_meter_code TEXT,
            billing_tier TEXT,
            billable_quantity TEXT,
            billable_unit INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            cached_tokens INTEGER,
            total_tokens INTEGER,
            request_count INTEGER,
            unit_price_snapshot TEXT,
            base_input_unit_price TEXT,
            base_output_unit_price TEXT,
            customer_charge_amount TEXT,
            cost_amount TEXT,
            currency TEXT,
            pricing_plan_code TEXT,
            pricing_snapshot TEXT,
            occurred_at TEXT,
            settlement_status INTEGER,
            settlement_id INTEGER,
            UNIQUE (tenant_id, organization_id, request_id, usage_type)
        )"#,
        r#"CREATE TABLE commerce_settlement (
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
            settlement_no TEXT,
            usage_fact_id INTEGER NOT NULL,
            account_id TEXT,
            account_ledger_entry_id TEXT,
            asset_type TEXT,
            direction TEXT,
            amount TEXT,
            points INTEGER,
            tokens INTEGER,
            currency TEXT,
            price_snapshot TEXT,
            settlement_status INTEGER,
            settled_at TEXT,
            failure_code TEXT,
            failure_message TEXT,
            UNIQUE (tenant_id, organization_id, usage_fact_id)
        )"#,
        r#"CREATE TABLE commerce_account (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            asset_type TEXT NOT NULL,
            currency_code TEXT,
            available_amount TEXT NOT NULL DEFAULT '0',
            frozen_amount TEXT NOT NULL DEFAULT '0',
            version INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, organization_id, owner_user_id, asset_type, currency_code)
        )"#,
        r#"CREATE TABLE commerce_account_ledger_entry (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            account_id TEXT NOT NULL,
            owner_user_id TEXT NOT NULL,
            asset_type TEXT NOT NULL,
            direction TEXT NOT NULL,
            amount TEXT NOT NULL,
            balance_after TEXT NOT NULL,
            business_type TEXT NOT NULL,
            transaction_no TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            source_type TEXT,
            source_id TEXT,
            remark TEXT,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, transaction_no)
        )"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_points_account(pool: &SqlitePool, account_id: &str, available_points: i64) {
    sqlx::query(
        r#"
        INSERT INTO commerce_account
            (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code, available_amount, frozen_amount, version, status, created_at, updated_at)
        VALUES
            (?, '100001', '0', '30', 'points', 'POINT', ?, '0', 0, 'active', '2026-04-30T11:59:00Z', '2026-04-30T11:59:00Z')
        "#,
    )
    .bind(account_id)
    .bind(available_points.to_string())
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_usage_fact(
    pool: &SqlitePool,
    usage_fact_id: i64,
    request_id: &str,
    amount: &str,
    total_tokens: i64,
    settlement_status: Option<i64>,
) {
    sqlx::query(
        r#"
        INSERT INTO ai_usage
            (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, status,
             api_key_id, api_key_name_snapshot, channel_group_id, channel_group_snapshot,
             owner_type, owner_id, owner_name_snapshot, model, provider_id, channel_id, modality,
             usage_type, billing_meter_code, billable_quantity, prompt_tokens, cached_tokens,
             completion_tokens, total_tokens, request_count, unit_price_snapshot,
             base_input_unit_price, base_output_unit_price, customer_charge_amount, cost_amount,
             currency, pricing_plan_code, pricing_snapshot, occurred_at, settlement_status)
        VALUES
            (?, ?, 100001, 0, 30, ?, ?, 1, 101, 'Owner Usage Key', 10, 'standard-group',
             1, 30, 'Demo User', 'gpt-4o-mini', 9001, 3001, 1, 1, 'llm_input_token',
             ?, 11, 2, 7, ?, 1, '0.198000', '0.198000', '0.792000',
             ?, '4.290000', 'USD', 'standard', '{}', '2026-04-30T11:58:00Z', ?)
        "#,
    )
    .bind(usage_fact_id)
    .bind(format!("usage-{usage_fact_id}"))
    .bind(request_id)
    .bind(format!("trace-{usage_fact_id}"))
    .bind(total_tokens.to_string())
    .bind(total_tokens)
    .bind(amount)
    .bind(settlement_status)
    .execute(pool)
    .await
    .unwrap();
}

async fn scalar_i64(pool: &SqlitePool, sql: &str) -> i64 {
    sqlx::query(sql)
        .fetch_one(pool)
        .await
        .unwrap()
        .try_get::<i64, _>(0)
        .unwrap()
}

async fn scalar_string(pool: &SqlitePool, sql: &str) -> String {
    sqlx::query(sql)
        .fetch_one(pool)
        .await
        .unwrap()
        .try_get::<String, _>(0)
        .unwrap()
}
