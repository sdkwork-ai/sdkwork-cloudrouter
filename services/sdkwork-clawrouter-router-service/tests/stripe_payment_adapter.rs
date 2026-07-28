use std::sync::{Arc, Mutex};

use hmac::{Hmac, Mac};
use sdkwork_clawrouter_router_service::application::{
    PaymentCancelPaymentIntentRequest, PaymentCancelRefundRequest,
    PaymentCapturePaymentIntentRequest, PaymentConfirmPaymentIntentRequest,
    PaymentCreateIntentRequest, PaymentCreateRefundRequest, PaymentDownloadStatementRequest,
    PaymentNormalizeWebhookRequest, PaymentParseStatementRequest, PaymentProviderAdapter,
    PaymentProviderRegistryError, PaymentQueryRefundRequest, PaymentVerifyWebhookRequest,
    StripePaymentHttpClient, StripePaymentProviderAdapter, StripePaymentProviderConfig,
};
use serde_json::json;
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, PartialEq, Eq)]
struct RecordedStripeRequest {
    method: String,
    path: String,
    idempotency_key: Option<String>,
    form: Vec<(String, String)>,
}

#[derive(Clone)]
struct RecordingStripeHttpClient {
    requests: Arc<Mutex<Vec<RecordedStripeRequest>>>,
    response: serde_json::Value,
}

impl RecordingStripeHttpClient {
    fn new(response: serde_json::Value) -> Self {
        Self {
            requests: Arc::new(Mutex::new(Vec::new())),
            response,
        }
    }

    fn recorded_requests(&self) -> Vec<RecordedStripeRequest> {
        self.requests.lock().unwrap().clone()
    }
}

impl StripePaymentHttpClient for RecordingStripeHttpClient {
    fn post_form<'a>(
        &'a self,
        path: &'a str,
        idempotency_key: Option<&'a str>,
        form: Vec<(String, String)>,
    ) -> sdkwork_clawrouter_router_service::application::PaymentAdapterFuture<'a, serde_json::Value>
    {
        Box::pin(async move {
            self.requests.lock().unwrap().push(RecordedStripeRequest {
                method: "POST".to_owned(),
                path: path.to_owned(),
                idempotency_key: idempotency_key.map(str::to_owned),
                form,
            });
            Ok(self.response.clone())
        })
    }

    fn get<'a>(
        &'a self,
        path: &'a str,
    ) -> sdkwork_clawrouter_router_service::application::PaymentAdapterFuture<'a, serde_json::Value>
    {
        Box::pin(async move {
            self.requests.lock().unwrap().push(RecordedStripeRequest {
                method: "GET".to_owned(),
                path: path.to_owned(),
                idempotency_key: None,
                form: Vec::new(),
            });
            Ok(self.response.clone())
        })
    }
}

#[tokio::test]
async fn stripe_create_payment_intent_maps_standard_request_to_form_request() {
    let http_client = RecordingStripeHttpClient::new(json!({
        "id": "pi_123",
        "status": "requires_payment_method",
        "client_secret": "pi_123_secret_456"
    }));
    let adapter = StripePaymentProviderAdapter::new(
        StripePaymentProviderConfig {
            secret_key: "sk_test_123".to_owned(),
            webhook_secret: None,
        },
        Arc::new(http_client.clone()),
    )
    .unwrap();

    let outcome = adapter
        .create_payment_intent(PaymentCreateIntentRequest {
            tenant_id: Some(42),
            merchant_order_no: Some("order-1".to_owned()),
            amount_minor: Some(1234),
            currency: Some("CNY".to_owned()),
            metadata: json!({
                "idempotency_key": "idem-create-1",
                "customer_id": "cus_123"
            }),
        })
        .await
        .unwrap();

    assert_eq!("stripe", outcome.supplier_code);
    assert_eq!(Some("pi_123".to_owned()), outcome.native_id);
    assert_eq!(
        Some("requires_payment_method".to_owned()),
        outcome.raw_status
    );
    assert_eq!("pi_123_secret_456", outcome.payload["client_secret"]);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("/v1/payment_intents", requests[0].path);
    assert_eq!(
        Some("idem-create-1".to_owned()),
        requests[0].idempotency_key
    );
    assert_form_contains(&requests[0].form, "amount", "1234");
    assert_form_contains(&requests[0].form, "currency", "cny");
    assert_form_contains(
        &requests[0].form,
        "automatic_payment_methods[enabled]",
        "true",
    );
    assert_form_contains(&requests[0].form, "metadata[tenant_id]", "42");
    assert_form_contains(&requests[0].form, "metadata[merchant_order_no]", "order-1");
    assert_form_contains(&requests[0].form, "metadata[customer_id]", "cus_123");
}

#[tokio::test]
async fn stripe_create_refund_maps_standard_request_to_form_request() {
    let http_client = RecordingStripeHttpClient::new(json!({
        "id": "re_123",
        "status": "succeeded"
    }));
    let adapter = StripePaymentProviderAdapter::new(
        StripePaymentProviderConfig {
            secret_key: "sk_test_123".to_owned(),
            webhook_secret: None,
        },
        Arc::new(http_client.clone()),
    )
    .unwrap();

    let outcome = adapter
        .create_refund(PaymentCreateRefundRequest {
            payment_intent_id: Some("pi_123".to_owned()),
            refund_no: Some("refund-1".to_owned()),
            amount_minor: Some(500),
            reason: Some("customer_requested".to_owned()),
            metadata: json!({ "idempotency_key": "idem-refund-1" }),
        })
        .await
        .unwrap();

    assert_eq!("stripe", outcome.supplier_code);
    assert_eq!(Some("re_123".to_owned()), outcome.native_id);
    assert_eq!(Some("succeeded".to_owned()), outcome.raw_status);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("/v1/refunds", requests[0].path);
    assert_eq!(
        Some("idem-refund-1".to_owned()),
        requests[0].idempotency_key
    );
    assert_form_contains(&requests[0].form, "payment_intent", "pi_123");
    assert_form_contains(&requests[0].form, "amount", "500");
    assert_form_contains(&requests[0].form, "reason", "requested_by_customer");
    assert_form_contains(&requests[0].form, "metadata[refund_no]", "refund-1");
}

#[tokio::test]
async fn stripe_query_refund_maps_standard_request_to_retrieve_endpoint() {
    let http_client = RecordingStripeHttpClient::new(json!({
        "id": "re_123",
        "status": "succeeded"
    }));
    let adapter = stripe_adapter(http_client.clone());

    let outcome = adapter
        .query_refund(PaymentQueryRefundRequest {
            refund_id: Some("re_123".to_owned()),
            refund_no: None,
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(Some("re_123".to_owned()), outcome.native_id);
    assert_eq!(Some("succeeded".to_owned()), outcome.raw_status);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("GET", requests[0].method);
    assert_eq!("/v1/refunds/re_123", requests[0].path);
}

#[tokio::test]
async fn stripe_cancel_refund_maps_standard_request_to_cancel_endpoint() {
    let http_client = RecordingStripeHttpClient::new(json!({
        "id": "re_123",
        "status": "canceled"
    }));
    let adapter = stripe_adapter(http_client.clone());

    let outcome = adapter
        .cancel_refund(PaymentCancelRefundRequest {
            refund_id: Some("re_123".to_owned()),
            refund_no: None,
            reason: Some("customer_requested".to_owned()),
            metadata: json!({ "idempotency_key": "idem-cancel-refund-1" }),
        })
        .await
        .unwrap();

    assert_eq!(Some("canceled".to_owned()), outcome.raw_status);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("POST", requests[0].method);
    assert_eq!("/v1/refunds/re_123/cancel", requests[0].path);
    assert_eq!(
        Some("idem-cancel-refund-1".to_owned()),
        requests[0].idempotency_key
    );
    assert_form_contains(
        &requests[0].form,
        "metadata[cancel_reason]",
        "customer_requested",
    );
}

#[tokio::test]
async fn stripe_confirm_payment_intent_maps_standard_request_to_confirm_endpoint() {
    let http_client = RecordingStripeHttpClient::new(json!({
        "id": "pi_123",
        "status": "requires_capture"
    }));
    let adapter = stripe_adapter(http_client.clone());

    let outcome = adapter
        .confirm_payment_intent(PaymentConfirmPaymentIntentRequest {
            payment_intent_id: Some("pi_123".to_owned()),
            metadata: json!({ "idempotency_key": "idem-confirm-1" }),
        })
        .await
        .unwrap();

    assert_eq!(Some("pi_123".to_owned()), outcome.native_id);
    assert_eq!(Some("requires_capture".to_owned()), outcome.raw_status);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("/v1/payment_intents/pi_123/confirm", requests[0].path);
    assert_eq!(
        Some("idem-confirm-1".to_owned()),
        requests[0].idempotency_key
    );
}

#[tokio::test]
async fn stripe_capture_payment_intent_maps_amount_to_capture() {
    let http_client = RecordingStripeHttpClient::new(json!({
        "id": "pi_123",
        "status": "succeeded"
    }));
    let adapter = stripe_adapter(http_client.clone());

    let outcome = adapter
        .capture_payment_intent(PaymentCapturePaymentIntentRequest {
            payment_intent_id: Some("pi_123".to_owned()),
            amount_minor: Some(900),
            metadata: json!({ "idempotency_key": "idem-capture-1" }),
        })
        .await
        .unwrap();

    assert_eq!(Some("succeeded".to_owned()), outcome.raw_status);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("/v1/payment_intents/pi_123/capture", requests[0].path);
    assert_eq!(
        Some("idem-capture-1".to_owned()),
        requests[0].idempotency_key
    );
    assert_form_contains(&requests[0].form, "amount_to_capture", "900");
}

#[tokio::test]
async fn stripe_cancel_payment_intent_maps_cancellation_reason() {
    let http_client = RecordingStripeHttpClient::new(json!({
        "id": "pi_123",
        "status": "canceled"
    }));
    let adapter = stripe_adapter(http_client.clone());

    let outcome = adapter
        .cancel_payment_intent(PaymentCancelPaymentIntentRequest {
            payment_intent_id: Some("pi_123".to_owned()),
            reason: Some("customer_requested".to_owned()),
            metadata: json!({ "idempotency_key": "idem-cancel-1" }),
        })
        .await
        .unwrap();

    assert_eq!(Some("canceled".to_owned()), outcome.raw_status);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("/v1/payment_intents/pi_123/cancel", requests[0].path);
    assert_eq!(
        Some("idem-cancel-1".to_owned()),
        requests[0].idempotency_key
    );
    assert_form_contains(
        &requests[0].form,
        "cancellation_reason",
        "requested_by_customer",
    );
}

#[tokio::test]
async fn stripe_verify_webhook_accepts_valid_signature_and_rejects_invalid_signature() {
    let adapter = StripePaymentProviderAdapter::new(
        StripePaymentProviderConfig {
            secret_key: "sk_test_123".to_owned(),
            webhook_secret: Some("whsec_test_123".to_owned()),
        },
        Arc::new(RecordingStripeHttpClient::new(json!({}))),
    )
    .unwrap();
    let body = br#"{"id":"evt_123","type":"payment_intent.succeeded"}"#.to_vec();
    let timestamp = 1_717_171_717;
    let signature = stripe_signature("whsec_test_123", timestamp, &body);

    let valid = adapter
        .verify_webhook(PaymentVerifyWebhookRequest {
            headers: vec![("Stripe-Signature".to_owned(), signature)],
            body: body.clone(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert!(valid.verified);
    assert_eq!(Some("evt_123".to_owned()), valid.provider_event_id);

    let invalid = adapter
        .verify_webhook(PaymentVerifyWebhookRequest {
            headers: vec![(
                "Stripe-Signature".to_owned(),
                "t=1717171717,v1=bad".to_owned(),
            )],
            body,
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert!(!invalid.verified);
    assert_eq!(None, invalid.provider_event_id);
}

#[tokio::test]
async fn stripe_normalize_webhook_extracts_standard_event_fields() {
    let adapter = StripePaymentProviderAdapter::new(
        StripePaymentProviderConfig {
            secret_key: "sk_test_123".to_owned(),
            webhook_secret: None,
        },
        Arc::new(RecordingStripeHttpClient::new(json!({}))),
    )
    .unwrap();

    let event = adapter
        .normalize_webhook(PaymentNormalizeWebhookRequest {
            headers: vec![],
            body: br#"{"id":"evt_123","type":"payment_intent.succeeded","data":{"object":{"id":"pi_123"}}}"#
                .to_vec(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!("stripe", event.supplier_code);
    assert_eq!(
        Some("payment_intent.succeeded".to_owned()),
        event.event_type
    );
    assert_eq!(Some("evt_123".to_owned()), event.provider_event_id);
    assert_eq!("pi_123", event.payload["data"]["object"]["id"]);
}

#[tokio::test]
async fn stripe_download_statement_maps_date_to_balance_transaction_query() {
    let http_client = RecordingStripeHttpClient::new(json!({
        "object": "list",
        "data": [{"id": "txn_1", "amount": 1000, "currency": "usd"}]
    }));
    let adapter = stripe_adapter(http_client.clone());

    let statement = adapter
        .download_statement(PaymentDownloadStatementRequest {
            statement_date: Some("2026-05-30".to_owned()),
            statement_type: Some("balance_transactions".to_owned()),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(
        Some("stripe_balance_transactions_2026-05-30".to_owned()),
        statement.statement_id
    );
    assert_eq!("stripe", statement.metadata["supplier_code"]);
    assert_eq!(
        "stripe_balance_transactions",
        statement.metadata["source_type"]
    );
    assert_eq!(
        json!("list"),
        serde_json::from_slice::<serde_json::Value>(&statement.content).unwrap()["object"]
    );

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("GET", requests[0].method);
    assert_eq!(
        "/v1/balance_transactions?limit=100&created%5Bgte%5D=1780099200&created%5Blt%5D=1780185600",
        requests[0].path
    );
}

#[tokio::test]
async fn stripe_parse_statement_counts_balance_transaction_rows() {
    let adapter = StripePaymentProviderAdapter::new(
        StripePaymentProviderConfig {
            secret_key: "sk_test_123".to_owned(),
            webhook_secret: None,
        },
        Arc::new(RecordingStripeHttpClient::new(json!({}))),
    )
    .unwrap();

    let statement = adapter
        .parse_statement(PaymentParseStatementRequest {
            statement_id: Some("stmt_2026_05_30".to_owned()),
            content: br#"{
                "object": "list",
                "data": [
                    {"id": "txn_1", "type": "charge", "amount": 1000, "currency": "usd", "fee": 59, "net": 941},
                    {"id": "txn_2", "type": "refund", "amount": -500, "currency": "usd", "fee": 0, "net": -500}
                ]
            }"#
            .to_vec(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(Some("stmt_2026_05_30".to_owned()), statement.statement_id);
    assert_eq!(2, statement.item_count);
    assert_eq!(
        "stripe_balance_transactions",
        statement.metadata["source_type"]
    );
    assert_eq!(1000, statement.metadata["gross_amount_minor"]);
    assert_eq!(59, statement.metadata["fee_amount_minor"]);
    assert_eq!(441, statement.metadata["net_amount_minor"]);
}

#[tokio::test]
async fn stripe_create_payment_intent_rejects_missing_required_amount() {
    let adapter = StripePaymentProviderAdapter::new(
        StripePaymentProviderConfig {
            secret_key: "sk_test_123".to_owned(),
            webhook_secret: None,
        },
        Arc::new(RecordingStripeHttpClient::new(json!({}))),
    )
    .unwrap();

    let error = adapter
        .create_payment_intent(PaymentCreateIntentRequest {
            currency: Some("USD".to_owned()),
            ..Default::default()
        })
        .await
        .expect_err("missing amount must be rejected before provider call");

    assert!(matches!(
        error,
        PaymentProviderRegistryError::InvalidProviderRequest { .. }
    ));
}

fn assert_form_contains(form: &[(String, String)], name: &str, value: &str) {
    assert!(
        form.iter()
            .any(|(form_name, form_value)| form_name == name && form_value == value),
        "expected form field {name}={value}, got {form:?}"
    );
}

fn stripe_adapter(http_client: RecordingStripeHttpClient) -> StripePaymentProviderAdapter {
    StripePaymentProviderAdapter::new(
        StripePaymentProviderConfig {
            secret_key: "sk_test_123".to_owned(),
            webhook_secret: None,
        },
        Arc::new(http_client),
    )
    .unwrap()
}

fn stripe_signature(secret: &str, timestamp: i64, body: &[u8]) -> String {
    let signed_payload = format!("{}.", timestamp);
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
    mac.update(signed_payload.as_bytes());
    mac.update(body);
    let digest = hex::encode(mac.finalize().into_bytes());
    format!("t={timestamp},v1={digest}")
}
