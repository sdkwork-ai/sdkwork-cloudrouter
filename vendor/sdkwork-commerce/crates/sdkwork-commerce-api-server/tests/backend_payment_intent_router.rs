use axum::body::Body;
use axum::http::StatusCode;
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::backend_payment_intent_router_with_sqlite_pool;
use sdkwork_commerce_api_server::test_http::{
    commerce_migrated_sqlite_pool, commerce_standard_test_context, commerce_test_json_request,
};
use sqlx::SqlitePool;
use tower::ServiceExt;

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

async fn seed_payment_intent(pool: &SqlitePool) {
    let now = "2026-06-17 00:00:00";
    sqlx::query(
        r#"
        INSERT INTO commerce_payment_intent
            (id, tenant_id, organization_id, owner_user_id, order_id, payment_intent_no,
             payment_method, provider_code, amount, currency_code, status, request_no,
             idempotency_key, created_at, updated_at)
        VALUES
            ('intent-backend-1', '100001', '300001', '30', 'order-1', 'PI-001',
             'wechat_pay', 'wechat', '19.90', 'CNY', 'pending', 'PI-REQ-001', 'idem-1', ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed payment intent");
}

#[tokio::test]
async fn backend_payment_intent_router_lists_and_retrieves_intents() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_payment_intent(&pool).await;
    let app = backend_payment_intent_router_with_sqlite_pool(pool);

    let list_response = app
        .clone()
        .oneshot(commerce_test_json_request(
            "GET",
            "/backend/v3/api/payments/intents?status=pending",
            &commerce_standard_test_context(),
            Body::empty(),
        ))
        .await
        .expect("list response");
    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = response_json(list_response).await;
    assert_eq!("0", list_payload["code"]);
    assert_eq!(1, list_payload["data"]["content"].as_array().unwrap().len());
    assert_eq!(
        "intent-backend-1",
        list_payload["data"]["content"][0]["paymentIntentId"]
    );

    let retrieve_response = app
        .oneshot(commerce_test_json_request(
            "GET",
            "/backend/v3/api/payments/intents/intent-backend-1",
            &commerce_standard_test_context(),
            Body::empty(),
        ))
        .await
        .expect("retrieve response");
    assert_eq!(StatusCode::OK, retrieve_response.status());
    let retrieve_payload = response_json(retrieve_response).await;
    assert_eq!("0", retrieve_payload["code"]);
    assert_eq!("pending", retrieve_payload["data"]["status"]);
}
