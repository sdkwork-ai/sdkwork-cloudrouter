use sdkwork_commerce_payment_service::{PaymentRecordDetailQuery, PaymentRecordListQuery};
use sdkwork_commerce_storage_repository_sqlx::{
    commerce_initial_migration_sql, SqliteCommercePaymentRecordStore,
};
use sqlx::sqlite::SqlitePoolOptions;

#[tokio::test]
async fn sqlite_payment_record_store_lists_owner_records_from_standard_payment_schema() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite pool");
    sqlx::query(commerce_initial_migration_sql())
        .execute(&pool)
        .await
        .expect("commerce migration");

    seed_payment_records(&pool).await;

    let records = SqliteCommercePaymentRecordStore::new(pool)
        .list_payment_records(
            PaymentRecordListQuery::new("100001", Some("300001"), "30").unwrap(),
        )
        .await
        .expect("payment records");

    assert_eq!(records.len(), 1);
    assert_eq!("payment-attempt-1", records[0].id);
    assert_eq!("TRADE-1", records[0].order_no);
    assert_eq!("wechat_pay", records[0].method);
    assert_eq!("29.90", records[0].amount.as_str());
    assert_eq!("2026-05-20 10:03:00", records[0].date);
    assert_eq!("success", records[0].status);
}

#[tokio::test]
async fn sqlite_payment_record_store_retrieves_owner_record_from_standard_payment_schema() {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .expect("sqlite pool");
    sqlx::query(commerce_initial_migration_sql())
        .execute(&pool)
        .await
        .expect("commerce migration");

    seed_payment_records(&pool).await;

    let record = SqliteCommercePaymentRecordStore::new(pool)
        .retrieve_payment_record(
            PaymentRecordDetailQuery::new("100001", Some("300001"), "30", "payment-attempt-1")
                .unwrap(),
        )
        .await
        .expect("payment record");

    assert_eq!("payment-attempt-1", record.id);
    assert_eq!("TRADE-1", record.order_no);
    assert_eq!("wechat_pay", record.method);
    assert_eq!("29.90", record.amount.as_str());
    assert_eq!("2026-05-20 10:03:00", record.date);
    assert_eq!("success", record.status);
}

async fn seed_payment_records(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, payment_status, fulfillment_status, refund_status, subject, currency_code, request_no, idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
        VALUES
            ('order-1', '100001', '300001', '30', 'ORD-1', 'paid', 'paid', 'fulfilled', 'none', 'points_recharge', 'CNY', 'req-order-1', 'idem-order-1', '2026-05-20 10:00:00', '2026-05-20 10:03:00', NULL, NULL, '2026-05-20 10:03:00'),
            ('order-other-user', '100001', '300001', '31', 'ORD-OTHER-USER', 'paid', 'paid', 'fulfilled', 'none', 'points_recharge', 'CNY', 'req-order-2', 'idem-order-2', '2026-05-20 11:00:00', '2026-05-20 11:03:00', NULL, NULL, '2026-05-20 11:03:00'),
            ('order-other-org', '100001', '300002', '30', 'ORD-OTHER-ORG', 'paid', 'paid', 'fulfilled', 'none', 'points_recharge', 'CNY', 'req-order-3', 'idem-order-3', '2026-05-20 12:00:00', '2026-05-20 12:03:00', NULL, NULL, '2026-05-20 12:03:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed orders");

    sqlx::query(
        r#"
        INSERT INTO commerce_payment_intent
            (id, tenant_id, organization_id, owner_user_id, order_id, payment_intent_no, payment_method, provider_code, amount, currency_code, status, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('payment-intent-1', '100001', '300001', '30', 'order-1', 'PAY-INTENT-1', 'wechat_pay', 'wechat_pay', '29.90', 'CNY', 'succeeded', 'req-pay-1', 'idem-pay-1', '2026-05-20 10:01:00', '2026-05-20 10:03:00'),
            ('payment-intent-other-user', '100001', '300001', '31', 'order-other-user', 'PAY-INTENT-OTHER-USER', 'wechat_pay', 'wechat_pay', '39.90', 'CNY', 'succeeded', 'req-pay-2', 'idem-pay-2', '2026-05-20 11:01:00', '2026-05-20 11:03:00'),
            ('payment-intent-other-org', '100001', '300002', '30', 'order-other-org', 'PAY-INTENT-OTHER-ORG', 'wechat_pay', 'wechat_pay', '49.90', 'CNY', 'succeeded', 'req-pay-3', 'idem-pay-3', '2026-05-20 12:01:00', '2026-05-20 12:03:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed payment intents");

    sqlx::query(
        r#"
        INSERT INTO commerce_payment_attempt
            (id, tenant_id, organization_id, owner_user_id, payment_intent_id, order_id, payment_method, provider_code, out_trade_no, amount, currency_code, status, callback_payload, created_at, paid_at, updated_at)
        VALUES
            ('payment-attempt-1', '100001', '300001', '30', 'payment-intent-1', 'order-1', 'wechat_pay', 'wechat_pay', 'TRADE-1', '29.90', 'CNY', 'succeeded', NULL, '2026-05-20 10:02:00', '2026-05-20 10:03:00', '2026-05-20 10:03:00'),
            ('payment-attempt-other-user', '100001', '300001', '31', 'payment-intent-other-user', 'order-other-user', 'wechat_pay', 'wechat_pay', 'TRADE-OTHER-USER', '39.90', 'CNY', 'succeeded', NULL, '2026-05-20 11:02:00', '2026-05-20 11:03:00', '2026-05-20 11:03:00'),
            ('payment-attempt-other-org', '100001', '300002', '30', 'payment-intent-other-org', 'order-other-org', 'wechat_pay', 'wechat_pay', 'TRADE-OTHER-ORG', '49.90', 'CNY', 'succeeded', NULL, '2026-05-20 12:02:00', '2026-05-20 12:03:00', '2026-05-20 12:03:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed payment attempts");
}
