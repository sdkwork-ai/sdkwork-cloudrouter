use sdkwork_clawrouter_router_service::application::{
    default_payment_provider_registry, EntityUuidGenerator, InMemoryPaymentIntentRuntimeStore,
    PaymentIntentRuntimeService, PaymentRefundRuntimeService, PaymentRefundStatus,
    RuntimeCancelRefundCommand, RuntimeCreatePaymentIntentCommand, RuntimeCreateRefundCommand,
    RuntimeCreateRefundItemCommand,
};
use sdkwork_clawrouter_router_service::domain::DomainResult;

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(1);
        Ok(format!(
            "refund-runtime-{}",
            COUNTER.fetch_add(1, Ordering::SeqCst)
        ))
    }
}

#[tokio::test]
async fn create_refund_records_failed_provider_attempt_for_mainstream_sandbox_adapter() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let uuid = TestUuidGenerator;
    let intent_service =
        PaymentIntentRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let refund_service =
        PaymentRefundRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let intent = intent_service
        .create_payment_intent(create_intent_command())
        .await
        .unwrap();

    let error = refund_service
        .create_refund(RuntimeCreateRefundCommand {
            tenant_id: "100001".to_owned(),
            payment_intent_id: intent.id.clone(),
            merchant_refund_no: "refund-1001".to_owned(),
            amount: "12.34".to_owned(),
            currency_code: "CNY".to_owned(),
            reason: "customer requested refund".to_owned(),
            items: vec![],
            idempotency_key: "refund-idem-1001".to_owned(),
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
        .unwrap_err();

    assert!(error.to_string().contains("CreateRefund"));
    let refunds = store.refunds();
    assert_eq!(1, refunds.len());
    assert_eq!(intent.id, refunds[0].payment_intent_id);
    assert_eq!("refund-1001", refunds[0].merchant_refund_no);
    assert_eq!("stripe", refunds[0].supplier_code);
    assert_eq!(PaymentRefundStatus::Failed, refunds[0].status);
    assert_eq!(1, store.refund_attempts().len());
    assert_eq!("FAILED", store.refund_attempts()[0].status);
    assert_eq!(1, store.refund_events().len());
    assert_eq!("refund.failed", store.refund_events()[0].event_type);
    assert_eq!(1, store.operation_attempts().len());
    assert_eq!(
        "create_refund",
        store.operation_attempts()[0].operation.as_code()
    );
    assert_eq!("FAILED", store.operation_attempts()[0].status);
}

#[tokio::test]
async fn create_refund_records_item_level_allocations() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let uuid = TestUuidGenerator;
    let intent_service =
        PaymentIntentRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let refund_service =
        PaymentRefundRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let intent = intent_service
        .create_payment_intent(create_intent_command())
        .await
        .unwrap();

    let _ = refund_service
        .create_refund(RuntimeCreateRefundCommand {
            tenant_id: "100001".to_owned(),
            payment_intent_id: intent.id,
            merchant_refund_no: "refund-1002-items".to_owned(),
            amount: "13.60".to_owned(),
            currency_code: "CNY".to_owned(),
            reason: "partial item refund".to_owned(),
            items: vec![
                RuntimeCreateRefundItemCommand {
                    order_item_id: "order-item-1001".to_owned(),
                    quantity: 1,
                    refund_amount: "10.00".to_owned(),
                    tax_refund_amount: "0.60".to_owned(),
                    shipping_refund_amount: "1.00".to_owned(),
                },
                RuntimeCreateRefundItemCommand {
                    order_item_id: "order-item-1002".to_owned(),
                    quantity: 2,
                    refund_amount: "2.00".to_owned(),
                    tax_refund_amount: "0.00".to_owned(),
                    shipping_refund_amount: "0.00".to_owned(),
                },
            ],
            idempotency_key: "refund-idem-1002-items".to_owned(),
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
        .unwrap_err();

    let refund_items = store.refund_items();
    assert_eq!(2, refund_items.len());
    assert_eq!("order-item-1001", refund_items[0].order_item_id);
    assert_eq!(1, refund_items[0].quantity);
    assert_eq!("10.00", refund_items[0].refund_amount);
    assert_eq!("0.60", refund_items[0].tax_refund_amount);
    assert_eq!("1.00", refund_items[0].shipping_refund_amount);
    assert_eq!("order-item-1002", refund_items[1].order_item_id);
    assert_eq!(2, refund_items[1].quantity);
    assert_eq!(store.refunds()[0].id, refund_items[0].refund_id);
    assert_eq!(store.refunds()[0].id, refund_items[1].refund_id);
}

#[tokio::test]
async fn create_refund_rejects_item_allocation_total_mismatch_before_persistence() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let uuid = TestUuidGenerator;
    let intent_service =
        PaymentIntentRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let refund_service =
        PaymentRefundRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let intent = intent_service
        .create_payment_intent(create_intent_command())
        .await
        .unwrap();

    let error = refund_service
        .create_refund(RuntimeCreateRefundCommand {
            tenant_id: "100001".to_owned(),
            payment_intent_id: intent.id,
            merchant_refund_no: "refund-1002-mismatch".to_owned(),
            amount: "13.60".to_owned(),
            currency_code: "CNY".to_owned(),
            reason: "partial item refund".to_owned(),
            items: vec![RuntimeCreateRefundItemCommand {
                order_item_id: "order-item-1001".to_owned(),
                quantity: 1,
                refund_amount: "10.00".to_owned(),
                tax_refund_amount: "0.60".to_owned(),
                shipping_refund_amount: "1.00".to_owned(),
            }],
            idempotency_key: "refund-idem-1002-mismatch".to_owned(),
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
        .unwrap_err();

    assert!(error.to_string().contains("item allocation"));
    assert!(store.refunds().is_empty());
    assert!(store.refund_items().is_empty());
    assert!(store.refund_attempts().is_empty());
}

#[tokio::test]
async fn create_refund_is_idempotent_by_tenant_and_idempotency_key() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let uuid = TestUuidGenerator;
    let intent_service =
        PaymentIntentRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let refund_service =
        PaymentRefundRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let intent = intent_service
        .create_payment_intent(create_intent_command())
        .await
        .unwrap();
    let command = RuntimeCreateRefundCommand {
        tenant_id: "100001".to_owned(),
        payment_intent_id: intent.id,
        merchant_refund_no: "refund-1002".to_owned(),
        amount: "12.34".to_owned(),
        currency_code: "CNY".to_owned(),
        reason: "customer requested refund".to_owned(),
        items: vec![],
        idempotency_key: "refund-idem-1002".to_owned(),
        requested_at: "2026-05-29T00:00:00Z".to_owned(),
    };

    let _ = refund_service
        .create_refund(command.clone())
        .await
        .unwrap_err();
    let duplicate = refund_service.create_refund(command).await.unwrap();

    assert_eq!(1, store.refunds().len());
    assert_eq!(PaymentRefundStatus::Failed, duplicate.status);
    assert_eq!("refund-1002", duplicate.merchant_refund_no);
    assert_eq!(1, store.refund_attempts().len());
    assert_eq!(1, store.operation_attempts().len());
}

#[tokio::test]
async fn create_refund_rejects_amount_currency_mismatch_before_persistence() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let uuid = TestUuidGenerator;
    let intent_service =
        PaymentIntentRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let refund_service =
        PaymentRefundRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let intent = intent_service
        .create_payment_intent(create_intent_command())
        .await
        .unwrap();

    let error = refund_service
        .create_refund(RuntimeCreateRefundCommand {
            tenant_id: "100001".to_owned(),
            payment_intent_id: intent.id,
            merchant_refund_no: "refund-1003".to_owned(),
            amount: "12.34".to_owned(),
            currency_code: "USD".to_owned(),
            reason: "customer requested refund".to_owned(),
            items: vec![],
            idempotency_key: "refund-idem-1003".to_owned(),
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
        .unwrap_err();

    assert!(error.to_string().contains("currency"));
    assert!(store.refunds().is_empty());
    assert!(store.refund_attempts().is_empty());
    assert!(store.refund_events().is_empty());
}

#[tokio::test]
async fn cancel_refund_rejects_terminal_failed_refund_without_provider_attempt() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let uuid = TestUuidGenerator;
    let intent_service =
        PaymentIntentRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let refund_service =
        PaymentRefundRuntimeService::new(&store, default_payment_provider_registry(), &uuid);
    let intent = intent_service
        .create_payment_intent(create_intent_command())
        .await
        .unwrap();
    let _ = refund_service
        .create_refund(RuntimeCreateRefundCommand {
            tenant_id: "100001".to_owned(),
            payment_intent_id: intent.id,
            merchant_refund_no: "refund-1004".to_owned(),
            amount: "12.34".to_owned(),
            currency_code: "CNY".to_owned(),
            reason: "customer requested refund".to_owned(),
            items: vec![],
            idempotency_key: "refund-idem-1004".to_owned(),
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
        .unwrap_err();

    let error = refund_service
        .cancel_refund(RuntimeCancelRefundCommand {
            tenant_id: "100001".to_owned(),
            refund_id: store.refunds()[0].id.clone(),
            reason: Some("operator canceled".to_owned()),
            idempotency_key: "refund-cancel-idem-1004".to_owned(),
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
        .unwrap_err();

    assert!(error.is_conflict());
    assert!(error.to_string().contains("terminal"));
    assert_eq!(1, store.operation_attempts().len());
    assert_eq!(
        "create_refund",
        store.operation_attempts()[0].operation.as_code()
    );
}

fn create_intent_command() -> RuntimeCreatePaymentIntentCommand {
    RuntimeCreatePaymentIntentCommand {
        tenant_id: "100001".to_owned(),
        organization_id: Some("0".to_owned()),
        owner_user_id: "30".to_owned(),
        merchant_order_no: "order-1001".to_owned(),
        amount: "88.50".to_owned(),
        currency_code: "CNY".to_owned(),
        subject: "standard checkout".to_owned(),
        supplier_code: "stripe".to_owned(),
        payment_method: Some("card".to_owned()),
        scene: Some("web".to_owned()),
        idempotency_key: "intent-idem-1001".to_owned(),
        requested_at: "2026-05-29T00:00:00Z".to_owned(),
    }
}
