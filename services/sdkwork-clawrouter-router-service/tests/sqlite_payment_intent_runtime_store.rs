use sdkwork_clawrouter_router_service::application::{
    default_payment_provider_registry, EntityUuidGenerator, PaymentIntentRuntimeService,
    PaymentRefundRuntimeService, RuntimeConfirmPaymentIntentCommand,
    RuntimeCreatePaymentIntentCommand, RuntimeCreateRefundCommand, RuntimeCreateRefundItemCommand,
};
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqlitePaymentIntentRuntimeStore;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Row, SqlitePool};

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(1);
        Ok(format!(
            "sql-pay-{}",
            COUNTER.fetch_add(1, Ordering::SeqCst)
        ))
    }
}

#[tokio::test]
async fn sqlite_payment_intent_runtime_persists_intent_attempt_and_route_decision() {
    let pool = test_pool().await;
    let store = SqlitePaymentIntentRuntimeStore::new(pool.clone());
    let service = PaymentIntentRuntimeService::new(
        &store,
        default_payment_provider_registry(),
        &TestUuidGenerator,
    );

    let intent = service
        .create_payment_intent(create_command("idem-sql-create-1001", "order-sql-1001"))
        .await
        .unwrap();
    let duplicate = service
        .create_payment_intent(create_command("idem-sql-create-1001", "order-sql-1001"))
        .await
        .unwrap();

    assert_eq!(intent.id, duplicate.id);
    assert_eq!(
        1,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_payment_intent").await
    );
    assert_eq!(
        1,
        scalar_i64(&pool, "SELECT COUNT(1) FROM commerce_payment_attempt").await
    );
    assert_eq!(
        1,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_payment_route_decision"
        )
        .await
    );
    let route_provider_sql = format!(
        "SELECT supplier_code FROM commerce_payment_route_decision WHERE payment_intent_id = '{}'",
        intent.id
    );
    assert_eq!(
        "stripe",
        scalar_string(&pool, route_provider_sql.as_str()).await
    );
}

#[tokio::test]
async fn sqlite_payment_intent_runtime_records_failed_operation_attempt() {
    let pool = test_pool().await;
    let store = SqlitePaymentIntentRuntimeStore::new(pool.clone());
    let service = PaymentIntentRuntimeService::new(
        &store,
        default_payment_provider_registry(),
        &TestUuidGenerator,
    );
    let intent = service
        .create_payment_intent(create_command("idem-sql-create-1002", "order-sql-1002"))
        .await
        .unwrap();

    let error = service
        .confirm_payment_intent(RuntimeConfirmPaymentIntentCommand {
            tenant_id: "100001".to_owned(),
            payment_intent_id: intent.id,
            idempotency_key: "idem-sql-confirm-1002".to_owned(),
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
        .unwrap_err();

    assert!(error.to_string().contains("ConfirmPaymentIntent"));
    assert_eq!(
        "FAILED",
        scalar_string(
            &pool,
            "SELECT status FROM commerce_payment_operation_attempt WHERE idempotency_key = 'idem-sql-confirm-1002'"
        )
        .await
    );
    assert_eq!(
        "unsupported_capability",
        scalar_string(
            &pool,
            "SELECT provider_error_code FROM commerce_payment_operation_attempt WHERE idempotency_key = 'idem-sql-confirm-1002'"
        )
        .await
    );
}

#[tokio::test]
async fn sqlite_payment_refund_runtime_persists_failed_refund_attempt_event_and_operation() {
    let pool = test_pool().await;
    let store = SqlitePaymentIntentRuntimeStore::new(pool.clone());
    let uuid = TestUuidGenerator;
    let intent_service =
        PaymentIntentRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let refund_service =
        PaymentRefundRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let intent = intent_service
        .create_payment_intent(create_command("idem-sql-create-1003", "order-sql-1003"))
        .await
        .unwrap();

    let error = refund_service
        .create_refund(RuntimeCreateRefundCommand {
            tenant_id: "100001".to_owned(),
            payment_intent_id: intent.id,
            merchant_refund_no: "refund-sql-1003".to_owned(),
            amount: "10.00".to_owned(),
            currency_code: "CNY".to_owned(),
            reason: "customer requested refund".to_owned(),
            items: vec![
                RuntimeCreateRefundItemCommand {
                    order_item_id: "order-item-sql-1003-1".to_owned(),
                    quantity: 1,
                    refund_amount: "7.00".to_owned(),
                    tax_refund_amount: "1.00".to_owned(),
                    shipping_refund_amount: "0.00".to_owned(),
                },
                RuntimeCreateRefundItemCommand {
                    order_item_id: "order-item-sql-1003-2".to_owned(),
                    quantity: 1,
                    refund_amount: "2.00".to_owned(),
                    tax_refund_amount: "0.00".to_owned(),
                    shipping_refund_amount: "0.00".to_owned(),
                },
            ],
            idempotency_key: "idem-sql-refund-1003".to_owned(),
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
        .unwrap_err();

    assert!(
        error.to_string().contains("CreateRefund"),
        "unexpected refund error: {error}"
    );
    assert_eq!(
        "failed",
        scalar_string(
            &pool,
            "SELECT status FROM commerce_refund WHERE refund_no = 'refund-sql-1003'"
        )
        .await
    );
    assert_eq!(
        "FAILED",
        scalar_string(
            &pool,
            "SELECT status FROM commerce_refund_attempt WHERE out_refund_no = 'refund-sql-1003'"
        )
        .await
    );
    assert_eq!(
        "refund.failed",
        scalar_string(
            &pool,
            "SELECT event_type FROM commerce_refund_event WHERE refund_id = (SELECT id FROM commerce_refund WHERE refund_no = 'refund-sql-1003')"
        )
        .await
    );
    assert_eq!(
        2,
        scalar_i64(
            &pool,
            "SELECT COUNT(1) FROM commerce_refund_item WHERE refund_id = (SELECT id FROM commerce_refund WHERE refund_no = 'refund-sql-1003')"
        )
        .await
    );
    assert_eq!(
        "7.00",
        scalar_string(
            &pool,
            "SELECT refund_amount FROM commerce_refund_item WHERE order_item_id = 'order-item-sql-1003-1'"
        )
        .await
    );
    assert_eq!(
        "FAILED",
        scalar_string(
            &pool,
            "SELECT status FROM commerce_payment_operation_attempt WHERE idempotency_key = 'idem-sql-refund-1003'"
        )
        .await
    );
}

fn create_command(
    idempotency_key: &str,
    merchant_order_no: &str,
) -> RuntimeCreatePaymentIntentCommand {
    RuntimeCreatePaymentIntentCommand {
        tenant_id: "100001".to_owned(),
        organization_id: Some("0".to_owned()),
        owner_user_id: "30".to_owned(),
        merchant_order_no: merchant_order_no.to_owned(),
        amount: "88.50".to_owned(),
        currency_code: "CNY".to_owned(),
        subject: "standard checkout".to_owned(),
        supplier_code: "stripe".to_owned(),
        payment_method: Some("card".to_owned()),
        scene: Some("web".to_owned()),
        idempotency_key: idempotency_key.to_owned(),
        requested_at: "2026-05-29T00:00:00Z".to_owned(),
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
        r#"CREATE TABLE commerce_payment_intent (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            order_id TEXT NOT NULL,
            merchant_order_no TEXT NOT NULL,
            subject TEXT NOT NULL,
            provider TEXT NOT NULL,
            supplier_code TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            scene_code TEXT NOT NULL,
            amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            status TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            metadata_json TEXT,
            provider_native_json TEXT,
            next_action_json TEXT,
            captured_amount TEXT,
            refunded_amount TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_payment_attempt (
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
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, provider, out_trade_no)
        )"#,
        r#"CREATE TABLE commerce_payment_route_decision (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            payment_intent_id TEXT NOT NULL,
            payment_attempt_id TEXT NOT NULL,
            route_rule_id TEXT,
            account_id TEXT NOT NULL,
            supplier_code TEXT NOT NULL,
            provider_account_id TEXT,
            method_code TEXT NOT NULL,
            scene_code TEXT NOT NULL,
            country_code TEXT,
            currency_code TEXT NOT NULL,
            amount TEXT NOT NULL,
            risk_level TEXT,
            decision_reason TEXT,
            fallback_from_account_id TEXT,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, payment_attempt_id)
        )"#,
        r#"CREATE TABLE commerce_payment_operation_attempt (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            operation_no TEXT NOT NULL,
            supplier_code TEXT NOT NULL,
            provider_account_id TEXT,
            account_id TEXT,
            operation_code TEXT NOT NULL,
            sdkwork_resource_type TEXT NOT NULL,
            sdkwork_resource_id TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            request_digest TEXT NOT NULL,
            response_digest TEXT,
            native_request_id TEXT,
            native_trade_id TEXT,
            native_refund_id TEXT,
            http_status INTEGER,
            provider_error_code TEXT,
            provider_error_message TEXT,
            retryable TEXT,
            status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, supplier_code, operation_code, idempotency_key)
        )"#,
        r#"CREATE TABLE commerce_refund (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            payment_intent_id TEXT,
            payment_attempt_id TEXT NOT NULL,
            refund_no TEXT NOT NULL,
            amount TEXT NOT NULL,
            currency_code TEXT,
            supplier_code TEXT,
            reason TEXT,
            status TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, refund_no)
        )"#,
        r#"CREATE TABLE commerce_refund_attempt (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            refund_attempt_no TEXT NOT NULL,
            refund_id TEXT NOT NULL,
            supplier_code TEXT NOT NULL,
            provider_account_id TEXT,
            out_refund_no TEXT NOT NULL,
            provider_refund_id TEXT,
            amount TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            status TEXT NOT NULL,
            failure_code TEXT,
            failure_message TEXT,
            submitted_at TEXT,
            succeeded_at TEXT,
            failed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, supplier_code, out_refund_no)
        )"#,
        r#"CREATE TABLE commerce_refund_item (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            refund_id TEXT NOT NULL,
            order_item_id TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            refund_amount TEXT NOT NULL,
            tax_refund_amount TEXT NOT NULL DEFAULT '0',
            shipping_refund_amount TEXT NOT NULL DEFAULT '0',
            created_at TEXT NOT NULL
        )"#,
        r#"CREATE TABLE commerce_refund_event (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            refund_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            from_status TEXT,
            to_status TEXT NOT NULL,
            reason TEXT,
            created_at TEXT NOT NULL
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
