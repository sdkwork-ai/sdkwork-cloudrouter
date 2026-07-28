use std::sync::{Arc, Mutex};

use sdkwork_clawrouter_router_service::application::{
    AlipayOpenApiClient, AlipayPaymentProviderAdapter, AlipayPaymentProviderConfig, AlipaySigner,
    PaymentCancelPaymentIntentRequest, PaymentCreateIntentRequest, PaymentCreateRefundRequest,
    PaymentDownloadStatementRequest, PaymentNormalizeWebhookRequest, PaymentParseStatementRequest,
    PaymentProviderAdapter, PaymentProviderRegistryError, PaymentQueryRefundRequest,
    PaymentVerifyWebhookRequest,
};
use serde_json::{json, Value};

#[derive(Debug, Clone, PartialEq, Eq)]
struct RecordedAlipayRequest {
    method: String,
    biz_content: Value,
}

#[derive(Clone)]
struct RecordingAlipayClient {
    requests: Arc<Mutex<Vec<RecordedAlipayRequest>>>,
    response: Value,
}

impl RecordingAlipayClient {
    fn new(response: Value) -> Self {
        Self {
            requests: Arc::new(Mutex::new(Vec::new())),
            response,
        }
    }

    fn recorded_requests(&self) -> Vec<RecordedAlipayRequest> {
        self.requests.lock().unwrap().clone()
    }
}

impl AlipayOpenApiClient for RecordingAlipayClient {
    fn execute<'a>(
        &'a self,
        method: &'a str,
        biz_content: Value,
    ) -> sdkwork_clawrouter_router_service::application::PaymentAdapterFuture<'a, Value> {
        Box::pin(async move {
            self.requests.lock().unwrap().push(RecordedAlipayRequest {
                method: method.to_owned(),
                biz_content,
            });
            Ok(self.response.clone())
        })
    }

    fn download<'a>(
        &'a self,
        method: &'a str,
        biz_content: Value,
    ) -> sdkwork_clawrouter_router_service::application::PaymentAdapterFuture<'a, Value> {
        Box::pin(async move {
            self.requests.lock().unwrap().push(RecordedAlipayRequest {
                method: method.to_owned(),
                biz_content,
            });
            Ok(self.response.clone())
        })
    }
}

#[derive(Clone)]
struct FixedAlipaySigner {
    verified: bool,
}

impl AlipaySigner for FixedAlipaySigner {
    fn sign(&self, payload: &str) -> Result<String, PaymentProviderRegistryError> {
        Ok(format!("signed:{payload}"))
    }

    fn verify(
        &self,
        _payload: &str,
        _signature: &str,
    ) -> Result<bool, PaymentProviderRegistryError> {
        Ok(self.verified)
    }
}

#[tokio::test]
async fn alipay_page_pay_maps_standard_payment_intent_to_trade_page_pay() {
    let client = RecordingAlipayClient::new(json!({
        "out_trade_no": "order-1",
        "trade_no": "20260530220000000001",
        "status": "WAIT_BUYER_PAY",
        "page_pay_url": "https://openapi.alipay.test/gateway.do?method=alipay.trade.page.pay"
    }));
    let adapter = alipay_adapter(client.clone(), true);

    let outcome = adapter
        .create_payment_intent(PaymentCreateIntentRequest {
            tenant_id: Some(42),
            merchant_order_no: Some("order-1".to_owned()),
            amount_minor: Some(1234),
            currency: Some("CNY".to_owned()),
            metadata: json!({ "subject": "SDKWORK order" }),
        })
        .await
        .unwrap();

    assert_eq!("alipay", outcome.supplier_code);
    assert_eq!(Some("20260530220000000001".to_owned()), outcome.native_id);
    assert_eq!(Some("WAIT_BUYER_PAY".to_owned()), outcome.raw_status);
    assert_eq!(
        "https://openapi.alipay.test/gateway.do?method=alipay.trade.page.pay",
        outcome.payload["page_pay_url"]
    );

    let requests = client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("alipay.trade.page.pay", requests[0].method);
    assert_eq!("order-1", requests[0].biz_content["out_trade_no"]);
    assert_eq!("12.34", requests[0].biz_content["total_amount"]);
    assert_eq!("SDKWORK order", requests[0].biz_content["subject"]);
    assert_eq!(
        "FAST_INSTANT_TRADE_PAY",
        requests[0].biz_content["product_code"]
    );
}

#[tokio::test]
async fn alipay_cancel_payment_intent_maps_to_trade_close() {
    let client = RecordingAlipayClient::new(json!({
        "out_trade_no": "order-1",
        "trade_no": "20260530220000000001",
        "status": "TRADE_CLOSED"
    }));
    let adapter = alipay_adapter(client.clone(), true);

    let outcome = adapter
        .cancel_payment_intent(PaymentCancelPaymentIntentRequest {
            payment_intent_id: Some("order-1".to_owned()),
            reason: Some("customer_requested".to_owned()),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(Some("20260530220000000001".to_owned()), outcome.native_id);
    assert_eq!(Some("TRADE_CLOSED".to_owned()), outcome.raw_status);

    let requests = client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("alipay.trade.close", requests[0].method);
    assert_eq!("order-1", requests[0].biz_content["out_trade_no"]);
}

#[tokio::test]
async fn alipay_create_refund_maps_standard_request_to_trade_refund() {
    let client = RecordingAlipayClient::new(json!({
        "out_trade_no": "order-1",
        "trade_no": "20260530220000000001",
        "refund_fee": "5.00",
        "status": "REFUND_SUCCESS"
    }));
    let adapter = alipay_adapter(client.clone(), true);

    let outcome = adapter
        .create_refund(PaymentCreateRefundRequest {
            payment_intent_id: Some("order-1".to_owned()),
            refund_no: Some("refund-1".to_owned()),
            amount_minor: Some(500),
            reason: Some("customer_requested".to_owned()),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(Some("20260530220000000001".to_owned()), outcome.native_id);
    assert_eq!(Some("REFUND_SUCCESS".to_owned()), outcome.raw_status);

    let requests = client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("alipay.trade.refund", requests[0].method);
    assert_eq!("order-1", requests[0].biz_content["out_trade_no"]);
    assert_eq!("refund-1", requests[0].biz_content["out_request_no"]);
    assert_eq!("5.00", requests[0].biz_content["refund_amount"]);
    assert_eq!(
        "customer_requested",
        requests[0].biz_content["refund_reason"]
    );
}

#[tokio::test]
async fn alipay_query_refund_maps_to_fastpay_refund_query() {
    let client = RecordingAlipayClient::new(json!({
        "out_trade_no": "order-1",
        "trade_no": "20260530220000000001",
        "out_request_no": "refund-1",
        "refund_amount": "5.00",
        "status": "REFUND_SUCCESS"
    }));
    let adapter = alipay_adapter(client.clone(), true);

    let outcome = adapter
        .query_refund(PaymentQueryRefundRequest {
            refund_id: None,
            refund_no: Some("refund-1".to_owned()),
            metadata: json!({ "out_trade_no": "order-1" }),
        })
        .await
        .unwrap();

    assert_eq!(Some("20260530220000000001".to_owned()), outcome.native_id);
    assert_eq!(Some("REFUND_SUCCESS".to_owned()), outcome.raw_status);

    let requests = client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("alipay.trade.fastpay.refund.query", requests[0].method);
    assert_eq!("order-1", requests[0].biz_content["out_trade_no"]);
    assert_eq!("refund-1", requests[0].biz_content["out_request_no"]);
}

#[tokio::test]
async fn alipay_verify_webhook_uses_signer_and_extracts_notify_id() {
    let adapter = alipay_adapter(RecordingAlipayClient::new(json!({})), true);

    let outcome = adapter
        .verify_webhook(PaymentVerifyWebhookRequest {
            headers: vec![],
            body: b"notify_id=notify-1&trade_status=TRADE_SUCCESS&out_trade_no=order-1&trade_no=20260530220000000001&sign=signature&sign_type=RSA2".to_vec(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert!(outcome.verified);
    assert_eq!(Some("notify-1".to_owned()), outcome.provider_event_id);
}

#[tokio::test]
async fn alipay_normalize_webhook_extracts_standard_event_fields() {
    let adapter = alipay_adapter(RecordingAlipayClient::new(json!({})), true);

    let event = adapter
        .normalize_webhook(PaymentNormalizeWebhookRequest {
            headers: vec![],
            body: b"notify_id=notify-1&trade_status=TRADE_SUCCESS&out_trade_no=order-1&trade_no=20260530220000000001".to_vec(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!("alipay", event.supplier_code);
    assert_eq!(Some("TRADE_SUCCESS".to_owned()), event.event_type);
    assert_eq!(Some("notify-1".to_owned()), event.provider_event_id);
    assert_eq!("order-1", event.payload["out_trade_no"]);
    assert_eq!("20260530220000000001", event.payload["trade_no"]);
}

#[tokio::test]
async fn alipay_download_statement_maps_date_to_bill_download_query() {
    let client = RecordingAlipayClient::new(json!({
        "bill_download_url": "https://alipay.test/bill.csv",
        "status": "SUCCESS"
    }));
    let adapter = alipay_adapter(client.clone(), true);

    let statement = adapter
        .download_statement(PaymentDownloadStatementRequest {
            statement_date: Some("2026-05-30".to_owned()),
            statement_type: Some("trade".to_owned()),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(
        Some("alipay_trade_2026-05-30".to_owned()),
        statement.statement_id
    );
    assert_eq!("alipay_trade_bill", statement.metadata["source_type"]);
    assert_eq!(
        "https://alipay.test/bill.csv",
        statement.metadata["bill_download_url"]
    );

    let requests = client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!(
        "alipay.data.dataservice.bill.downloadurl.query",
        requests[0].method
    );
    assert_eq!("trade", requests[0].biz_content["bill_type"]);
    assert_eq!("2026-05-30", requests[0].biz_content["bill_date"]);
}

#[tokio::test]
async fn alipay_parse_statement_counts_csv_bill_rows() {
    let adapter = alipay_adapter(RecordingAlipayClient::new(json!({})), true);

    let statement = adapter
        .parse_statement(PaymentParseStatementRequest {
            statement_id: Some("alipay_trade_2026_05_30".to_owned()),
            content: b"trade_no,out_trade_no,total_amount,service_fee,trade_status\n20260530220001,order-1,12.34,0.10,TRADE_SUCCESS\n20260530220002,order-2,-5.00,0.00,REFUND_SUCCESS\n".to_vec(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(
        Some("alipay_trade_2026_05_30".to_owned()),
        statement.statement_id
    );
    assert_eq!(2, statement.item_count);
    assert_eq!("alipay_trade_bill", statement.metadata["source_type"]);
    assert_eq!(1234, statement.metadata["gross_amount_minor"]);
    assert_eq!(10, statement.metadata["fee_amount_minor"]);
    assert_eq!(724, statement.metadata["net_amount_minor"]);
}

#[tokio::test]
async fn alipay_page_pay_rejects_non_cny_currency() {
    let adapter = alipay_adapter(RecordingAlipayClient::new(json!({})), true);

    let error = adapter
        .create_payment_intent(PaymentCreateIntentRequest {
            merchant_order_no: Some("order-1".to_owned()),
            amount_minor: Some(100),
            currency: Some("USD".to_owned()),
            ..Default::default()
        })
        .await
        .expect_err("Alipay domestic baseline must reject non-CNY");

    assert!(matches!(
        error,
        PaymentProviderRegistryError::InvalidProviderRequest { .. }
    ));
}

fn alipay_adapter(client: RecordingAlipayClient, verified: bool) -> AlipayPaymentProviderAdapter {
    AlipayPaymentProviderAdapter::new(
        AlipayPaymentProviderConfig {
            app_id: "app-id".to_owned(),
            private_key_pem: "private-key".to_owned(),
            alipay_public_key_pem: "alipay-public-key".to_owned(),
            notify_url: Some("https://example.com/alipay/notify".to_owned()),
            return_url: Some("https://example.com/alipay/return".to_owned()),
        },
        Arc::new(client),
        Arc::new(FixedAlipaySigner { verified }),
    )
    .unwrap()
}
