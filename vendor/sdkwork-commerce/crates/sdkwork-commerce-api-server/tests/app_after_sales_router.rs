use axum::http::StatusCode;
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::app_after_sales_router_with_sqlite_pool;
use sdkwork_commerce_api_server::test_http::{
    commerce_app_write_request, commerce_migrated_sqlite_pool, commerce_standard_test_context,
    commerce_test_request,
};
use sqlx::SqlitePool;
use tower::ServiceExt;

fn write_body_with_after_sales_request_id(request_id: &str, body_json: &str) -> String {
    let mut value: serde_json::Value =
        serde_json::from_str(body_json).expect("after sales write body must be valid json");
    if let serde_json::Value::Object(ref mut fields) = value {
        fields.insert(
            "afterSalesRequestId".to_string(),
            serde_json::Value::String(request_id.to_owned()),
        );
    }
    value.to_string()
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

async fn seed_paid_order(pool: &SqlitePool) {
    let now = "2026-06-17 00:00:00";
    sqlx::query(
        r#"
        INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, payment_status,
             fulfillment_status, refund_status, subject, currency_code, request_no,
             idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
        VALUES
            ('order-as-1', '100001', '300001', '30', 'ORD-AS-001', 'paid', 'paid',
             'fulfilled', 'none', 'Test order', 'CNY', 'ORD-AS-001', 'idem-order-as-1',
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
            ('breakdown-as-1', '100001', '300001', 'order-as-1', 'order_total', '29.90',
             '0.00', '29.90', 'CNY', ?)
        "#,
    )
    .bind(now)
    .execute(pool)
    .await
    .expect("seed breakdown");
}

#[tokio::test]
async fn app_after_sales_router_creates_request_return_shipment_and_lists_events() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_paid_order(&pool).await;
    let app = app_after_sales_router_with_sqlite_pool(pool);
    let context = commerce_standard_test_context();
    let create_body =
        r#"{"orderId":"order-as-1","reasonCode":"damaged","afterSalesType":"refund"}"#;

    let create_response = app
        .clone()
        .oneshot(commerce_app_write_request(
            "POST",
            "/app/v3/api/after_sales/requests",
            "afterSales.requests.create",
            &context,
            "after-sales-idem-1",
            create_body,
        ))
        .await
        .expect("create after sales response");

    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload = response_json(create_response).await;
    assert_eq!("0", create_payload["code"]);
    let request_id = create_payload["data"]["afterSalesRequestId"]
        .as_str()
        .expect("after sales request id");
    assert!(create_payload["data"]["afterSalesNo"].is_string());

    let return_body =
        write_body_with_after_sales_request_id(request_id, r#"{"trackingNo":"SF1234567890"}"#);
    let return_response = app
        .clone()
        .oneshot(commerce_app_write_request(
            "POST",
            format!("/app/v3/api/after_sales/requests/{request_id}/return_shipments"),
            "afterSales.returnShipments.create",
            &context,
            "after-sales-idem-1",
            &return_body,
        ))
        .await
        .expect("return shipment response");
    assert_eq!(StatusCode::OK, return_response.status());

    let events_response = app
        .oneshot(commerce_test_request(
            axum::http::Request::builder().method("GET").uri(format!(
                "/app/v3/api/after_sales/requests/{request_id}/events"
            )),
            Some(&context),
            axum::body::Body::empty(),
        ))
        .await
        .expect("events response");
    assert_eq!(StatusCode::OK, events_response.status());
    let events_payload = response_json(events_response).await;
    assert_eq!("0", events_payload["code"]);
    assert!(events_payload["data"]
        .as_array()
        .is_some_and(|items| !items.is_empty()));
}
