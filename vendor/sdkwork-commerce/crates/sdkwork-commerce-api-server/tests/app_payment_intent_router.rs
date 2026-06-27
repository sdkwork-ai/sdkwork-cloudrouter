use axum::body::Body;
use axum::http::StatusCode;
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::app_payment_intent_router_with_sqlite_pool;
use sdkwork_commerce_api_server::test_http::{
    commerce_app_write_request, commerce_migrated_sqlite_pool, commerce_standard_test_context,
    commerce_test_json_request,
};
use sdkwork_commerce_membership_repository_sqlx::upsert_sqlite_payment_center_seed;
use sqlx::SqlitePool;
use tower::ServiceExt;

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
            ('order-intent-1', '100001', '300001', '30', 'ORD-INT-001', 'pending_payment',
             'pending', 'unfulfilled', 'none', 'Test order', 'CNY', 'ORD-INT-001', 'idem-order-1',
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
        INSERT INTO commerce_order_amount_breakdown
            (id, tenant_id, organization_id, order_id, allocation_type, original_amount,
             discount_amount, payable_amount, currency_code, created_at)
        VALUES
            ('breakdown-intent-1', '100001', '300001', 'order-intent-1', 'order_total', '19.90',
             '0.00', '19.90', 'CNY', ?)
        "#,
    )
    .bind(now)
    .execute(pool)
    .await
    .expect("seed breakdown");
}

#[tokio::test]
async fn app_payment_intent_router_creates_intent_and_attempt() {
    let pool = commerce_migrated_sqlite_pool().await;
    upsert_sqlite_payment_center_seed(&pool)
        .await
        .expect("payment center seed");
    activate_payment_method(&pool, "wechat_pay").await;
    seed_pending_order(&pool).await;
    let app = app_payment_intent_router_with_sqlite_pool(pool);
    let context = commerce_standard_test_context();
    let create_body = r#"{"orderId":"order-intent-1","paymentMethod":"wechat_pay"}"#;

    let create_response = app
        .clone()
        .oneshot(commerce_app_write_request(
            "POST",
            "/app/v3/api/payments/intents",
            "payments.intents.create",
            &context,
            "payment-intent-idem-1",
            create_body,
        ))
        .await
        .expect("create intent response");

    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload = response_json(create_response).await;
    assert_eq!("0", create_payload["code"]);
    let payment_intent_id = create_payload["data"]["paymentIntentId"]
        .as_str()
        .expect("payment intent id");

    let retrieve_response = app
        .clone()
        .oneshot(commerce_test_json_request(
            "GET",
            &format!("/app/v3/api/payments/intents/{payment_intent_id}"),
            &context,
            Body::empty(),
        ))
        .await
        .expect("retrieve response");
    assert_eq!(StatusCode::OK, retrieve_response.status());

    let attempt_body = format!(r#"{{"paymentIntentId":"{payment_intent_id}"}}"#);
    let attempt_response = app
        .oneshot(commerce_app_write_request(
            "POST",
            format!("/app/v3/api/payments/intents/{payment_intent_id}/attempts"),
            "payments.attempts.create",
            &context,
            "payment-intent-idem-1",
            &attempt_body,
        ))
        .await
        .expect("create attempt response");
    assert_eq!(StatusCode::OK, attempt_response.status());
    let attempt_payload = response_json(attempt_response).await;
    assert_eq!("0", attempt_payload["code"]);
    assert!(attempt_payload["data"]["attemptId"].is_string());
}
