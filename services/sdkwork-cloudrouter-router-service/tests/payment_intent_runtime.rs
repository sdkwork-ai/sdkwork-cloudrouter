use std::sync::Arc;

use sdkwork_cloudrouter_router_service::application::{
    default_payment_provider_registry, EntityUuidGenerator, InMemoryPaymentIntentRuntimeStore,
    PaymentAdapterFuture, PaymentAdapterOperation, PaymentCancelPaymentIntentRequest,
    PaymentCancelRefundRequest, PaymentCapturePaymentIntentRequest,
    PaymentConfirmPaymentIntentRequest, PaymentCreateIntentRequest, PaymentCreateRefundRequest,
    PaymentDownloadStatementRequest, PaymentIntentRuntimeService, PaymentIntentStatus,
    PaymentNativeOperationOutcome, PaymentNativeOperationRequest, PaymentNormalizeWebhookRequest,
    PaymentNormalizedWebhookEvent, PaymentParseStatementRequest, PaymentProviderAdapter,
    PaymentProviderCapabilities, PaymentProviderOperationOutcome, PaymentProviderRegistryError,
    PaymentQueryRefundRequest, PaymentStatementDownloadOutcome, PaymentStatementParseOutcome,
    PaymentVerifyWebhookRequest, PaymentWebhookVerificationOutcome,
    RuntimeCancelPaymentIntentCommand, RuntimeCapturePaymentIntentCommand,
    RuntimeConfirmPaymentIntentCommand, RuntimeCreatePaymentIntentCommand,
};
use sdkwork_cloudrouter_router_service::domain::DomainResult;
use serde_json::json;

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
    assert!(
        first.provider_outcome.is_none(),
        "sandbox registry adapters never place a provider order"
    );
    assert!(second.provider_outcome.is_none());
    let first = first.intent;
    let second = second.intent;

    assert_eq!(first.id, second.id);
    assert_eq!(PaymentIntentStatus::RequiresConfirmation, first.status);
    assert_eq!("stripe", first.supplier_code);
    assert_eq!("order-1001", first.merchant_order_no);

    let route_decisions = store.route_decisions();
    assert_eq!(1, route_decisions.len());
    assert_eq!(first.id, route_decisions[0].payment_intent_id);
    assert_eq!("stripe", route_decisions[0].supplier_code);
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
        .unwrap()
        .intent;

    let error = service
        .confirm_payment_intent(RuntimeConfirmPaymentIntentCommand {
            tenant_id: "100001".to_owned(),
            payment_intent_id: intent.id.clone(),
            idempotency_key: "idem-confirm-1003".to_owned(),
            requested_at: "2026-05-29T00:00:00Z".to_owned(),
        })
        .await
        .unwrap_err();

    assert!(!error.to_string().contains("CreatePaymentIntent"));
    assert!(error.to_string().contains("ConfirmPaymentIntent"));

    let attempts = store.operation_attempts();
    assert_eq!(1, attempts.len());
    assert_eq!(intent.id, attempts[0].sdkwork_resource_id);
    assert_eq!("stripe", attempts[0].supplier_code);
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
        .unwrap()
        .intent;

    let capture = service
        .capture_payment_intent(RuntimeCapturePaymentIntentCommand {
            tenant_id: "100001".to_owned(),
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
            tenant_id: "100001".to_owned(),
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

#[tokio::test]
async fn create_payment_intent_places_provider_order_when_adapter_is_real() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let registry = default_payment_provider_registry().with_adapter(
        "wechat_pay",
        Arc::new(FakeQrProviderAdapter {
            capabilities: &WECHAT_FAKE_QR_CAPABILITIES,
            code_url: "weixin://wxpay/bizpayurl?pr=fake".to_owned(),
        }),
    );
    let service =
        PaymentIntentRuntimeService::new(&store, registry, &TestUuidGenerator { prefix: "pay" });

    let mut command = create_command("idem-create-2001", "order-qr-2001", "wechat_pay");
    command.payment_method = Some("wechat_native".to_owned());

    let result = service.create_payment_intent(command).await.unwrap();

    assert_eq!("wechat_pay", result.intent.supplier_code);
    assert_eq!("wechat_native", result.intent.payment_method);
    assert_eq!(
        PaymentIntentStatus::RequiresConfirmation,
        result.intent.status
    );
    let outcome = result
        .provider_outcome
        .expect("real adapter places an order");
    assert_eq!("wechat_pay", outcome.supplier_code);
    assert_eq!(
        "weixin://wxpay/bizpayurl?pr=fake",
        outcome.payload["code_url"]
    );
    assert_eq!("wechat_native", outcome.payload["requested_method"]);
    assert_eq!("web", outcome.payload["requested_scene"]);

    let attempts = store.operation_attempts();
    assert_eq!(1, attempts.len());
    assert_eq!(
        PaymentAdapterOperation::CreatePaymentIntent,
        attempts[0].operation
    );
    assert_eq!("SUCCESS", attempts[0].status);
    assert_eq!("idem-create-2001", attempts[0].idempotency_key);
    assert_eq!(result.intent.id, attempts[0].sdkwork_resource_id);
}

#[tokio::test]
async fn create_payment_intent_fails_without_persisting_when_provider_order_fails() {
    let store = InMemoryPaymentIntentRuntimeStore::default();
    let registry = default_payment_provider_registry().with_adapter(
        "wechat_pay",
        Arc::new(FailingCreateProviderAdapter {
            capabilities: &WECHAT_FAKE_QR_CAPABILITIES,
        }),
    );
    let service =
        PaymentIntentRuntimeService::new(&store, registry, &TestUuidGenerator { prefix: "pay" });

    let error = service
        .create_payment_intent(create_command(
            "idem-create-2002",
            "order-qr-2002",
            "wechat_pay",
        ))
        .await
        .unwrap_err();

    assert!(error.to_string().contains("provider"));
    assert!(store.payment_intents().is_empty());
    assert!(store.route_decisions().is_empty());
}

const FAKE_QR_OPERATIONS: &[PaymentAdapterOperation] = &[
    PaymentAdapterOperation::Capabilities,
    PaymentAdapterOperation::CreatePaymentIntent,
];

static WECHAT_FAKE_QR_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    supplier_code: "wechat_pay",
    operations: FAKE_QR_OPERATIONS,
    sandbox_only: false,
};

/// Real-mode (non-sandbox) adapter that records the received create request
/// and returns a WeChat Native style `code_url` scan-to-pay payload.
struct FakeQrProviderAdapter {
    capabilities: &'static PaymentProviderCapabilities,
    code_url: String,
}

impl PaymentProviderAdapter for FakeQrProviderAdapter {
    fn capabilities(&self) -> &'static PaymentProviderCapabilities {
        self.capabilities
    }

    fn create_payment_intent<'a>(
        &'a self,
        request: PaymentCreateIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        Box::pin(async move {
            Ok(PaymentProviderOperationOutcome {
                supplier_code: self.capabilities.supplier_code.to_owned(),
                native_id: request.merchant_order_no.clone(),
                raw_status: Some("CREATED".to_owned()),
                payload: json!({
                    "code_url": self.code_url,
                    "merchant_order_no": request.merchant_order_no,
                    "amount_minor": request.amount_minor,
                    "requested_method": request.metadata["payment_method"],
                    "requested_scene": request.metadata["scene"],
                }),
            })
        })
    }

    fn confirm_payment_intent<'a>(
        &'a self,
        _request: PaymentConfirmPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::ConfirmPaymentIntent,
        )
    }

    fn capture_payment_intent<'a>(
        &'a self,
        _request: PaymentCapturePaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::CapturePaymentIntent,
        )
    }

    fn cancel_payment_intent<'a>(
        &'a self,
        _request: PaymentCancelPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::CancelPaymentIntent,
        )
    }

    fn create_refund<'a>(
        &'a self,
        _request: PaymentCreateRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::CreateRefund,
        )
    }

    fn query_refund<'a>(
        &'a self,
        _request: PaymentQueryRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::QueryRefund,
        )
    }

    fn cancel_refund<'a>(
        &'a self,
        _request: PaymentCancelRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::CancelRefund,
        )
    }

    fn verify_webhook<'a>(
        &'a self,
        _request: PaymentVerifyWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentWebhookVerificationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::VerifyWebhook,
        )
    }

    fn normalize_webhook<'a>(
        &'a self,
        _request: PaymentNormalizeWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNormalizedWebhookEvent> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::NormalizeWebhook,
        )
    }

    fn download_statement<'a>(
        &'a self,
        _request: PaymentDownloadStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementDownloadOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::DownloadStatement,
        )
    }

    fn parse_statement<'a>(
        &'a self,
        _request: PaymentParseStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementParseOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::ParseStatement,
        )
    }

    fn invoke_native_operation<'a>(
        &'a self,
        _request: PaymentNativeOperationRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNativeOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::InvokeNativeOperation,
        )
    }
}

/// Real-mode adapter whose create order always fails, to assert that a failed
/// provider order does not persist a payment intent.
struct FailingCreateProviderAdapter {
    capabilities: &'static PaymentProviderCapabilities,
}

impl PaymentProviderAdapter for FailingCreateProviderAdapter {
    fn capabilities(&self) -> &'static PaymentProviderCapabilities {
        self.capabilities
    }

    fn create_payment_intent<'a>(
        &'a self,
        _request: PaymentCreateIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::CreatePaymentIntent,
        )
    }

    fn confirm_payment_intent<'a>(
        &'a self,
        _request: PaymentConfirmPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::ConfirmPaymentIntent,
        )
    }

    fn capture_payment_intent<'a>(
        &'a self,
        _request: PaymentCapturePaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::CapturePaymentIntent,
        )
    }

    fn cancel_payment_intent<'a>(
        &'a self,
        _request: PaymentCancelPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::CancelPaymentIntent,
        )
    }

    fn create_refund<'a>(
        &'a self,
        _request: PaymentCreateRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::CreateRefund,
        )
    }

    fn query_refund<'a>(
        &'a self,
        _request: PaymentQueryRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::QueryRefund,
        )
    }

    fn cancel_refund<'a>(
        &'a self,
        _request: PaymentCancelRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::CancelRefund,
        )
    }

    fn verify_webhook<'a>(
        &'a self,
        _request: PaymentVerifyWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentWebhookVerificationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::VerifyWebhook,
        )
    }

    fn normalize_webhook<'a>(
        &'a self,
        _request: PaymentNormalizeWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNormalizedWebhookEvent> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::NormalizeWebhook,
        )
    }

    fn download_statement<'a>(
        &'a self,
        _request: PaymentDownloadStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementDownloadOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::DownloadStatement,
        )
    }

    fn parse_statement<'a>(
        &'a self,
        _request: PaymentParseStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementParseOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::ParseStatement,
        )
    }

    fn invoke_native_operation<'a>(
        &'a self,
        _request: PaymentNativeOperationRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNativeOperationOutcome> {
        fake_unsupported(
            self.capabilities.supplier_code,
            PaymentAdapterOperation::InvokeNativeOperation,
        )
    }
}

fn fake_unsupported<T>(
    supplier_code: &'static str,
    operation: PaymentAdapterOperation,
) -> PaymentAdapterFuture<'static, T> {
    Box::pin(async move {
        Err(PaymentProviderRegistryError::UnsupportedCapability {
            supplier_code: supplier_code.to_owned(),
            operation,
        })
    })
}

fn create_command(
    idempotency_key: &str,
    merchant_order_no: &str,
    supplier_code: &str,
) -> RuntimeCreatePaymentIntentCommand {
    RuntimeCreatePaymentIntentCommand {
        tenant_id: "100001".to_owned(),
        organization_id: Some("org-1".to_owned()),
        owner_user_id: "1".to_owned(),
        merchant_order_no: merchant_order_no.to_owned(),
        amount: "88.50".to_owned(),
        currency_code: "CNY".to_owned(),
        subject: "standard checkout".to_owned(),
        business_type: None,
        notify_url: None,
        return_url: None,
        supplier_code: supplier_code.to_owned(),
        payment_method: Some("card".to_owned()),
        scene: Some("web".to_owned()),
        idempotency_key: idempotency_key.to_owned(),
        requested_at: "2026-05-29T00:00:00Z".to_owned(),
    }
}
