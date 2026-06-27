use axum::http::StatusCode;
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::app_refund_router_with_sqlite_pool;
use sdkwork_commerce_api_server::test_http::{
    commerce_app_write_request, commerce_migrated_sqlite_pool, commerce_standard_test_context,
    commerce_test_json_request,
};
use sqlx::SqlitePool;
use tower::ServiceExt;

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

async fn seed_paid_order_with_payment_attempt(pool: &SqlitePool) {
    let now = "2026-06-17 00:00:00";
    sqlx::query(
        r#"
        INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, payment_status,
             fulfillment_status, refund_status, subject, currency_code, request_no,
             idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
        VALUES
            ('order-refund-1', '100001', '300001', '30', 'ORD-RF-001', 'paid', 'paid',
             'fulfilled', 'none', 'Test order', 'CNY', 'ORD-RF-001', 'idem-order-refund-1',
             ?, ?, NULL, NULL, ?)
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
            ('breakdown-refund-1', '100001', '300001', 'order-refund-1', 'order_total', '39.90',
             '0.00', '39.90', 'CNY', ?)
        "#,
    )
    .bind(now)
    .execute(pool)
    .await
    .expect("seed breakdown");

    sqlx::query(
        r#"
        INSERT INTO commerce_payment_attempt
            (id, tenant_id, organization_id, owner_user_id, payment_intent_id, order_id,
             payment_method, provider_code, out_trade_no, amount, currency_code, status,
             callback_payload, created_at, paid_at, updated_at)
        VALUES
            ('pa-refund-1', '100001', '300001', '30', 'pi-refund-1', 'order-refund-1',
             'wallet', 'mock', 'OUT-RF-001', '39.90', 'CNY', 'succeeded', '{}', ?, ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed payment attempt");
}

#[tokio::test]
async fn app_refund_router_creates_lists_and_retrieves_refund() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_paid_order_with_payment_attempt(&pool).await;
    let app = app_refund_router_with_sqlite_pool(pool);
    let context = commerce_standard_test_context();
    let create_body = r#"{"orderId":"order-refund-1","reasonCode":"buyer_request"}"#;

    let create_response = app
        .clone()
        .oneshot(commerce_app_write_request(
            "POST",
            "/app/v3/api/refunds",
            "refunds.create",
            &context,
            "refund-idem-1",
            create_body,
        ))
        .await
        .expect("create refund response");
    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload = response_json(create_response).await;
    assert_eq!("0", create_payload["code"]);
    let refund_id = create_payload["data"]["refundId"]
        .as_str()
        .expect("refund id");

    let list_response = app
        .clone()
        .oneshot(commerce_test_json_request(
            "GET",
            "/app/v3/api/refunds",
            &context,
            axum::body::Body::empty(),
        ))
        .await
        .expect("list refund response");
    assert_eq!(StatusCode::OK, list_response.status());

    let retrieve_response = app
        .oneshot(commerce_test_json_request(
            "GET",
            &format!("/app/v3/api/refunds/{refund_id}"),
            &context,
            axum::body::Body::empty(),
        ))
        .await
        .expect("retrieve refund response");
    assert_eq!(StatusCode::OK, retrieve_response.status());
}
