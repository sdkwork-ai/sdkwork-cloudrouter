use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::application::{
    default_payment_provider_registry, EntityUuidGenerator, InMemoryPaymentIntentRuntimeStore,
    PaymentAdapterFuture, PaymentAdapterOperation, PaymentCancelPaymentIntentRequest,
    PaymentCancelRefundRequest, PaymentCapturePaymentIntentRequest,
    PaymentConfirmPaymentIntentRequest, PaymentCreateIntentRequest, PaymentCreateRefundRequest,
    PaymentDownloadStatementRequest, PaymentNativeOperationOutcome, PaymentNativeOperationRequest,
    PaymentNormalizeWebhookRequest, PaymentNormalizedWebhookEvent, PaymentParseStatementRequest,
    PaymentProviderAdapter, PaymentProviderCapabilities, PaymentProviderOperationOutcome,
    PaymentProviderRegistry, PaymentProviderRegistryError, PaymentQueryRefundRequest,
    PaymentStatementDownloadOutcome, PaymentStatementParseOutcome, PaymentVerifyWebhookRequest,
    PaymentWebhookVerificationOutcome,
};
use sdkwork_cloudrouter_router_service::domain::DomainResult;
use serde_json::json;
use tower::ServiceExt;

pub mod common;
use common::InternalTrustedSubjectHeaders;

struct TestUuidGenerator;

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(1);
        Ok(format!(
            "payment-api-{}",
            COUNTER.fetch_add(1, Ordering::SeqCst)
        ))
    }
}

fn payment_api_router(store: Arc<InMemoryPaymentIntentRuntimeStore>) -> axum::Router {
    sdkwork_cloudrouter_router_service::api::payment_aggregate_router_with_runtime_store_and_registry(
        store,
        Arc::new(TestUuidGenerator),
        default_payment_provider_registry(),
    )
}

fn payment_api_router_with_registry(
    store: Arc<InMemoryPaymentIntentRuntimeStore>,
    registry: PaymentProviderRegistry,
) -> axum::Router {
    sdkwork_cloudrouter_router_service::api::payment_aggregate_router_with_runtime_store_and_registry(
        store,
        Arc::new(TestUuidGenerator),
        registry,
    )
}

#[tokio::test]
async fn payment_aggregate_api_creates_payment_intent_and_records_route_decision() {
    let store = Arc::new(InMemoryPaymentIntentRuntimeStore::default());
    let router = payment_api_router(store.clone());

    let response = router
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/payment_intents",
            Some("idem-payment-api-1001"),
            r#"{
                    "merchantOrderNo":"order-api-1001",
                    "amount":{"currency":"CNY","value":"88.50"},
                    "subject":"standard checkout",
                    "providerCode":"stripe",
                    "paymentMethod":"card",
                    "scene":"web"
                }"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let payload = response_json(response).await;
    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("order-api-1001", payload["data"]["item"]["merchantOrderNo"]);
    assert_eq!("requires_confirmation", payload["data"]["item"]["status"]);
    assert_eq!("stripe", payload["data"]["item"]["providerCode"]);
    assert_eq!(1, store.route_decisions().len());
}

#[tokio::test]
async fn payment_aggregate_api_confirm_records_operation_attempt_and_returns_capability_error() {
    let store = Arc::new(InMemoryPaymentIntentRuntimeStore::default());
    let router = payment_api_router(store.clone());

    let create_response = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/payment_intents",
            Some("idem-payment-api-1002"),
            r#"{
                    "merchantOrderNo":"order-api-1002",
                    "amount":{"currency":"CNY","value":"30.00"},
                    "subject":"standard checkout",
                    "providerCode":"stripe"
                }"#,
        ))
        .await
        .unwrap();
    let create_payload = response_json(create_response).await;
    let intent_id = create_payload["data"]["item"]["id"].as_str().unwrap();

    let response = router
        .oneshot(trusted_json_request(
            "POST",
            format!("/payments/v3/payment_intents/{intent_id}/confirm").as_str(),
            Some("idem-payment-api-confirm-1002"),
            r#"{}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::UNPROCESSABLE_ENTITY, response.status());
    let payload = response_json(response).await;
    assert_eq!(42201, payload["code"].as_i64().unwrap());
    assert!(payload["detail"]
        .as_str()
        .unwrap()
        .contains("ConfirmPaymentIntent"));
    assert_eq!(1, store.operation_attempts().len());
}

#[tokio::test]
async fn payment_aggregate_api_capture_and_cancel_record_operation_attempts() {
    let store = Arc::new(InMemoryPaymentIntentRuntimeStore::default());
    let router = payment_api_router(store.clone());

    let create_response = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/payment_intents",
            Some("idem-payment-api-1003"),
            r#"{
                    "merchantOrderNo":"order-api-1003",
                    "amount":{"currency":"CNY","value":"30.00"},
                    "subject":"standard checkout",
                    "providerCode":"stripe"
                }"#,
        ))
        .await
        .unwrap();
    let create_payload = response_json(create_response).await;
    let intent_id = create_payload["data"]["item"]["id"].as_str().unwrap();

    let capture = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            format!("/payments/v3/payment_intents/{intent_id}/capture").as_str(),
            Some("idem-payment-api-capture-1003"),
            r#"{"amount":{"currency":"CNY","value":"10.00"},"finalCapture":true}"#,
        ))
        .await
        .unwrap();
    let cancel = router
        .oneshot(trusted_json_request(
            "POST",
            format!("/payments/v3/payment_intents/{intent_id}/cancel").as_str(),
            Some("idem-payment-api-cancel-1003"),
            r#"{"reason":"customer_cancelled"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::UNPROCESSABLE_ENTITY, capture.status());
    assert_eq!(StatusCode::UNPROCESSABLE_ENTITY, cancel.status());
    assert_eq!(2, store.operation_attempts().len());
}

#[tokio::test]
async fn payment_aggregate_api_create_refund_records_failed_refund_runtime() {
    let store = Arc::new(InMemoryPaymentIntentRuntimeStore::default());
    let router = payment_api_router(store.clone());

    let create_response = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/payment_intents",
            Some("idem-payment-api-1004"),
            r#"{
                    "merchantOrderNo":"order-api-1004",
                    "amount":{"currency":"CNY","value":"30.00"},
                    "subject":"standard checkout",
                    "providerCode":"stripe"
                }"#,
        ))
        .await
        .unwrap();
    let create_payload = response_json(create_response).await;
    let intent_id = create_payload["data"]["item"]["id"].as_str().unwrap();

    let response = router
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/refunds",
            Some("idem-payment-api-refund-1004"),
            format!(
                r#"{{
                    "paymentIntentId":"{intent_id}",
                    "merchantRefundNo":"refund-api-1004",
                    "amount":{{"currency":"CNY","value":"10.00"}},
                    "reason":"customer requested refund",
                    "items":[
                        {{
                            "orderItemId":"order-item-api-1004-1",
                            "quantity":1,
                            "refundAmount":{{"currency":"CNY","value":"7.00"}},
                            "taxRefundAmount":{{"currency":"CNY","value":"1.00"}},
                            "shippingRefundAmount":{{"currency":"CNY","value":"0.00"}}
                        }},
                        {{
                            "orderItemId":"order-item-api-1004-2",
                            "quantity":1,
                            "refundAmount":{{"currency":"CNY","value":"2.00"}}
                        }}
                    ]
                }}"#
            )
            .as_str(),
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::UNPROCESSABLE_ENTITY, response.status());
    let payload = response_json(response).await;
    assert_eq!(42201, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains("CreateRefund"));
    assert_eq!(1, store.refunds().len());
    assert_eq!("failed", store.refunds()[0].status.as_str());
    assert_eq!(2, store.refund_items().len());
    assert_eq!(
        "order-item-api-1004-1",
        store.refund_items()[0].order_item_id
    );
    assert_eq!(1, store.refund_attempts().len());
    assert_eq!(1, store.refund_events().len());
    assert_eq!(1, store.operation_attempts().len());
}

#[tokio::test]
async fn payment_aggregate_api_rejects_refund_item_currency_mismatch() {
    let store = Arc::new(InMemoryPaymentIntentRuntimeStore::default());
    let router = payment_api_router(store.clone());

    let create_response = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/payment_intents",
            Some("idem-payment-api-1004-currency"),
            r#"{
                    "merchantOrderNo":"order-api-1004-currency",
                    "amount":{"currency":"CNY","value":"30.00"},
                    "subject":"standard checkout",
                    "providerCode":"stripe"
                }"#,
        ))
        .await
        .unwrap();
    let create_payload = response_json(create_response).await;
    let intent_id = create_payload["data"]["item"]["id"].as_str().unwrap();

    let response = router
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/refunds",
            Some("idem-payment-api-refund-1004-currency"),
            format!(
                r#"{{
                    "paymentIntentId":"{intent_id}",
                    "merchantRefundNo":"refund-api-1004-currency",
                    "amount":{{"currency":"CNY","value":"10.00"}},
                    "reason":"customer requested refund",
                    "items":[{{
                        "orderItemId":"order-item-api-1004-currency",
                        "quantity":1,
                        "refundAmount":{{"currency":"USD","value":"10.00"}}
                    }}]
                }}"#
            )
            .as_str(),
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let payload = response_json(response).await;
    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains("currency"));
    assert!(store.refunds().is_empty());
    assert!(store.refund_items().is_empty());
}

#[tokio::test]
async fn payment_aggregate_api_cancel_terminal_refund_returns_conflict() {
    let store = Arc::new(InMemoryPaymentIntentRuntimeStore::default());
    let router = payment_api_router(store.clone());

    let create_response = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/payment_intents",
            Some("idem-payment-api-1005"),
            r#"{
                    "merchantOrderNo":"order-api-1005",
                    "amount":{"currency":"CNY","value":"30.00"},
                    "subject":"standard checkout",
                    "providerCode":"stripe"
                }"#,
        ))
        .await
        .unwrap();
    let create_payload = response_json(create_response).await;
    let intent_id = create_payload["data"]["item"]["id"].as_str().unwrap();
    let _ = router
        .clone()
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/refunds",
            Some("idem-payment-api-refund-1005"),
            format!(
                r#"{{
                    "paymentIntentId":"{intent_id}",
                    "merchantRefundNo":"refund-api-1005",
                    "amount":{{"currency":"CNY","value":"10.00"}},
                    "reason":"customer requested refund"
                }}"#
            )
            .as_str(),
        ))
        .await
        .unwrap();
    let refund_id = store.refunds()[0].id.clone();

    let response = router
        .oneshot(trusted_json_request(
            "POST",
            format!("/payments/v3/refunds/{refund_id}/cancel").as_str(),
            Some("idem-payment-api-refund-cancel-1005"),
            r#"{"reason":"operator canceled"}"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::CONFLICT, response.status());
    let payload = response_json(response).await;
    assert_eq!(40901, payload["code"].as_i64().unwrap());
    assert!(payload["detail"].as_str().unwrap().contains("terminal"));
}

fn trusted_json_request(
    method: &str,
    path: &str,
    idempotency_key: Option<&str>,
    body: &str,
) -> Request<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .internal_trusted_subject(100001, 0, 30);
    if let Some(idempotency_key) = idempotency_key {
        builder = builder.header("Idempotency-Key", idempotency_key);
    }
    builder.body(Body::from(body.to_owned())).unwrap()
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

#[tokio::test]
async fn payment_aggregate_api_returns_scan_to_pay_qr_code_next_action_for_wechat_native() {
    let store = Arc::new(InMemoryPaymentIntentRuntimeStore::default());
    let registry = default_payment_provider_registry().with_adapter(
        "wechat_pay",
        Arc::new(FakeWeChatNativeAdapter {
            capabilities: &WECHAT_FAKE_QR_CAPABILITIES,
            code_url: "weixin://wxpay/bizpayurl?pr=api".to_owned(),
        }),
    );
    let router = payment_api_router_with_registry(store.clone(), registry);

    let response = router
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/payment_intents",
            Some("idem-payment-api-qr-1001"),
            r#"{
                    "merchantOrderNo":"order-api-qr-1001",
                    "amount":{"currency":"CNY","value":"0.01"},
                    "subject":"qr checkout",
                    "providerCode":"wechat_pay",
                    "paymentMethod":"wechat_native",
                    "scene":"web"
                }"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let payload = response_json(response).await;
    assert_eq!("wechat_pay", payload["data"]["item"]["providerCode"]);
    assert_eq!(
        "qr_code",
        payload["data"]["item"]["nextAction"]["type"]
    );
    assert_eq!(
        "image",
        payload["data"]["item"]["nextAction"]["qrCode"]["kind"]
    );
    assert_eq!(
        "provider_asset",
        payload["data"]["item"]["nextAction"]["qrCode"]["source"]
    );
    assert_eq!(
        "weixin://wxpay/bizpayurl?pr=api",
        payload["data"]["item"]["nextAction"]["qrCode"]["uri"]
    );
    assert_eq!(
        "order-api-qr-1001",
        payload["data"]["item"]["providerNative"]["providerPaymentId"]
    );
    assert_eq!(1, store.operation_attempts().len());
    assert_eq!("SUCCESS", store.operation_attempts()[0].status);
}

#[tokio::test]
async fn payment_aggregate_api_returns_scan_to_pay_qr_code_next_action_for_alipay_precreate() {
    let store = Arc::new(InMemoryPaymentIntentRuntimeStore::default());
    let registry = default_payment_provider_registry().with_adapter(
        "alipay",
        Arc::new(FakeAlipayPrecreateAdapter {
            capabilities: &ALIPAY_FAKE_QR_CAPABILITIES,
        }),
    );
    let router = payment_api_router_with_registry(store.clone(), registry);

    let response = router
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/payment_intents",
            Some("idem-payment-api-qr-1002"),
            r#"{
                    "merchantOrderNo":"order-api-qr-1002",
                    "amount":{"currency":"CNY","value":"0.01"},
                    "subject":"qr checkout",
                    "providerCode":"alipay",
                    "paymentMethod":"alipay_qr",
                    "scene":"web"
                }"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let payload = response_json(response).await;
    assert_eq!("qr_code", payload["data"]["item"]["nextAction"]["type"]);
    assert_eq!(
        "https://qr.alipay.com/api-qr-1002",
        payload["data"]["item"]["nextAction"]["qrCode"]["uri"]
    );
    assert_eq!(
        "20260530220000000002",
        payload["data"]["item"]["providerNative"]["tradeNo"]
    );
}

#[tokio::test]
async fn payment_aggregate_api_returns_redirect_next_action_for_alipay_page_pay() {
    let store = Arc::new(InMemoryPaymentIntentRuntimeStore::default());
    let registry = default_payment_provider_registry().with_adapter(
        "alipay",
        Arc::new(FakeAlipayPagePayAdapter {
            capabilities: &ALIPAY_FAKE_PAGE_PAY_CAPABILITIES,
        }),
    );
    let router = payment_api_router_with_registry(store.clone(), registry);

    let response = router
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/payment_intents",
            Some("idem-payment-api-redirect-1001"),
            r#"{
                    "merchantOrderNo":"order-api-redirect-1001",
                    "amount":{"currency":"CNY","value":"0.01"},
                    "subject":"redirect checkout",
                    "providerCode":"alipay",
                    "paymentMethod":"alipay_page",
                    "scene":"web"
                }"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let payload = response_json(response).await;
    assert_eq!(
        "redirect",
        payload["data"]["item"]["nextAction"]["type"]
    );
    assert_eq!(
        "https://openapi.alipay.test/gateway.do?method=alipay.trade.page.pay",
        payload["data"]["item"]["nextAction"]["redirectUrl"]
    );
    assert_eq!(
        "20260530220000000001",
        payload["data"]["item"]["providerNative"]["tradeNo"]
    );
}

#[tokio::test]
async fn payment_aggregate_api_returns_no_next_action_for_sandbox_provider() {
    let store = Arc::new(InMemoryPaymentIntentRuntimeStore::default());
    let router = payment_api_router(store.clone());

    let response = router
        .oneshot(trusted_json_request(
            "POST",
            "/payments/v3/payment_intents",
            Some("idem-payment-api-sandbox-1001"),
            r#"{
                    "merchantOrderNo":"order-api-sandbox-1001",
                    "amount":{"currency":"CNY","value":"0.01"},
                    "subject":"sandbox checkout",
                    "providerCode":"stripe",
                    "paymentMethod":"card",
                    "scene":"web"
                }"#,
        ))
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let payload = response_json(response).await;
    assert!(payload["data"]["item"].get("nextAction").is_none());
    assert!(payload["data"]["item"].get("providerNative").is_none());
    assert_eq!(0, store.operation_attempts().len());
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

static ALIPAY_FAKE_QR_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    supplier_code: "alipay",
    operations: FAKE_QR_OPERATIONS,
    sandbox_only: false,
};

static ALIPAY_FAKE_PAGE_PAY_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    supplier_code: "alipay",
    operations: FAKE_QR_OPERATIONS,
    sandbox_only: false,
};

/// Real-mode adapter mimicking the WeChat Pay Native scan-to-pay response.
struct FakeWeChatNativeAdapter {
    capabilities: &'static PaymentProviderCapabilities,
    code_url: String,
}

impl PaymentProviderAdapter for FakeWeChatNativeAdapter {
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
                    "out_trade_no": request.merchant_order_no,
                }),
            })
        })
    }

    fn confirm_payment_intent<'a>(
        &'a self,
        _request: PaymentConfirmPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::ConfirmPaymentIntent)
    }

    fn capture_payment_intent<'a>(
        &'a self,
        _request: PaymentCapturePaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CapturePaymentIntent)
    }

    fn cancel_payment_intent<'a>(
        &'a self,
        _request: PaymentCancelPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CancelPaymentIntent)
    }

    fn create_refund<'a>(
        &'a self,
        _request: PaymentCreateRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CreateRefund)
    }

    fn query_refund<'a>(
        &'a self,
        _request: PaymentQueryRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::QueryRefund)
    }

    fn cancel_refund<'a>(
        &'a self,
        _request: PaymentCancelRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CancelRefund)
    }

    fn verify_webhook<'a>(
        &'a self,
        _request: PaymentVerifyWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentWebhookVerificationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::VerifyWebhook)
    }

    fn normalize_webhook<'a>(
        &'a self,
        _request: PaymentNormalizeWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNormalizedWebhookEvent> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::NormalizeWebhook)
    }

    fn download_statement<'a>(
        &'a self,
        _request: PaymentDownloadStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementDownloadOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::DownloadStatement)
    }

    fn parse_statement<'a>(
        &'a self,
        _request: PaymentParseStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementParseOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::ParseStatement)
    }

    fn invoke_native_operation<'a>(
        &'a self,
        _request: PaymentNativeOperationRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNativeOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::InvokeNativeOperation)
    }
}

/// Real-mode adapter mimicking the Alipay Precreate scan-to-pay response.
struct FakeAlipayPrecreateAdapter {
    capabilities: &'static PaymentProviderCapabilities,
}

impl PaymentProviderAdapter for FakeAlipayPrecreateAdapter {
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
                native_id: Some("20260530220000000002".to_owned()),
                raw_status: Some("WAIT_BUYER_PAY".to_owned()),
                payload: json!({
                    "out_trade_no": request.merchant_order_no,
                    "trade_no": "20260530220000000002",
                    "qr_code": "https://qr.alipay.com/api-qr-1002",
                }),
            })
        })
    }

    fn confirm_payment_intent<'a>(
        &'a self,
        _request: PaymentConfirmPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::ConfirmPaymentIntent)
    }

    fn capture_payment_intent<'a>(
        &'a self,
        _request: PaymentCapturePaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CapturePaymentIntent)
    }

    fn cancel_payment_intent<'a>(
        &'a self,
        _request: PaymentCancelPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CancelPaymentIntent)
    }

    fn create_refund<'a>(
        &'a self,
        _request: PaymentCreateRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CreateRefund)
    }

    fn query_refund<'a>(
        &'a self,
        _request: PaymentQueryRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::QueryRefund)
    }

    fn cancel_refund<'a>(
        &'a self,
        _request: PaymentCancelRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CancelRefund)
    }

    fn verify_webhook<'a>(
        &'a self,
        _request: PaymentVerifyWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentWebhookVerificationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::VerifyWebhook)
    }

    fn normalize_webhook<'a>(
        &'a self,
        _request: PaymentNormalizeWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNormalizedWebhookEvent> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::NormalizeWebhook)
    }

    fn download_statement<'a>(
        &'a self,
        _request: PaymentDownloadStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementDownloadOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::DownloadStatement)
    }

    fn parse_statement<'a>(
        &'a self,
        _request: PaymentParseStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementParseOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::ParseStatement)
    }

    fn invoke_native_operation<'a>(
        &'a self,
        _request: PaymentNativeOperationRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNativeOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::InvokeNativeOperation)
    }
}

/// Real-mode adapter mimicking the Alipay page-pay cashier redirect response.
struct FakeAlipayPagePayAdapter {
    capabilities: &'static PaymentProviderCapabilities,
}

impl PaymentProviderAdapter for FakeAlipayPagePayAdapter {
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
                native_id: Some("20260530220000000001".to_owned()),
                raw_status: Some("WAIT_BUYER_PAY".to_owned()),
                payload: json!({
                    "out_trade_no": request.merchant_order_no,
                    "trade_no": "20260530220000000001",
                    "page_pay_url": "https://openapi.alipay.test/gateway.do?method=alipay.trade.page.pay",
                }),
            })
        })
    }

    fn confirm_payment_intent<'a>(
        &'a self,
        _request: PaymentConfirmPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::ConfirmPaymentIntent)
    }

    fn capture_payment_intent<'a>(
        &'a self,
        _request: PaymentCapturePaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CapturePaymentIntent)
    }

    fn cancel_payment_intent<'a>(
        &'a self,
        _request: PaymentCancelPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CancelPaymentIntent)
    }

    fn create_refund<'a>(
        &'a self,
        _request: PaymentCreateRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CreateRefund)
    }

    fn query_refund<'a>(
        &'a self,
        _request: PaymentQueryRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::QueryRefund)
    }

    fn cancel_refund<'a>(
        &'a self,
        _request: PaymentCancelRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::CancelRefund)
    }

    fn verify_webhook<'a>(
        &'a self,
        _request: PaymentVerifyWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentWebhookVerificationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::VerifyWebhook)
    }

    fn normalize_webhook<'a>(
        &'a self,
        _request: PaymentNormalizeWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNormalizedWebhookEvent> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::NormalizeWebhook)
    }

    fn download_statement<'a>(
        &'a self,
        _request: PaymentDownloadStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementDownloadOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::DownloadStatement)
    }

    fn parse_statement<'a>(
        &'a self,
        _request: PaymentParseStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementParseOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::ParseStatement)
    }

    fn invoke_native_operation<'a>(
        &'a self,
        _request: PaymentNativeOperationRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNativeOperationOutcome> {
        fake_unsupported(self.capabilities.supplier_code, PaymentAdapterOperation::InvokeNativeOperation)
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
