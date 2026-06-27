use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::app_billing_history_router_with_sqlite_pool;
use sdkwork_commerce_api_server::test_http::{
    commerce_migrated_sqlite_pool, commerce_standard_test_context, commerce_test_request,
};
use sqlx::SqlitePool;
use tower::ServiceExt;

async fn seed_billing_history(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO commerce_billing_history
            (id, tenant_id, organization_id, owner_user_id, history_no, history_type,
             direction, asset_type, amount, currency_code, points_delta, status,
             title, reference_no, source_type, source_id, related_order_id,
             related_order_no, payment_method, occurred_at, metadata_json, created_at, updated_at)
        VALUES
            ('history-recharge-1', '100001', '300001', '30', 'BH-recharge-1', 'recharge',
             'credit', 'points', '99.90', 'CNY', 999, 'success',
             'Recharge', 'RC1', 'commerce_order', 'order-1', 'order-1',
             'RC1', 'wechat', '2026-05-21T00:00:00Z', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'),
            ('history-redeem-1', '100001', '300001', '30', 'BH-redeem-1', 'redeem',
             'credit', 'points', '12.50', 'CNY', 125, 'success',
             'Promotion code redemption', 'GIFT-2026', 'promotion_user_coupon', 'coupon-1', NULL,
             NULL, NULL, '2026-05-20T00:00:00Z', NULL, '2026-05-20T00:00:00Z', '2026-05-20T00:00:00Z'),
            ('history-other-user', '100001', '300001', '31', 'BH-other-1', 'recharge',
             'credit', 'points', '1.00', 'CNY', 10, 'success',
             'Other user recharge', 'RC2', 'commerce_order', 'order-2', 'order-2',
             'RC2', 'wechat', '2026-05-22T00:00:00Z', NULL, '2026-05-22T00:00:00Z', '2026-05-22T00:00:00Z')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed billing history");
}

fn subject_request(method: &str, uri: &str, body: Body) -> Request<Body> {
    commerce_test_request(
        Request::builder().method(method).uri(uri),
        Some(&commerce_standard_test_context()),
        body,
    )
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

#[tokio::test]
async fn app_billing_history_router_lists_unified_history_from_sqlite_store() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_billing_history(&pool).await;
    let app = app_billing_history_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_request(
            "GET",
            "/app/v3/api/billing/history?page=1&page_size=20",
            Body::empty(),
        ))
        .await
        .expect("billing history response");

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(2, payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("history-recharge-1", payload["data"]["items"][0]["id"]);
    assert_eq!("recharge", payload["data"]["items"][0]["type"]);
    assert_eq!("RC1", payload["data"]["items"][0]["relatedOrderNo"]);
    assert_eq!("wechat", payload["data"]["items"][0]["paymentMethod"]);
    assert_eq!(999, payload["data"]["items"][0]["pointsDelta"]);
    assert_eq!("history-redeem-1", payload["data"]["items"][1]["id"]);
    assert_eq!("redeem", payload["data"]["items"][1]["type"]);
    assert_eq!("GIFT-2026", payload["data"]["items"][1]["referenceNo"]);
}

#[tokio::test]
async fn app_billing_history_router_filters_by_history_type() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_billing_history(&pool).await;
    let app = app_billing_history_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_request(
            "GET",
            "/app/v3/api/billing/history?type=redeem&page=1&page_size=20",
            Body::empty(),
        ))
        .await
        .expect("filtered billing history response");

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(1, payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("history-redeem-1", payload["data"]["items"][0]["id"]);
    assert_eq!("redeem", payload["data"]["items"][0]["type"]);
}

#[tokio::test]
async fn app_billing_history_router_requires_authenticated_runtime_context() {
    let pool = commerce_migrated_sqlite_pool().await;
    let app = app_billing_history_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/billing/history")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
}
