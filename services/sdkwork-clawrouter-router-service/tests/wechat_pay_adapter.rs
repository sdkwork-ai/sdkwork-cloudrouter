use std::sync::{Arc, Mutex};

use sdkwork_clawrouter_router_service::application::{
    PaymentCancelPaymentIntentRequest, PaymentCreateIntentRequest, PaymentCreateRefundRequest,
    PaymentDownloadStatementRequest, PaymentNormalizeWebhookRequest, PaymentParseStatementRequest,
    PaymentProviderAdapter, PaymentProviderRegistryError, PaymentQueryRefundRequest,
    PaymentVerifyWebhookRequest, WeChatPayApiClient, WeChatPayCrypto, WeChatPayProviderAdapter,
    WeChatPayProviderConfig,
};
use serde_json::{json, Value};

#[derive(Debug, Clone, PartialEq, Eq)]
struct RecordedWeChatPayRequest {
    method: String,
    path: String,
    payload: Value,
}

#[derive(Clone)]
struct RecordingWeChatPayClient {
    requests: Arc<Mutex<Vec<RecordedWeChatPayRequest>>>,
    response: Value,
}

impl RecordingWeChatPayClient {
    fn new(response: Value) -> Self {
        Self {
            requests: Arc::new(Mutex::new(Vec::new())),
            response,
        }
    }

    fn recorded_requests(&self) -> Vec<RecordedWeChatPayRequest> {
        self.requests.lock().unwrap().clone()
    }
}

impl WeChatPayApiClient for RecordingWeChatPayClient {
    fn post_json<'a>(
        &'a self,
        path: &'a str,
        payload: Value,
    ) -> sdkwork_clawrouter_router_service::application::PaymentAdapterFuture<'a, Value> {
        Box::pin(async move {
            self.requests
                .lock()
                .unwrap()
                .push(RecordedWeChatPayRequest {
                    method: "POST".to_owned(),
                    path: path.to_owned(),
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
            self.requests
                .lock()
                .unwrap()
                .push(RecordedWeChatPayRequest {
                    method: "GET".to_owned(),
                    path: path.to_owned(),
                    payload: json!({}),
                });
            Ok(self.response.clone())
        })
    }
}

#[derive(Clone)]
struct FixedWeChatPayCrypto {
    verified: bool,
}

impl WeChatPayCrypto for FixedWeChatPayCrypto {
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

    fn decrypt_resource(
        &self,
        _associated_data: &str,
        _nonce: &str,
        ciphertext: &str,
    ) -> Result<Vec<u8>, PaymentProviderRegistryError> {
        Ok(ciphertext.as_bytes().to_vec())
    }
}

#[tokio::test]
async fn wechat_native_create_maps_standard_payment_intent() {
    let client = RecordingWeChatPayClient::new(json!({
        "code_url": "weixin://wxpay/bizpayurl?pr=abc"
    }));
    let adapter = wechat_adapter(client.clone(), true);

    let outcome = adapter
        .create_payment_intent(PaymentCreateIntentRequest {
            tenant_id: Some(42),
            merchant_order_no: Some("order-1".to_owned()),
            amount_minor: Some(1234),
            currency: Some("CNY".to_owned()),
            metadata: json!({ "description": "SDKWORK order" }),
        })
        .await
        .unwrap();

    assert_eq!("wechat_pay", outcome.supplier_code);
    assert_eq!(Some("order-1".to_owned()), outcome.native_id);
    assert_eq!(Some("CREATED".to_owned()), outcome.raw_status);
    assert_eq!(
        "weixin://wxpay/bizpayurl?pr=abc",
        outcome.payload["code_url"]
    );

    let requests = client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("POST", requests[0].method);
    assert_eq!("/v3/pay/transactions/native", requests[0].path);
    assert_eq!("appid-1", requests[0].payload["appid"]);
    assert_eq!("mchid-1", requests[0].payload["mchid"]);
    assert_eq!("order-1", requests[0].payload["out_trade_no"]);
    assert_eq!(1234, requests[0].payload["amount"]["total"]);
    assert_eq!("CNY", requests[0].payload["amount"]["currency"]);
}

#[tokio::test]
async fn wechat_close_order_maps_standard_cancel_to_close_endpoint() {
    let client = RecordingWeChatPayClient::new(json!({}));
    let adapter = wechat_adapter(client.clone(), true);

    let outcome = adapter
        .cancel_payment_intent(PaymentCancelPaymentIntentRequest {
            payment_intent_id: Some("order-1".to_owned()),
            reason: Some("customer_requested".to_owned()),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(Some("order-1".to_owned()), outcome.native_id);
    assert_eq!(Some("CLOSED".to_owned()), outcome.raw_status);

    let requests = client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("POST", requests[0].method);
    assert_eq!(
        "/v3/pay/transactions/out-trade-no/order-1/close",
        requests[0].path
    );
    assert_eq!("mchid-1", requests[0].payload["mchid"]);
}

#[tokio::test]
async fn wechat_create_refund_maps_standard_request_to_domestic_refund() {
    let client = RecordingWeChatPayClient::new(json!({
        "refund_id": "refund-native-1",
        "out_refund_no": "refund-1",
        "status": "PROCESSING"
    }));
    let adapter = wechat_adapter(client.clone(), true);

    let outcome = adapter
        .create_refund(PaymentCreateRefundRequest {
            payment_intent_id: Some("order-1".to_owned()),
            refund_no: Some("refund-1".to_owned()),
            amount_minor: Some(500),
            reason: Some("customer_requested".to_owned()),
            metadata: json!({ "total_amount_minor": 1234 }),
        })
        .await
        .unwrap();

    assert_eq!(Some("refund-native-1".to_owned()), outcome.native_id);
    assert_eq!(Some("PROCESSING".to_owned()), outcome.raw_status);

    let requests = client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("/v3/refund/domestic/refunds", requests[0].path);
    assert_eq!("order-1", requests[0].payload["out_trade_no"]);
    assert_eq!("refund-1", requests[0].payload["out_refund_no"]);
    assert_eq!(500, requests[0].payload["amount"]["refund"]);
    assert_eq!(1234, requests[0].payload["amount"]["total"]);
    assert_eq!("CNY", requests[0].payload["amount"]["currency"]);
}

#[tokio::test]
async fn wechat_query_refund_maps_standard_request_to_refund_query() {
    let client = RecordingWeChatPayClient::new(json!({
        "refund_id": "refund-native-1",
        "out_refund_no": "refund-1",
        "status": "SUCCESS"
    }));
    let adapter = wechat_adapter(client.clone(), true);

    let outcome = adapter
        .query_refund(PaymentQueryRefundRequest {
            refund_id: None,
            refund_no: Some("refund-1".to_owned()),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(Some("refund-native-1".to_owned()), outcome.native_id);
    assert_eq!(Some("SUCCESS".to_owned()), outcome.raw_status);

    let requests = client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("GET", requests[0].method);
    assert_eq!("/v3/refund/domestic/refunds/refund-1", requests[0].path);
}

#[tokio::test]
async fn wechat_verify_webhook_uses_crypto_and_extracts_event_id() {
    let adapter = wechat_adapter(RecordingWeChatPayClient::new(json!({})), true);

    let outcome = adapter
        .verify_webhook(PaymentVerifyWebhookRequest {
            headers: vec![
                ("Wechatpay-Timestamp".to_owned(), "1717171717".to_owned()),
                ("Wechatpay-Nonce".to_owned(), "nonce-1".to_owned()),
                ("Wechatpay-Signature".to_owned(), "signature".to_owned()),
                ("Wechatpay-Serial".to_owned(), "serial-1".to_owned()),
            ],
            body: br#"{"id":"event-1","event_type":"TRANSACTION.SUCCESS"}"#.to_vec(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert!(outcome.verified);
    assert_eq!(Some("event-1".to_owned()), outcome.provider_event_id);
}

#[tokio::test]
async fn wechat_normalize_webhook_decrypts_resource_when_present() {
    let adapter = wechat_adapter(RecordingWeChatPayClient::new(json!({})), true);

    let event = adapter
        .normalize_webhook(PaymentNormalizeWebhookRequest {
            headers: vec![],
            body: br#"{"id":"event-1","event_type":"TRANSACTION.SUCCESS","resource":{"associated_data":"transaction","nonce":"nonce-1","ciphertext":"{\"out_trade_no\":\"order-1\",\"trade_state\":\"SUCCESS\"}"}}"#
                .to_vec(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!("wechat_pay", event.supplier_code);
    assert_eq!(Some("TRANSACTION.SUCCESS".to_owned()), event.event_type);
    assert_eq!(Some("event-1".to_owned()), event.provider_event_id);
    assert_eq!(
        "order-1",
        event.payload["resource_plaintext"]["out_trade_no"]
    );
}

#[tokio::test]
async fn wechat_download_statement_maps_date_to_tradebill_query() {
    let client = RecordingWeChatPayClient::new(json!({
        "download_url": "https://api.mch.weixin.qq.com/v3/billdownload/file?token=abc"
    }));
    let adapter = wechat_adapter(client.clone(), true);

    let statement = adapter
        .download_statement(PaymentDownloadStatementRequest {
            statement_date: Some("2026-05-30".to_owned()),
            statement_type: Some("tradebill".to_owned()),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(
        Some("wechat_pay_tradebill_2026-05-30".to_owned()),
        statement.statement_id
    );
    assert_eq!("wechat_pay_tradebill", statement.metadata["source_type"]);

    let requests = client.recorded_requests();
    assert_eq!(1, requests.len());
    assert_eq!("GET", requests[0].method);
    assert_eq!(
        "/v3/bill/tradebill?bill_date=2026-05-30&bill_type=ALL",
        requests[0].path
    );
}

#[tokio::test]
async fn wechat_parse_statement_counts_csv_bill_rows() {
    let adapter = wechat_adapter(RecordingWeChatPayClient::new(json!({})), true);

    let statement = adapter
        .parse_statement(PaymentParseStatementRequest {
            statement_id: Some("wechat_pay_tradebill_2026_05_30".to_owned()),
            content: "out_trade_no,transaction_id,total_amount,poundage,trade_state\norder-1,wx-1,12.34,0.10,SUCCESS\norder-2,wx-2,-5.00,0.00,REFUND\n"
                .as_bytes()
                .to_vec(),
            metadata: json!({}),
        })
        .await
        .unwrap();

    assert_eq!(
        Some("wechat_pay_tradebill_2026_05_30".to_owned()),
        statement.statement_id
    );
    assert_eq!(2, statement.item_count);
    assert_eq!("wechat_pay_tradebill", statement.metadata["source_type"]);
    assert_eq!(1234, statement.metadata["gross_amount_minor"]);
    assert_eq!(10, statement.metadata["fee_amount_minor"]);
    assert_eq!(724, statement.metadata["net_amount_minor"]);
}

#[tokio::test]
async fn wechat_native_create_rejects_non_cny_currency() {
    let adapter = wechat_adapter(RecordingWeChatPayClient::new(json!({})), true);

    let error = adapter
        .create_payment_intent(PaymentCreateIntentRequest {
            merchant_order_no: Some("order-1".to_owned()),
            amount_minor: Some(100),
            currency: Some("USD".to_owned()),
            ..Default::default()
        })
        .await
        .expect_err("WeChat Pay domestic baseline must reject non-CNY");

    assert!(matches!(
        error,
        PaymentProviderRegistryError::InvalidProviderRequest { .. }
    ));
}

fn wechat_adapter(client: RecordingWeChatPayClient, verified: bool) -> WeChatPayProviderAdapter {
    WeChatPayProviderAdapter::new(
        WeChatPayProviderConfig {
            app_id: "appid-1".to_owned(),
            mch_id: "mchid-1".to_owned(),
            merchant_serial_no: "serial-1".to_owned(),
            merchant_private_key_pem: "private-key".to_owned(),
            api_v3_key: "api-v3-key".to_owned(),
            notify_url: Some("https://example.com/wechat/notify".to_owned()),
        },
        Arc::new(client),
        Arc::new(FixedWeChatPayCrypto { verified }),
    )
    .unwrap()
}
