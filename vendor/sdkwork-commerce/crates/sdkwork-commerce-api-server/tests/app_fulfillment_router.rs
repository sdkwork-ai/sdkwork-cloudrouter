use axum::body::Body;
use axum::http::StatusCode;
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::app_fulfillment_router_with_sqlite_pool;
use sdkwork_commerce_api_server::test_http::{
    commerce_migrated_sqlite_pool, commerce_standard_test_context, commerce_test_json_request,
};
use sqlx::SqlitePool;
use tower::ServiceExt;

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

async fn seed_fulfillment_graph(pool: &SqlitePool) {
    let now = "2026-06-17 00:00:00";
    sqlx::query(
        r#"
        INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, payment_status,
             fulfillment_status, refund_status, subject, currency_code, request_no,
             idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
        VALUES
            ('order-ff-1', '100001', '300001', '30', 'ORD-FF-001', 'paid', 'paid',
             'fulfilled', 'none', 'Test order', 'CNY', 'ORD-FF-001', 'idem-order-ff-1',
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
        INSERT INTO commerce_fulfillment_order
            (id, tenant_id, organization_id, fulfillment_no, order_id, fulfillment_type, status,
             request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('fulfillment-ff-1', '100001', '300001', 'FF-001', 'order-ff-1', 'physical',
             'shipped', 'FF-001', 'idem-ff-1', ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed fulfillment");
}

#[tokio::test]
async fn app_fulfillment_router_lists_and_retrieves_owner_fulfillments() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_fulfillment_graph(&pool).await;
    let app = app_fulfillment_router_with_sqlite_pool(pool);

    let list_response = app
        .clone()
        .oneshot(commerce_test_json_request(
            "GET",
            "/app/v3/api/fulfillments?orderId=order-ff-1",
            &commerce_standard_test_context(),
            Body::empty(),
        ))
        .await
        .expect("list response");
    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = response_json(list_response).await;
    assert_eq!("0", list_payload["code"].as_str().unwrap_or_default());
    assert!(list_payload["data"]
        .as_array()
        .is_some_and(|items| !items.is_empty()));

    let retrieve_response = app
        .oneshot(commerce_test_json_request(
            "GET",
            "/app/v3/api/fulfillments/fulfillment-ff-1",
            &commerce_standard_test_context(),
            Body::empty(),
        ))
        .await
        .expect("retrieve response");
    assert_eq!(StatusCode::OK, retrieve_response.status());
    let retrieve_payload = response_json(retrieve_response).await;
    assert_eq!(
        "fulfillment-ff-1",
        retrieve_payload["data"]["fulfillmentId"]
            .as_str()
            .unwrap_or_default()
    );
}
