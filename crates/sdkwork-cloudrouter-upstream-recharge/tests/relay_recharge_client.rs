//! Contract test for the relay recharge client against a real HTTP server.

use std::sync::Arc;
use std::time::Duration;

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use sdkwork_cloudrouter_upstream_recharge::{
    normalize_origin, HttpUpstreamRechargeClient, RechargeConnection, RechargeOrderRequest,
    UpstreamRechargeClient,
};
use serde_json::{json, Value};

const VALID_KEY: &str = "sk-relay-test";

#[derive(Clone)]
struct MockRelay {
    expected_key: String,
}

fn authorized(relay: &MockRelay, headers: &HeaderMap) -> bool {
    headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .map(|value| value == format!("Bearer {}", relay.expected_key))
        .unwrap_or(false)
}

fn envelope(data: Value) -> Response {
    Json(json!({ "code": 0, "data": data, "traceId": "trace-test" })).into_response()
}

fn unauthorized() -> Response {
    (
        StatusCode::UNAUTHORIZED,
        [("content-type", "application/problem+json")],
        Json(json!({
            "code": 40101,
            "status": 401,
            "title": "Unauthorized",
            "detail": "invalid api key",
            "traceId": "trace-test",
            "i18nKey": "errors.result.40101"
        })),
    )
        .into_response()
}

async fn balance(State(relay): State<Arc<MockRelay>>, headers: HeaderMap) -> Response {
    if !authorized(&relay, &headers) {
        return unauthorized();
    }
    envelope(json!({
        "amount": "83.0113",
        "frozen": "0",
        "unit": "TOKEN_BANK",
        "currencyCode": "CNY",
        "checkedAt": "2026-11-28T01:12:45Z"
    }))
}

async fn options(State(relay): State<Arc<MockRelay>>, headers: HeaderMap) -> Response {
    if !authorized(&relay, &headers) {
        return unauthorized();
    }
    envelope(json!({
        "items": [
            {
                "packageId": "pkg-100",
                "label": "100 算力积分",
                "points": 100,
                "bonusPoints": 0,
                "grantAmount": 100,
                "priceAmount": "10.00",
                "currencyCode": "CNY",
                "recommended": true
            }
        ],
        "currencyCode": "CNY",
        "pointsUnit": "算力积分",
        "customAmountSupported": true,
        "minAmount": "1.00",
        "maxAmount": "10000.00",
        "agreement": "我已阅读并同意充值服务协议"
    }))
}

async fn create_order(
    State(relay): State<Arc<MockRelay>>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Response {
    if !authorized(&relay, &headers) {
        return unauthorized();
    }
    assert_eq!(body["packageId"], "pkg-100");
    assert!(body.get("amount").is_none());
    let mut response = order_payload("order-1", "pending");
    response["cashierUrl"] = json!("https://cashier.example.com/order-1");
    envelope(response)
}

async fn retrieve_order(
    State(relay): State<Arc<MockRelay>>,
    headers: HeaderMap,
    axum::extract::Path(order_id): axum::extract::Path<String>,
) -> Response {
    if !authorized(&relay, &headers) {
        return unauthorized();
    }
    envelope(order_payload(&order_id, "paid"))
}

fn order_payload(order_id: &str, status: &str) -> Value {
    json!({
        "orderId": order_id,
        "orderNo": format!("R{order_id}"),
        "outTradeNo": format!("T{order_id}"),
        "amount": "10.00",
        "currencyCode": "CNY",
        "points": 100,
        "status": status,
        "nextAction": if status == "paid" { "none" } else { "scan_qr" },
        "cashierUrl": "",
        "qrCodePayload": "",
        "expiresAt": "2026-11-28T01:42:45Z",
        "paidAt": if status == "paid" { "2026-11-28T01:20:00Z" } else { "" },
        "createdAt": "2026-11-28T01:12:45Z"
    })
}

async fn spawn_relay(expected_key: &str) -> String {
    let relay = Arc::new(MockRelay {
        expected_key: expected_key.to_owned(),
    });
    let router = Router::new()
        .route("/v1/recharge/balance", get(balance))
        .route("/v1/recharge/options", get(options))
        .route("/v1/recharge/orders", post(create_order))
        .route("/v1/recharge/orders/{order_id}", get(retrieve_order))
        .with_state(relay);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind mock relay");
    let address = listener.local_addr().expect("mock relay address");
    tokio::spawn(async move {
        axum::serve(listener, router)
            .await
            .expect("serve mock relay");
    });
    format!("http://{address}")
}

#[tokio::test]
async fn client_reads_balance_options_and_creates_orders_with_the_api_key() {
    let origin = spawn_relay(VALID_KEY).await;
    let client = HttpUpstreamRechargeClient::new().expect("build client");
    let connection = RechargeConnection::new(format!("{origin}/v1"), VALID_KEY)
        .expect("connection")
        .with_timeout(Duration::from_secs(5));
    assert_eq!(connection.base_url(), origin);

    let balance = client.retrieve_balance(&connection).await.expect("balance");
    assert_eq!(balance.amount, "83.0113");
    assert_eq!(balance.unit, "TOKEN_BANK");

    let options = client.list_options(&connection).await.expect("options");
    assert_eq!(options.items.len(), 1);
    assert_eq!(options.items[0].price_amount, "10.00");
    assert!(options.custom_amount_supported);

    let order = client
        .create_order(
            &connection,
            RechargeOrderRequest {
                package_id: Some("pkg-100".to_owned()),
                amount: None,
                payment_method: None,
                idempotency_key: Some("recharge-1".to_owned()),
            },
        )
        .await
        .expect("create order");
    assert_eq!(order.order_id, "order-1");
    assert_eq!(order.cashier_url, "https://cashier.example.com/order-1");

    let paid = client
        .retrieve_order(&connection, "order-1")
        .await
        .expect("order status");
    assert_eq!(paid.status, "paid");
    assert_eq!(paid.next_action, "none");
}

#[tokio::test]
async fn client_reports_auth_failures_without_leaking_the_key() {
    let origin = spawn_relay(VALID_KEY).await;
    let client = HttpUpstreamRechargeClient::new().expect("build client");
    let connection = RechargeConnection::new(&origin, "sk-wrong").expect("connection");
    let error = client
        .retrieve_balance(&connection)
        .await
        .expect_err("wrong key must fail");
    assert!(error.is_auth_error());
    assert_eq!(error.status_code(), Some(401));
    let rendered = format!("{error}");
    assert!(
        !rendered.contains("sk-wrong"),
        "error must not echo the key"
    );
}

#[test]
fn supplier_base_urls_normalize_to_the_relay_origin() {
    assert_eq!(
        normalize_origin("https://api.sdkwork.com/v1").expect("origin"),
        "https://api.sdkwork.com"
    );
    assert_eq!(
        normalize_origin("https://api.sdkwork.com/anthropic/").expect("origin"),
        "https://api.sdkwork.com"
    );
    assert_eq!(
        normalize_origin("https://relay.example.com/gateway/v1").expect("origin"),
        "https://relay.example.com/gateway"
    );
    assert_eq!(
        normalize_origin("http://127.0.0.1:3900/v1").expect("origin"),
        "http://127.0.0.1:3900"
    );
    assert_eq!(
        normalize_origin("https://relay.example.com/v10/chat").expect("origin"),
        "https://relay.example.com/v10/chat"
    );
    assert!(normalize_origin("ftp://relay.example.com/v1").is_err());
    assert!(normalize_origin("https://relay.example.com/v1?x=1").is_err());
}

#[test]
fn connection_debug_redacts_the_api_key() {
    let connection =
        RechargeConnection::new("https://relay.example.com", "sk-secret-1234").expect("connection");
    let debug = format!("{connection:?}");
    assert!(!debug.contains("sk-secret-1234"));
    assert!(debug.contains("****1234"));
}
