use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::{
    default_payment_provider_registry, EntityUuidGenerator, InMemoryPaymentIntentRuntimeStore,
};
use sdkwork_clawrouter_router_service::domain::DomainResult;
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
    sdkwork_clawrouter_router_service::api::payment_aggregate_router_with_runtime_store_and_registry(
        store,
        Arc::new(TestUuidGenerator),
        default_payment_provider_registry(),
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
