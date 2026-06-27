use sdkwork_clawrouter_router_service::application::{
    default_payment_provider_registry, EntityUuidGenerator, InMemoryPaymentIntentRuntimeStore,
    PaymentAdapterOperation, PaymentIntentRuntimeService, PaymentIntentStatus,
    RuntimeCancelPaymentIntentCommand, RuntimeCapturePaymentIntentCommand,
    RuntimeConfirmPaymentIntentCommand, RuntimeCreatePaymentIntentCommand,
};
use sdkwork_clawrouter_router_service::domain::DomainResult;

struct TestUuidGenerator {
    prefix: &'static str,
}

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(1);
        Ok(format!(
            "{}-{}",
            self.prefix,
            COUNTER.fetch_add(1, Ordering::SeqCst)
        ))
    }
}

#[tokio::test]
async fn create_payment_intent_records_route_decision_and_is_idempotent() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let service = PaymentIntentRuntimeService::new(
        &store,
        default_payment_provider_registry(),
        &TestUuidGenerator { prefix: "pay" },
    );

    let command = create_command("idem-create-1001", "order-1001", "stripe");
    let first = service
        .create_payment_intent(command.clone())
        .await
        .unwrap();
    let second = service.create_payment_intent(command).await.unwrap();

    assert_eq!(first.id, second.id);
    assert_eq!(PaymentIntentStatus::RequiresConfirmation, first.status);
    assert_eq!("stripe", first.provider_code);
    assert_eq!("order-1001", first.merchant_order_no);

    let route_decisions = store.route_decisions();
    assert_eq!(1, route_decisions.len());
    assert_eq!(first.id, route_decisions[0].payment_intent_id);
    assert_eq!("stripe", route_decisions[0].provider_code);
    assert_eq!("card", route_decisions[0].method_code);
    assert_eq!("web", route_decisions[0].scene_code);
    assert_eq!("CNY", route_decisions[0].currency_code);
    assert_eq!(
        "standard_provider_requested",
        route_decisions[0].decision_reason
    );
}

#[tokio::test]
async fn create_payment_intent_rejects_extension_provider_before_persistence() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let service = PaymentIntentRuntimeService::new(
        &store,
        default_payment_provider_registry(),
        &TestUuidGenerator { prefix: "pay" },
    );

    let error = service
        .create_payment_intent(create_command("idem-create-1002", "order-1002", "unionpay"))
        .await
        .unwrap_err();

    assert!(error.to_string().contains("unionpay"));
    assert!(store.payment_intents().is_empty());
    assert!(store.route_decisions().is_empty());
    assert!(store.operation_attempts().is_empty());
}

#[tokio::test]
async fn confirm_payment_intent_records_provider_operation_attempt() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let service = PaymentIntentRuntimeService::new(
        &store,
        default_payment_provider_registry(),
        &TestUuidGenerator { prefix: "pay" },
    );
    let intent = service
        .create_payment_intent(create_command("idem-create-1003", "order-1003", "stripe"))
        .await
        .unwrap();

    let error = service
        .confirm_payment_intent(RuntimeConfirmPaymentIntentCommand {
            tenant_id: "tenant-1".to_owned(),
            payment_intent_id: intent.id.clone(),
            idempotency_key: "idem-confirm-1003".to_owned(),
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
        .unwrap_err();

    assert!(error.to_string().contains("CreatePaymentIntent") == false);
    assert!(error.to_string().contains("ConfirmPaymentIntent"));

    let attempts = store.operation_attempts();
    assert_eq!(1, attempts.len());
    assert_eq!(intent.id, attempts[0].sdkwork_resource_id);
    assert_eq!("stripe", attempts[0].provider_code);
    assert_eq!(
        PaymentAdapterOperation::ConfirmPaymentIntent,
        attempts[0].operation
    );
    assert_eq!("FAILED", attempts[0].status);
    assert_eq!("idem-confirm-1003", attempts[0].idempotency_key);
}

#[tokio::test]
async fn capture_and_cancel_payment_intent_record_provider_operation_attempts() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let service = PaymentIntentRuntimeService::new(
        &store,
        default_payment_provider_registry(),
        &TestUuidGenerator { prefix: "pay" },
    );
    let intent = service
        .create_payment_intent(create_command("idem-create-1004", "order-1004", "stripe"))
        .await
        .unwrap();

    let capture = service
        .capture_payment_intent(RuntimeCapturePaymentIntentCommand {
            tenant_id: "tenant-1".to_owned(),
            payment_intent_id: intent.id.clone(),
            amount: Some("20.00".to_owned()),
            final_capture: true,
            idempotency_key: "idem-capture-1004".to_owned(),
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
        .unwrap_err();
    let cancel = service
        .cancel_payment_intent(RuntimeCancelPaymentIntentCommand {
            tenant_id: "tenant-1".to_owned(),
            payment_intent_id: intent.id.clone(),
            reason: Some("customer_cancelled".to_owned()),
            idempotency_key: "idem-cancel-1004".to_owned(),
            requested_at: "2026-05-29T00:00:01Z".to_owned(),
        })
        .await
        .unwrap_err();

    assert!(capture.to_string().contains("CapturePaymentIntent"));
    assert!(cancel.to_string().contains("CancelPaymentIntent"));

    let attempts = store.operation_attempts();
    assert_eq!(2, attempts.len());
    assert_eq!(
        PaymentAdapterOperation::CapturePaymentIntent,
        attempts[0].operation
    );
    assert_eq!("idem-capture-1004", attempts[0].idempotency_key);
    assert_eq!("FAILED", attempts[0].status);
    assert_eq!(
        PaymentAdapterOperation::CancelPaymentIntent,
        attempts[1].operation
    );
    assert_eq!("idem-cancel-1004", attempts[1].idempotency_key);
    assert_eq!("FAILED", attempts[1].status);
}

fn create_command(
    idempotency_key: &str,
    merchant_order_no: &str,
    provider_code: &str,
) -> RuntimeCreatePaymentIntentCommand {
    RuntimeCreatePaymentIntentCommand {
        tenant_id: "tenant-1".to_owned(),
        organization_id: Some("org-1".to_owned()),
        owner_user_id: "user-1".to_owned(),
        merchant_order_no: merchant_order_no.to_owned(),
        amount: "88.50".to_owned(),
        currency_code: "CNY".to_owned(),
        subject: "standard checkout".to_owned(),
        provider_code: provider_code.to_owned(),
        payment_method: Some("card".to_owned()),
        scene: Some("web".to_owned()),
        idempotency_key: idempotency_key.to_owned(),
        requested_at: "2026-05-29T00:00:00Z".to_owned(),
    }
}
