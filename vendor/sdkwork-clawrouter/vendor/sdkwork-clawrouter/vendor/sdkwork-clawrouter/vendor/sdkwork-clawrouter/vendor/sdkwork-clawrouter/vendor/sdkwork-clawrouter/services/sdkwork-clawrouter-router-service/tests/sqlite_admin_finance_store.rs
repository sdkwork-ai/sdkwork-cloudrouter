use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminFinanceStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminFinanceStore, AdminFinanceSubject, ListAdminTransactionsQuery,
};
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn sqlite_admin_finance_transaction_statuses_are_resolved_from_appbase_commerce_sources() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_finance_tables(&pool).await;
    seed_transactions(&pool).await;

    let store = SqliteAdminFinanceStore::new(pool);
    let failed = store
        .list_transactions(ListAdminTransactionsQuery {
            subject: subject(),
            page_no: 1,
            page_size: 10,
            keyword: None,
            status: Some("failed".to_owned()),
            start_time: None,
            end_time: None,
        })
        .await
        .unwrap();

    assert_eq!(1, failed.len());
    assert_eq!("ledger-payment-failed", failed[0].id);
    assert_eq!("failed", failed[0].status);

    let all = store
        .list_transactions(ListAdminTransactionsQuery {
            subject: subject(),
            page_no: 1,
            page_size: 10,
            keyword: None,
            status: None,
            start_time: None,
            end_time: None,
        })
        .await
        .unwrap();

    assert_eq!(3, all.len());
    assert_eq!("pending", all[0].status);
    assert_eq!("failed", all[1].status);
    assert_eq!("success", all[2].status);
}

#[tokio::test]
async fn sqlite_admin_finance_fails_closed_when_declared_commerce_source_is_missing() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    create_finance_tables(&pool).await;
    sqlx::query(
        r#"
        INSERT INTO commerce_account_ledger_entry
            (id, tenant_id, organization_id, account_id, owner_user_id, asset_type, direction, amount, balance_after, business_type, transaction_no, request_no, idempotency_key, source_type, source_id, remark, created_at)
        VALUES
            ('ledger-missing-payment', '100001', '0', 'account-30', '30', 'points', 'credit', '50.00', '100.00', 'recharge', 'ORDER-MISSING', 'req-missing', 'idem-missing', 'commerce_payment_attempt', 'payment-missing', 'Payment source missing', '2026-05-20 09:05:00')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let error = SqliteAdminFinanceStore::new(pool)
        .list_transactions(ListAdminTransactionsQuery {
            subject: subject(),
            page_no: 1,
            page_size: 10,
            keyword: None,
            status: None,
            start_time: None,
            end_time: None,
        })
        .await
        .expect_err("missing declared commerce source must fail closed");

    assert!(
        error
            .to_string()
            .contains("missing admin finance transaction status payment"),
        "{error}"
    );
}

fn subject() -> AdminFinanceSubject {
    AdminFinanceSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    }
}

async fn create_finance_tables(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE commerce_account_ledger_entry (
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
            created_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE commerce_order (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            order_no TEXT NOT NULL,
            status TEXT NOT NULL,
            subject TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            paid_at TEXT,
            cancelled_at TEXT,
            expired_at TEXT,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE commerce_payment_attempt (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            payment_intent_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            out_trade_no TEXT NOT NULL,
            amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            status TEXT NOT NULL,
            callback_payload TEXT,
            created_at TEXT NOT NULL,
            paid_at TEXT,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE commerce_refund (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            payment_attempt_id TEXT NOT NULL,
            refund_no TEXT NOT NULL,
            amount TEXT NOT NULL,
            status TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_transactions(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, subject, currency_code, request_no, idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
        VALUES
            ('order-failed', '100001', '0', '30', 'ORDER-FAILED', 'closed', 'points_recharge', 'CNY', 'req-order-failed', 'idem-order-failed', '2026-05-20 09:00:00', NULL, '2026-05-20 09:03:00', NULL, '2026-05-20 09:03:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO commerce_payment_attempt
            (id, tenant_id, organization_id, owner_user_id, payment_intent_id, order_id, provider, out_trade_no, amount, currency_code, status, callback_payload, created_at, paid_at, updated_at)
        VALUES
            ('payment-failed', '100001', '0', '30', 'intent-failed', 'order-failed', 'wechat', 'ORDER-FAILED', '50.00', 'CNY', 'failed', NULL, '2026-05-20 09:01:00', NULL, '2026-05-20 09:03:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO commerce_refund
            (id, tenant_id, payment_attempt_id, refund_no, amount, status, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('refund-processing', '10', 'payment-failed', 'REFUND-PENDING', '10.00', 'processing', 'req-refund', 'idem-refund', '2026-05-20 09:04:00', '2026-05-20 09:04:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO commerce_account_ledger_entry
            (id, tenant_id, organization_id, account_id, owner_user_id, asset_type, direction, amount, balance_after, business_type, transaction_no, request_no, idempotency_key, source_type, source_id, remark, created_at)
        VALUES
            ('ledger-refund-pending', '100001', '0', 'account-30', '30', 'cash', 'debit', '10.00', '90.00', 'refund', 'REFUND-PENDING', 'req-refund', 'idem-refund', 'commerce_refund', 'refund-processing', 'Refund processing', '2026-05-20 09:04:00'),
            ('ledger-payment-failed', '100001', '0', 'account-30', '30', 'points', 'credit', '50.00', '100.00', 'recharge', 'ORDER-FAILED', 'req-payment', 'idem-payment', 'commerce_payment_attempt', 'payment-failed', 'Payment failed', '2026-05-20 09:03:00'),
            ('ledger-manual-success', '100001', '0', 'account-30', '30', 'cash', 'credit', '5.00', '105.00', 'recharge', 'ADMIN-SUCCESS', 'req-admin', 'idem-admin', 'admin_user_balance_adjustment', 'admin-recharge', 'Manual adjustment', '2026-05-20 09:02:00')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}
