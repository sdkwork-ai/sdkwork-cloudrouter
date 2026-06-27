use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::app_payment_router_with_sqlite_pool;
use sdkwork_commerce_api_server::test_http::{
    commerce_migrated_sqlite_pool, commerce_standard_test_context, commerce_test_request,
};
use sqlx::SqlitePool;
use tower::ServiceExt;

fn subject_request(uri: &str) -> Request<Body> {
    commerce_test_request(
        Request::builder().method("GET").uri(uri),
        Some(&commerce_standard_test_context()),
        Body::empty(),
    )
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

#[tokio::test]
async fn app_payment_router_retrieves_payment_attempt_from_standard_payment_schema() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_payment_record(&pool).await;
    let app = app_payment_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_request(
            "/app/v3/api/payments/attempts/payment-attempt-1",
        ))
        .await
        .expect("payment record response");

    assert_eq!(response.status(), StatusCode::OK);
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("payment-attempt-1", payload["data"]["id"]);
    assert_eq!("TRADE-1", payload["data"]["orderNo"]);
    assert_eq!("wechat_pay", payload["data"]["method"]);
    assert_eq!("29.90", payload["data"]["amount"]);
    assert_eq!("2026-05-20 10:03:00", payload["data"]["date"]);
    assert_eq!("success", payload["data"]["status"]);
}

async fn seed_payment_record(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, payment_status, fulfillment_status, refund_status, subject, currency_code, request_no, idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
        VALUES
            ('order-1', '100001', '300001', '30', 'ORD-1', 'paid', 'paid', 'fulfilled', 'none', 'points_recharge', 'CNY', 'req-order-1', 'idem-order-1', '2026-05-20 10:00:00', '2026-05-20 10:03:00', NULL, NULL, '2026-05-20 10:03:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed order");

    sqlx::query(
        r#"
        INSERT INTO commerce_payment_intent
            (id, tenant_id, organization_id, owner_user_id, order_id, payment_intent_no, payment_method, provider_code, amount, currency_code, status, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('payment-intent-1', '100001', '300001', '30', 'order-1', 'PAY-INTENT-1', 'wechat_pay', 'wechat_pay', '29.90', 'CNY', 'succeeded', 'req-pay-1', 'idem-pay-1', '2026-05-20 10:01:00', '2026-05-20 10:03:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed payment intent");

    sqlx::query(
        r#"
        INSERT INTO commerce_payment_attempt
            (id, tenant_id, organization_id, owner_user_id, payment_intent_id, order_id, payment_method, provider_code, out_trade_no, amount, currency_code, status, callback_payload, created_at, paid_at, updated_at)
        VALUES
            ('payment-attempt-1', '100001', '300001', '30', 'payment-intent-1', 'order-1', 'wechat_pay', 'wechat_pay', 'TRADE-1', '29.90', 'CNY', 'succeeded', NULL, '2026-05-20 10:02:00', '2026-05-20 10:03:00', '2026-05-20 10:03:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed payment attempt");
}
