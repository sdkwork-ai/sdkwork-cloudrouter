use sdkwork_clawrouter_router_service::application::{
    EntityUuidGenerator, PaymentReconciliationRuntimeService,
    RuntimeGeneratePaymentReconciliationItemsCommand, RuntimeImportPaymentStatementCommand,
    RuntimeImportPaymentStatementItemCommand, RuntimeReconciliationLedgerEntry,
};
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqlitePaymentReconciliationRuntimeStore;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Row, SqlitePool};

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(1);
        Ok(format!(
            "sql-recon-{}",
            COUNTER.fetch_add(1, Ordering::SeqCst)
        ))
    }
}

#[tokio::test]
async fn sqlite_payment_reconciliation_runtime_persists_statement_items_and_differences() {
    let pool = test_pool().await;
    let store = SqlitePaymentReconciliationRuntimeStore::new(pool.clone());
    let service = PaymentReconciliationRuntimeService::new(&store, &TestUuidGenerator);

    let statement = service.import_statement(import_command()).await.unwrap();
    let duplicate = service.import_statement(import_command()).await.unwrap();
    assert_eq!(statement.id, duplicate.id);

    let generated = service
        .generate_reconciliation_items(RuntimeGeneratePaymentReconciliationItemsCommand {
            tenant_id: "100001".to_owned(),
            reconciliation_run_id: "run-sql-1001".to_owned(),
            statement_id: statement.id.clone(),
            generated_at: "2026-05-29T00:00:00Z".to_owned(),
            internal_items: vec![RuntimeReconciliationLedgerEntry {
                provider_code: "stripe".to_owned(),
                payment_attempt_id: Some("pay-attempt-sql-1".to_owned()),
                refund_id: None,
                refund_attempt_id: None,
                sdkwork_out_trade_no: Some("trade-sql-1001".to_owned()),
                sdkwork_out_refund_no: None,
                internal_amount: "10.00".to_owned(),
                provider_amount: "10.00".to_owned(),
                internal_fee_amount: "0.30".to_owned(),
                provider_fee_amount: "0.50".to_owned(),
                currency_code: "CNY".to_owned(),
                internal_status: "succeeded".to_owned(),
                provider_status: "succeeded".to_owned(),
                occurred_at: "2026-05-29T00:00:00Z".to_owned(),
            }],
        })
        .await
        .unwrap();

    assert_eq!(1, generated.len());
    assert_eq!(
        1,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_payment_statement").await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_payment_statement_item"
        )
        .await
    );
    assert_eq!(
        "fee_mismatch",
        scalar_string(
            &pool,
            "SELECT difference_type FROM commerce_payment_reconciliation_item WHERE reconciliation_run_id = 'run-sql-1001'"
        )
        .await
    );
    assert_eq!(
        "pay-attempt-sql-1",
        scalar_string(
            &pool,
            "SELECT payment_attempt_id FROM commerce_payment_reconciliation_item WHERE reconciliation_run_id = 'run-sql-1001'"
        )
        .await
    );
}

fn import_command() -> RuntimeImportPaymentStatementCommand {
    RuntimeImportPaymentStatementCommand {
        tenant_id: "100001".to_owned(),
        organization_id: Some("0".to_owned()),
        statement_no: "stmt-sql-1001".to_owned(),
        provider_code: "stripe".to_owned(),
        provider_account_id: Some("acct-sql-1".to_owned()),
        statement_type: "payment".to_owned(),
        settlement_currency: "CNY".to_owned(),
        period_start: "2026-05-01T00:00:00Z".to_owned(),
        period_end: "2026-05-31T23:59:59Z".to_owned(),
        provider_statement_id: Some("native-stmt-sql-1".to_owned()),
        file_ref: Some("file://statement-sql.csv".to_owned()),
        file_digest: "digest-sql-1".to_owned(),
        download_status: "downloaded".to_owned(),
        parse_status: "parsed".to_owned(),
        row_count: 1,
        total_amount: "10.00".to_owned(),
        fee_amount: "0.50".to_owned(),
        net_amount: "9.50".to_owned(),
        downloaded_at: Some("2026-05-29T00:00:00Z".to_owned()),
        parsed_at: Some("2026-05-29T00:00:00Z".to_owned()),
        request_no: "req-stmt-sql-1".to_owned(),
        idempotency_key: "stmt-sql-idem-1".to_owned(),
        items: vec![RuntimeImportPaymentStatementItemCommand {
            row_no: "statement-row-sql-1".to_owned(),
            provider_code: "stripe".to_owned(),
            provider_account_id: Some("acct-sql-1".to_owned()),
            native_trade_id: Some("native-trade-sql-1".to_owned()),
            native_refund_id: None,
            native_order_no: Some("order-sql-1".to_owned()),
            sdkwork_out_trade_no: Some("trade-sql-1001".to_owned()),
            sdkwork_out_refund_no: None,
            transaction_type: "payment".to_owned(),
            occurred_at: "2026-05-29T00:00:00Z".to_owned(),
            settled_at: Some("2026-05-29T00:00:00Z".to_owned()),
            gross_amount: "10.00".to_owned(),
            fee_amount: "0.50".to_owned(),
            net_amount: "9.50".to_owned(),
            currency_code: "CNY".to_owned(),
            provider_status: "succeeded".to_owned(),
            raw_row_digest: "row-digest-sql-1".to_owned(),
            metadata_json: serde_json::json!({"channel": "stripe"}),
        }],
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
        r#"CREATE TABLE commerce_payment_statement (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            statement_no TEXT NOT NULL,
            provider_code TEXT NOT NULL,
            provider_account_id TEXT,
            statement_type TEXT NOT NULL,
            settlement_currency TEXT NOT NULL,
            period_start TEXT NOT NULL,
            period_end TEXT NOT NULL,
            provider_statement_id TEXT,
            file_ref TEXT,
            file_digest TEXT,
            download_status TEXT NOT NULL,
            parse_status TEXT NOT NULL,
            row_count INTEGER NOT NULL DEFAULT 0,
            total_amount TEXT NOT NULL,
            fee_amount TEXT NOT NULL,
            net_amount TEXT NOT NULL,
            downloaded_at TEXT,
            parsed_at TEXT,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, statement_no)
        )"#,
        r#"CREATE TABLE commerce_payment_statement_item (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            statement_id TEXT NOT NULL,
            provider_code TEXT NOT NULL,
            provider_account_id TEXT,
            row_no TEXT NOT NULL,
            native_trade_id TEXT,
            native_refund_id TEXT,
            native_order_no TEXT,
            sdkwork_out_trade_no TEXT,
            sdkwork_out_refund_no TEXT,
            transaction_type TEXT NOT NULL,
            occurred_at TEXT NOT NULL,
            settled_at TEXT,
            gross_amount TEXT NOT NULL,
            fee_amount TEXT NOT NULL,
            net_amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            provider_status TEXT,
            raw_row_digest TEXT NOT NULL,
            metadata_json TEXT,
            created_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_payment_reconciliation_item (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            reconciliation_run_id TEXT NOT NULL,
            statement_id TEXT,
            statement_item_id TEXT,
            payment_attempt_id TEXT,
            refund_id TEXT,
            refund_attempt_id TEXT,
            provider_code TEXT NOT NULL,
            difference_type TEXT NOT NULL,
            match_status TEXT NOT NULL,
            internal_amount TEXT,
            provider_amount TEXT,
            difference_amount TEXT,
            currency_code TEXT,
            internal_status TEXT,
            provider_status TEXT,
            resolution_status TEXT NOT NULL,
            resolution_note TEXT,
            resolved_by TEXT,
            resolved_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
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
