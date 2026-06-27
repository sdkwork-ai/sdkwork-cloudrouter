use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::test_http::{
    commerce_migrated_sqlite_pool, commerce_standard_test_context, commerce_test_command_request,
    commerce_test_json_request,
};
use sdkwork_commerce_api_server::{
    app_order_router_with_sqlite_pool, app_payment_router_with_sqlite_pool,
};
use sdkwork_commerce_membership_repository_sqlx::{
    upsert_sqlite_commerce_experience_seed, upsert_sqlite_payment_center_seed,
};
use sdkwork_commerce_order_service::{checkout_owner_order_request_hash, CreateOwnerOrderCommand};
use sqlx::SqlitePool;
use tower::ServiceExt;

fn subject_request(method: &str, uri: &str, body: Body) -> Request<Body> {
    commerce_test_json_request(method, uri, &commerce_standard_test_context(), body)
}

fn order_create_request_hash(session_id: &str) -> String {
    let command = CreateOwnerOrderCommand::new(
        "100001",
        Some("300001"),
        "30",
        session_id,
        "payment-order-request-1",
        "payment-order-idem-1",
    )
    .expect("command");
    checkout_owner_order_request_hash(&command)
}

fn subject_command_request(method: &str, uri: &str, body: Body) -> Request<Body> {
    commerce_test_command_request(
        method,
        uri,
        &commerce_standard_test_context(),
        "payment-order-idem-1",
        "payment-order-request-1",
        Some(&order_create_request_hash("checkout-session-1")),
        body,
    )
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

async fn activate_payment_method(pool: &SqlitePool, method_key: &str) {
    sqlx::query("UPDATE commerce_payment_method SET status = 'active' WHERE method_key = ?1")
        .bind(method_key)
        .execute(pool)
        .await
        .expect("activate payment method");
}

async fn seed_pending_order(pool: &SqlitePool) {
    let now = "2026-06-17 00:00:00";
    sqlx::query(
        r#"
        INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, payment_status,
             fulfillment_status, refund_status, subject, currency_code, request_no,
             idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
        VALUES
            ('order-command-1', '100001', '300001', '30', 'ORD-CMD-001', 'pending_payment',
             'pending', 'unfulfilled', 'none', 'Test order', 'CNY', 'ORD-CMD-001', 'idem-order-1',
             ?, NULL, NULL, ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed order");

    sqlx::query(
        r#"
        INSERT INTO commerce_order_item
            (id, tenant_id, order_id, sku_id, sku_snapshot_json, title, quantity,
             unit_price_amount, total_amount, fulfillment_status, refund_status, created_at)
        VALUES
            ('order-item-command-1', '100001', 'order-command-1', 'sku-1', '{}', 'Test item', 1,
             '9.90', '9.90', 'unfulfilled', 'none', ?)
        "#,
    )
    .bind(now)
    .execute(pool)
    .await
    .expect("seed order item");

    sqlx::query(
        r#"
        INSERT INTO commerce_order_amount_breakdown
            (id, tenant_id, order_id, original_amount, discount_amount, payable_amount,
             currency_code, created_at)
        VALUES
            ('order-command-1-amount', '100001', 'order-command-1', '9.90', '0.00', '9.90',
             'CNY', ?)
        "#,
    )
    .bind(now)
    .execute(pool)
    .await
    .expect("seed order amount");
}

async fn seed_checkout_session_for_order_create(pool: &SqlitePool) {
    let now = "2026-06-17 00:00:00";
    sqlx::query(
        r#"
        INSERT INTO commerce_checkout_session
            (id, tenant_id, organization_id, checkout_session_no, owner_user_id, source_type,
             status, currency_code, promotion_snapshot_json, request_hash, request_no,
             idempotency_key, expires_at, created_at, updated_at)
        VALUES
            ('checkout-session-1', '100001', '300001', 'CS-001', '30', 'cart', 'active',
             'CNY', '[]', 'checkout-hash-1', 'CS-001', 'checkout-idem-1',
             '2099-01-01 00:00:00', ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed checkout session");

    sqlx::query(
        r#"
        INSERT INTO commerce_checkout_line
            (id, tenant_id, organization_id, checkout_session_id, product_id, sku_id,
             sku_snapshot_json, selected_options_hash, quantity, purchase_type,
             fulfillment_type, price_amount_snapshot, currency_code, selected, created_at,
             updated_at)
        VALUES
            ('checkout-line-1', '100001', '300001', 'checkout-session-1', 'product-1', 'sku-1',
             '{"title":"Checkout item"}', 'default', 1, 'one_time', 'digital', '19.90', 'CNY', 1,
             ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed checkout line");

    sqlx::query(
        r#"
        INSERT INTO commerce_checkout_quote
            (id, tenant_id, organization_id, checkout_session_id, quote_no, original_amount,
             discount_amount, payable_amount, currency_code, quote_status, expires_at, created_at)
        VALUES
            ('checkout-quote-1', '100001', '300001', 'checkout-session-1', 'CQ-001', '19.90',
             '0.00', '19.90', 'CNY', 'ready', '2099-01-01 00:00:00', ?)
        "#,
    )
    .bind(now)
    .execute(pool)
    .await
    .expect("seed checkout quote");
}

#[tokio::test]
async fn app_order_router_creates_order_from_checkout_session() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_checkout_session_for_order_create(&pool).await;

    let app = app_order_router_with_sqlite_pool(pool);
    let response = app
        .oneshot(subject_command_request(
            "POST",
            "/app/v3/api/orders",
            Body::from(r#"{"checkoutSessionId":"checkout-session-1"}"#.to_owned()),
        ))
        .await
        .expect("create order response");

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("0", payload["code"]);
    assert_eq!("order-checkout-session-1", payload["data"]["orderId"]);
    assert_eq!("payment-order-request-1", payload["data"]["orderSn"]);
    assert_eq!("pending_payment", payload["data"]["status"]);
    assert_eq!("19.90", payload["data"]["totalAmount"]);
}

#[tokio::test]
async fn app_payment_router_creates_payment_for_pending_order() {
    let pool = commerce_migrated_sqlite_pool().await;
    upsert_sqlite_commerce_experience_seed(&pool)
        .await
        .expect("commerce seed");
    upsert_sqlite_payment_center_seed(&pool)
        .await
        .expect("payment center seed");
    activate_payment_method(&pool, "wechat_pay").await;
    seed_pending_order(&pool).await;

    let app = app_payment_router_with_sqlite_pool(pool);
    let response = app
        .oneshot(subject_request(
            "POST",
            "/app/v3/api/payments",
            Body::from(r#"{"orderId":"order-command-1","paymentMethod":"wechat_pay"}"#.to_owned()),
        ))
        .await
        .expect("create payment response");

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("0", payload["code"]);
    assert!(payload["data"]["paymentId"]
        .as_str()
        .is_some_and(|value| value.starts_with("pa-")));
    assert_eq!("order-command-1", payload["data"]["orderId"]);
    assert_eq!("9.90", payload["data"]["amount"]);
}

#[tokio::test]
async fn app_payment_router_reconciles_payment_by_order_id() {
    let pool = commerce_migrated_sqlite_pool().await;
    upsert_sqlite_commerce_experience_seed(&pool)
        .await
        .expect("commerce seed");
    upsert_sqlite_payment_center_seed(&pool)
        .await
        .expect("payment center seed");
    activate_payment_method(&pool, "wechat_pay").await;
    seed_pending_order(&pool).await;

    let app = app_payment_router_with_sqlite_pool(pool);
    let create_response = app
        .clone()
        .oneshot(subject_request(
            "POST",
            "/app/v3/api/payments",
            Body::from(r#"{"orderId":"order-command-1","paymentMethod":"wechat_pay"}"#.to_owned()),
        ))
        .await
        .expect("create payment response");
    assert_eq!(StatusCode::OK, create_response.status());

    let reconcile_response = app
        .oneshot(subject_request(
            "POST",
            "/app/v3/api/payments/reconciliations",
            Body::from(r#"{"orderId":"order-command-1","reconcileType":"ORDER_ID"}"#.to_owned()),
        ))
        .await
        .expect("reconcile payment response");

    assert_eq!(StatusCode::OK, reconcile_response.status());
    let payload = response_json(reconcile_response).await;
    assert_eq!("0", payload["code"]);
    assert_eq!("order-command-1", payload["data"]["orderId"]);
    assert_eq!("PENDING", payload["data"]["status"]);
}

#[tokio::test]
async fn app_order_router_pays_and_cancels_pending_order() {
    let pool = commerce_migrated_sqlite_pool().await;
    upsert_sqlite_commerce_experience_seed(&pool)
        .await
        .expect("commerce seed");
    upsert_sqlite_payment_center_seed(&pool)
        .await
        .expect("payment center seed");
    activate_payment_method(&pool, "wechat_pay").await;
    seed_pending_order(&pool).await;

    let app = app_order_router_with_sqlite_pool(pool.clone());

    let pay_response = app
        .clone()
        .oneshot(subject_request(
            "POST",
            "/app/v3/api/orders/order-command-1/payments",
            Body::from(r#"{"paymentMethod":"wechat_pay"}"#.to_owned()),
        ))
        .await
        .expect("pay order response");
    assert_eq!(StatusCode::OK, pay_response.status());
    let pay_payload = response_json(pay_response).await;
    assert_eq!("0", pay_payload["code"]);
    let payment_id = pay_payload["data"]["paymentId"]
        .as_str()
        .expect("payment id")
        .to_owned();

    let close_response = app_payment_router_with_sqlite_pool(pool.clone())
        .oneshot(subject_request(
            "POST",
            &format!("/app/v3/api/payments/{payment_id}/close"),
            Body::empty(),
        ))
        .await
        .expect("close payment response");
    assert_eq!(StatusCode::OK, close_response.status());

    let cancel_response = app
        .oneshot(subject_request(
            "POST",
            "/app/v3/api/orders/order-command-1/cancel",
            Body::from(r#"{"cancelReason":"user requested"}"#.to_owned()),
        ))
        .await
        .expect("cancel order response");
    assert_eq!(StatusCode::OK, cancel_response.status());
    let cancel_payload = response_json(cancel_response).await;
    assert_eq!("0", cancel_payload["code"]);
}
