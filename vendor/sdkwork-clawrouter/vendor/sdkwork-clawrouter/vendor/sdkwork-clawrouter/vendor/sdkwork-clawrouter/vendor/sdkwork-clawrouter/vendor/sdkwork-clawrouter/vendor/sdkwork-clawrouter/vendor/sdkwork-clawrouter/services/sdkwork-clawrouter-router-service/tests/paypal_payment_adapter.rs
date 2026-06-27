use std::sync::{Arc, Mutex};

use sdkwork_clawrouter_router_service::application::{
    PayPalPaymentHttpClient, PayPalPaymentProviderAdapter, PayPalPaymentProviderConfig,
    PaymentCapturePaymentIntentRequest, PaymentCreateIntentRequest, PaymentCreateRefundRequest,
    PaymentDownloadStatementRequest, PaymentNormalizeWebhookRequest, PaymentParseStatementRequest,
    PaymentProviderAdapter, PaymentProviderRegistryError, PaymentQueryRefundRequest,
    PaymentVerifyWebhookRequest,
};
use serde_json::{json, Value};

#[derive(Debug, Clone, PartialEq, Eq)]
struct RecordedPayPalRequest {
    method: String,
    path: String,
    request_id: Option<String>,
    payload: Value,
}

#[derive(Clone)]
struct RecordingPayPalHttpClient {
    requests: Arc<Mutex<Vec<RecordedPayPalRequest>>>,
    response: Value,
}

impl RecordingPayPalHttpClient {
    fn new(response: Value) -> Self {
        Self {
            requests: Arc::new(Mutex::new(Vec::new())),
            response,
        }
    }

    fn recorded_requests(&self) -> Vec<RecordedPayPalRequest> {
        self.requests.lock().unwrap().clone()
    }
}

impl PayPalPaymentHttpClient for RecordingPayPalHttpClient {
    fn post_json<'a>(
        &'a self,
        path: &'a str,
        request_id: Option<&'a str>,
        payload: Value,
    ) -> sdkwork_clawrouter_router_service::application::PaymentAdapterFuture<'a, Value> {
        Box::pin(async move {
            self.requests.lock().unwrap().push(RecordedPayPalRequest {
                method: "POST".to_owned(),
                path: path.to_owned(),
                request_id: request_id.map(str::to_owned),
                payload,
            });
            Ok(self.response.clone())
        })
    }

    fn get<'a>(
        &'a self,
        path: &'a str,
    ) -> sdkwork_clawrouter_router_service::application::PaymentAdapterFuture<'a, Value> {
        Box::pin(async move {
            self.requests.lock().unwrap().push(RecordedPayPalRequest {
                method: "GET".to_owned(),
                path: path.to_owned(),
                request_id: None,
                payload: json!({}),
            });
            Ok(self.response.clone())
        })
    }
}

#[tokio::test]
async fn paypal_create_order_maps_standard_payment_intent_to_order_request() {
    let http_client = RecordingPayPalHttpClient::new(json!({
        "id": "ORDER-123",
        "status": "CREATED",
        "links": [{"rel": "approve", "href": "https://paypal.test/checkoutnow?token=ORDER-123"}]
    }));
    let adapter = paypal_adapter(http_client.clone());

    let outcome = adapter
        .create_payment_intent(PaymentCreateIntentRequest {
            tenant_id: Some(42),
            merchant_order_no: Some("order-1".to_owned()),
            amount_minor: Some(1234),
            currency: Some("USD".to_owned()),
            metadata: json!({ "idempotency_key": "idem-paypal-create-1" }),
        })
        .await
        .unwrap();

    assert_eq!("paypal", outcome.provider_code);
    assert_eq!(Some("ORDER-123".to_owned()), outcome.native_id);
    assert_eq!(Some("CREATED".to_owned()), outcome.raw_status);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("POST", requests[0].method);
    assert_eq!("/v2/checkout/orders", requests[0].path);
    assert_eq!(
        Some("idem-paypal-create-1".to_owned()),
        requests[0].request_id
    );
    assert_eq!("CAPTURE", requests[0].payload["intent"]);
    assert_eq!(
        "USD",
        requests[0].payload["purchase_units"][0]["amount"]["currency_code"]
    );
    assert_eq!(
        "12.34",
        requests[0].payload["purchase_units"][0]["amount"]["value"]
    );
    assert_eq!(
        "order-1",
        requests[0].payload["purchase_units"][0]["custom_id"]
    );
}

#[tokio::test]
async fn paypal_capture_order_maps_standard_capture_to_order_capture_endpoint() {
    let http_client = RecordingPayPalHttpClient::new(json!({
        "id": "ORDER-123",
        "status": "COMPLETED",
        "purchase_units": [{
            "payments": {
                "captures": [{"id": "CAPTURE-123", "status": "COMPLETED"}]
            }
        }]
    }));
    let adapter = paypal_adapter(http_client.clone());

    let outcome = adapter
        .capture_payment_intent(PaymentCapturePaymentIntentRequest {
            payment_intent_id: Some("ORDER-123".to_owned()),
            amount_minor: None,
            metadata: json!({ "idempotency_key": "idem-paypal-capture-1" }),
        })
        .await
        .unwrap();

    assert_eq!(Some("ORDER-123".to_owned()), outcome.native_id);
    assert_eq!(Some("COMPLETED".to_owned()), outcome.raw_status);
    assert_eq!("CAPTURE-123", outcome.payload["sdkwork_capture_id"]);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("POST", requests[0].method);
    assert_eq!("/v2/checkout/orders/ORDER-123/capture", requests[0].path);
    assert_eq!(
        Some("idem-paypal-capture-1".to_owned()),
        requests[0].request_id
    );
}

#[tokio::test]
async fn paypal_create_refund_maps_capture_refund_request() {
    let http_client = RecordingPayPalHttpClient::new(json!({
        "id": "REFUND-123",
        "status": "COMPLETED"
    }));
    let adapter = paypal_adapter(http_client.clone());

    let outcome = adapter
        .create_refund(PaymentCreateRefundRequest {
            payment_intent_id: Some("CAPTURE-123".to_owned()),
            refund_no: Some("refund-1".to_owned()),
            amount_minor: Some(500),
            reason: Some("customer_requested".to_owned()),
            metadata: json!({ "idempotency_key": "idem-paypal-refund-1", "currency": "USD" }),
        })
        .await
        .unwrap();

    assert_eq!(Some("REFUND-123".to_owned()), outcome.native_id);
    assert_eq!(Some("COMPLETED".to_owned()), outcome.raw_status);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("/v2/payments/captures/CAPTURE-123/refund", requests[0].path);
    assert_eq!(
        Some("idem-paypal-refund-1".to_owned()),
        requests[0].request_id
    );
    assert_eq!("5.00", requests[0].payload["amount"]["value"]);
    assert_eq!("USD", requests[0].payload["amount"]["currency_code"]);
    assert_eq!("refund-1", requests[0].payload["invoice_id"]);
}

#[tokio::test]
async fn paypal_query_refund_maps_standard_request_to_refund_retrieve_endpoint() {
    let http_client = RecordingPayPalHttpClient::new(json!({
        "id": "REFUND-123",
        "status": "COMPLETED"
    }));
    let adapter = paypal_adapter(http_client.clone());

    let outcome = adapter
        .query_refund(PaymentQueryRefundRequest {
            refund_id: Some("REFUND-123".to_owned()),
            refund_no: None,
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(Some("REFUND-123".to_owned()), outcome.native_id);
    assert_eq!(Some("COMPLETED".to_owned()), outcome.raw_status);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("GET", requests[0].method);
    assert_eq!("/v2/payments/refunds/REFUND-123", requests[0].path);
}

#[tokio::test]
async fn paypal_verify_webhook_delegates_to_paypal_verify_endpoint() {
    let http_client = RecordingPayPalHttpClient::new(json!({ "verification_status": "SUCCESS" }));
    let adapter = PayPalPaymentProviderAdapter::new(
        PayPalPaymentProviderConfig {
            client_id: "client-id".to_owned(),
            client_secret: "client-secret".to_owned(),
            webhook_id: Some("WH-123".to_owned()),
        },
        Arc::new(http_client.clone()),
    )
    .unwrap();

    let outcome = adapter
        .verify_webhook(PaymentVerifyWebhookRequest {
            headers: vec![
                (
                    "Paypal-Transmission-Id".to_owned(),
                    "transmission-1".to_owned(),
                ),
                (
                    "Paypal-Transmission-Time".to_owned(),
                    "2026-05-30T00:00:00Z".to_owned(),
                ),
                (
                    "Paypal-Cert-Url".to_owned(),
                    "https://api-m.paypal.com/cert.pem".to_owned(),
                ),
                ("Paypal-Auth-Algo".to_owned(), "SHA256withRSA".to_owned()),
                ("Paypal-Transmission-Sig".to_owned(), "sig".to_owned()),
            ],
            body: br#"{"id":"WH-EVENT-1","event_type":"PAYMENT.CAPTURE.COMPLETED"}"#.to_vec(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert!(outcome.verified);
    assert_eq!(Some("WH-EVENT-1".to_owned()), outcome.provider_event_id);

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!(
        "/v1/notifications/verify-webhook-signature",
        requests[0].path
    );
    assert_eq!("WH-123", requests[0].payload["webhook_id"]);
    assert_eq!("transmission-1", requests[0].payload["transmission_id"]);
    assert_eq!("WH-EVENT-1", requests[0].payload["webhook_event"]["id"]);
}

#[tokio::test]
async fn paypal_normalize_webhook_extracts_standard_event_fields() {
    let adapter = paypal_adapter(RecordingPayPalHttpClient::new(json!({})));

    let event = adapter
        .normalize_webhook(PaymentNormalizeWebhookRequest {
            headers: vec![],
            body: br#"{"id":"WH-EVENT-1","event_type":"PAYMENT.CAPTURE.COMPLETED","resource":{"id":"CAPTURE-123"}}"#
                .to_vec(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!("paypal", event.provider_code);
    assert_eq!(
        Some("PAYMENT.CAPTURE.COMPLETED".to_owned()),
        event.event_type
    );
    assert_eq!(Some("WH-EVENT-1".to_owned()), event.provider_event_id);
    assert_eq!("CAPTURE-123", event.payload["resource"]["id"]);
}

#[tokio::test]
async fn paypal_download_statement_maps_date_to_transaction_search_query() {
    let http_client = RecordingPayPalHttpClient::new(json!({
        "transaction_details": [{"transaction_info": {"transaction_id": "TXN-1"}}]
    }));
    let adapter = paypal_adapter(http_client.clone());

    let statement = adapter
        .download_statement(PaymentDownloadStatementRequest {
            statement_date: Some("2026-05-30".to_owned()),
            statement_type: Some("transaction_search".to_owned()),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(
        Some("paypal_transaction_search_2026-05-30".to_owned()),
        statement.statement_id
    );
    assert_eq!(
        "paypal_transaction_search",
        statement.metadata["source_type"]
    );

    let requests = http_client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("GET", requests[0].method);
    assert_eq!(
        "/v1/reporting/transactions?start_date=2026-05-30T00%3A00%3A00Z&end_date=2026-05-31T00%3A00%3A00Z&fields=all&page_size=500",
        requests[0].path
    );
}

#[tokio::test]
async fn paypal_parse_statement_counts_transaction_search_rows() {
    let adapter = paypal_adapter(RecordingPayPalHttpClient::new(json!({})));

    let statement = adapter
        .parse_statement(PaymentParseStatementRequest {
            statement_id: Some("paypal_txn_2026_05_30".to_owned()),
            content: br#"{
                "transaction_details": [
                    {"transaction_info": {"transaction_id": "TXN-1", "transaction_amount": {"value": "12.34", "currency_code": "USD"}, "fee_amount": {"value": "-0.59", "currency_code": "USD"}}},
                    {"transaction_info": {"transaction_id": "TXN-2", "transaction_amount": {"value": "-5.00", "currency_code": "USD"}, "fee_amount": {"value": "0.00", "currency_code": "USD"}}}
                ]
            }"#
            .to_vec(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(
        Some("paypal_txn_2026_05_30".to_owned()),
        statement.statement_id
    );
    assert_eq!(2, statement.item_count);
    assert_eq!(
        "paypal_transaction_search",
        statement.metadata["source_type"]
    );
    assert_eq!(1234, statement.metadata["gross_amount_minor"]);
    assert_eq!(-59, statement.metadata["fee_amount_minor"]);
    assert_eq!(675, statement.metadata["net_amount_minor"]);
}

#[tokio::test]
async fn paypal_create_order_rejects_missing_required_amount() {
    let adapter = paypal_adapter(RecordingPayPalHttpClient::new(json!({})));

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

fn paypal_adapter(http_client: RecordingPayPalHttpClient) -> PayPalPaymentProviderAdapter {
    PayPalPaymentProviderAdapter::new(
        PayPalPaymentProviderConfig {
            client_id: "client-id".to_owned(),
            client_secret: "client-secret".to_owned(),
            webhook_id: None,
        },
        Arc::new(http_client),
    )
    .unwrap()
}
