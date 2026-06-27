use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use hmac::{Hmac, Mac};
use sdkwork_claw_config::PaymentWebhookConfig;
use sdkwork_clawrouter_router_service::application::EntityUuidGenerator;
use sdkwork_clawrouter_router_service::domain::DomainResult;
use sdkwork_clawrouter_router_service::ports::{
    PaymentCallbackCommand, PaymentCallbackFuture, PaymentCallbackOutcome, PaymentCallbackStatus,
    PaymentCallbackStore,
};
use sha2::Sha256;
use tower::ServiceExt;

type HmacSha256 = Hmac<Sha256>;

const PAYMENT_WEBHOOK_SECRET: &str = "payment-webhook-secret-0123456789abcdef";

#[derive(Default)]
struct RecordingPaymentCallbackStore {
    captured: Arc<Mutex<Vec<PaymentCallbackCommand>>>,
}

impl RecordingPaymentCallbackStore {
    fn captured(&self) -> Arc<Mutex<Vec<PaymentCallbackCommand>>> {
        Arc::clone(&self.captured)
    }
}

impl PaymentCallbackStore for RecordingPaymentCallbackStore {
    fn process_payment_callback<'a>(
        &'a self,
        command: PaymentCallbackCommand,
    ) -> PaymentCallbackFuture<'a> {
        self.captured.lock().unwrap().push(command.clone());
        Box::pin(async move {
            Ok(PaymentCallbackOutcome {
                success: command.status == PaymentCallbackStatus::Success,
                duplicate: false,
                out_trade_no: command.out_trade_no,
                transaction_id: command.transaction_id,
                status: command.status.as_str().to_owned(),
                message: "processed".to_owned(),
                credited_points: 880,
                balance: 1880,
            })
        })
    }
}

struct TestUuidGenerator {
    next: AtomicUsize,
}

impl TestUuidGenerator {
    fn new() -> Self {
        Self {
            next: AtomicUsize::new(1),
        }
    }
}

impl EntityUuidGenerator for TestUuidGenerator {
    fn generate_entity_uuid(&self) -> DomainResult<String> {
        let id = self.next.fetch_add(1, Ordering::SeqCst);
        Ok(format!("entity-{id}"))
    }
}

#[tokio::test]
async fn app_payment_callback_route_accepts_signed_json_and_passes_canonical_command_to_store() {
    let store = RecordingPaymentCallbackStore::default();
    let captured = store.captured();
    let router = sdkwork_clawrouter_router_service::api::app_payment_callback_router_with_store(
        Arc::new(store),
        Arc::new(TestUuidGenerator::new()),
        PaymentWebhookConfig::from_signing_secret(PAYMENT_WEBHOOK_SECRET).unwrap(),
    );
    let timestamp = current_unix_timestamp();
    let body = r#"{"outTradeNo":"order-1001","transactionId":"txn-9001","amount":88.5,"status":"success"}"#;
    let signature = sign_payment_callback_body(timestamp, body.as_bytes());

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/payments/callback/stripe")
                .header("content-type", "application/json")
                .header("x-sdkwork-event-id", "evt-1001")
                .header("x-sdkwork-nonce", "nonce-1001")
                .header("x-sdkwork-timestamp", timestamp.to_string())
                .header("x-sdkwork-signature", signature.clone())
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("2000", payload["code"]);
    assert_eq!("order-1001", payload["data"]["outTradeNo"]);
    assert_eq!("txn-9001", payload["data"]["transactionId"]);
    assert_eq!(880, payload["data"]["creditedPoints"]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("stripe", captured[0].provider_code);
    assert_eq!("evt-1001", captured[0].event_id);
    assert_eq!("nonce-1001", captured[0].nonce);
    assert_eq!(Some(timestamp), captured[0].request_timestamp);
    assert_eq!(Some(signature), captured[0].signature);
    assert_eq!("order-1001", captured[0].out_trade_no);
    assert_eq!("txn-9001", captured[0].transaction_id);
    assert_eq!(Some("88.50".to_owned()), captured[0].amount);
    assert_eq!(PaymentCallbackStatus::Success, captured[0].status);
}

#[tokio::test]
async fn app_payment_callback_route_rejects_missing_signature_before_store() {
    let store = RecordingPaymentCallbackStore::default();
    let captured = store.captured();
    let router = sdkwork_clawrouter_router_service::api::app_payment_callback_router_with_store(
        Arc::new(store),
        Arc::new(TestUuidGenerator::new()),
        PaymentWebhookConfig::from_signing_secret(PAYMENT_WEBHOOK_SECRET).unwrap(),
    );
    let timestamp = current_unix_timestamp();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/payments/callback/stripe")
                .header("content-type", "application/json")
                .header("x-sdkwork-timestamp", timestamp.to_string())
                .body(Body::from(
                    r#"{"outTradeNo":"order-1002","transactionId":"txn-9002","amount":50,"status":"success"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("4001", payload["code"]);
    assert_eq!("payment callback signature is required", payload["msg"]);
    assert_eq!(None, payload.get("message"));
    assert!(captured.lock().unwrap().is_empty());
}

#[tokio::test]
async fn app_payment_callback_route_rejects_sub_cent_amount_before_store() {
    let store = RecordingPaymentCallbackStore::default();
    let captured = store.captured();
    let router = sdkwork_clawrouter_router_service::api::app_payment_callback_router_with_store(
        Arc::new(store),
        Arc::new(TestUuidGenerator::new()),
        PaymentWebhookConfig::from_signing_secret(PAYMENT_WEBHOOK_SECRET).unwrap(),
    );
    let timestamp = current_unix_timestamp();
    let body = r#"{"outTradeNo":"order-1003","transactionId":"txn-9003","amount":"88.501","status":"success"}"#;
    let signature = sign_payment_callback_body(timestamp, body.as_bytes());

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/payments/callback/stripe")
                .header("content-type", "application/json")
                .header("x-sdkwork-event-id", "evt-1003")
                .header("x-sdkwork-nonce", "nonce-1003")
                .header("x-sdkwork-timestamp", timestamp.to_string())
                .header("x-sdkwork-signature", signature)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("4001", payload["code"]);
    assert_eq!(
        "payment callback amount must not contain sub-cent precision",
        payload["msg"]
    );
    assert_eq!(None, payload.get("message"));
    assert!(captured.lock().unwrap().is_empty());
}

#[tokio::test]
async fn wechat_payment_callback_route_accepts_signed_xml_and_returns_provider_ack() {
    let store = RecordingPaymentCallbackStore::default();
    let captured = store.captured();
    let router = sdkwork_clawrouter_router_service::api::app_payment_callback_router_with_store(
        Arc::new(store),
        Arc::new(TestUuidGenerator::new()),
        PaymentWebhookConfig::from_signing_secret(PAYMENT_WEBHOOK_SECRET).unwrap(),
    );
    let timestamp = current_unix_timestamp();
    let body = concat!(
        "<xml>",
        "<out_trade_no><![CDATA[wx-order-1001]]></out_trade_no>",
        "<transaction_id><![CDATA[wx-txn-9001]]></transaction_id>",
        "<trade_state><![CDATA[SUCCESS]]></trade_state>",
        "<total_fee>1234</total_fee>",
        "</xml>"
    );
    let signature = sign_payment_callback_body(timestamp, body.as_bytes());

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/payments/callback/wechat")
                .header("content-type", "application/xml")
                .header("x-sdkwork-event-id", "evt-wx-1001")
                .header("x-sdkwork-nonce", "nonce-wx-1001")
                .header("x-sdkwork-timestamp", timestamp.to_string())
                .header("Wechatpay-Signature", signature)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();

    assert!(body.contains("<return_code><![CDATA[SUCCESS]]></return_code>"));
    assert!(body.contains("<return_msg><![CDATA[OK]]></return_msg>"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("wechat_pay", captured[0].provider_code);
    assert_eq!("wx-order-1001", captured[0].out_trade_no);
    assert_eq!("wx-txn-9001", captured[0].transaction_id);
    assert_eq!(Some("12.34".to_owned()), captured[0].amount);
    assert_eq!(PaymentCallbackStatus::Success, captured[0].status);
}

#[tokio::test]
async fn payment_callback_route_normalizes_provider_aliases_through_registry() {
    let store = RecordingPaymentCallbackStore::default();
    let captured = store.captured();
    let router = sdkwork_clawrouter_router_service::api::app_payment_callback_router_with_store(
        Arc::new(store),
        Arc::new(TestUuidGenerator::new()),
        PaymentWebhookConfig::from_signing_secret(PAYMENT_WEBHOOK_SECRET).unwrap(),
    );
    let timestamp = current_unix_timestamp();
    let body = concat!(
        "<xml>",
        "<out_trade_no><![CDATA[wx-order-1002]]></out_trade_no>",
        "<transaction_id><![CDATA[wx-txn-9002]]></transaction_id>",
        "<trade_state><![CDATA[SUCCESS]]></trade_state>",
        "<total_fee>990</total_fee>",
        "</xml>"
    );
    let signature = sign_payment_callback_body(timestamp, body.as_bytes());

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/payments/callback/wxpay")
                .header("content-type", "application/xml")
                .header("x-sdkwork-event-id", "evt-wx-1002")
                .header("x-sdkwork-nonce", "nonce-wx-1002")
                .header("x-sdkwork-timestamp", timestamp.to_string())
                .header("Wechatpay-Signature", signature)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("wechat_pay", captured[0].provider_code);
}

fn current_unix_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

fn sign_payment_callback_body(timestamp: i64, body: &[u8]) -> String {
    let mut mac = HmacSha256::new_from_slice(PAYMENT_WEBHOOK_SECRET.as_bytes()).unwrap();
    mac.update(timestamp.to_string().as_bytes());
    mac.update(b".");
    mac.update(body);
    hex::encode(mac.finalize().into_bytes())
}
