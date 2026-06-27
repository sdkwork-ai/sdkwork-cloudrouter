use axum::body::Body;
use axum::http::StatusCode;
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::app_shipment_router_with_sqlite_pool;
use sdkwork_commerce_api_server::test_http::{
    commerce_migrated_sqlite_pool, commerce_standard_test_context, commerce_test_json_request,
};
use sqlx::SqlitePool;
use tower::ServiceExt;

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

async fn seed_shipment_graph(pool: &SqlitePool) {
    let now = "2026-06-17 00:00:00";
    sqlx::query(
        r#"
        INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, payment_status,
             fulfillment_status, refund_status, subject, currency_code, request_no,
             idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
        VALUES
            ('order-ship-1', '100001', '300001', '30', 'ORD-SH-001', 'paid', 'paid',
             'fulfilled', 'none', 'Test order', 'CNY', 'ORD-SH-001', 'idem-order-ship-1',
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
            ('fulfillment-ship-1', '100001', '300001', 'FF-SH-001', 'order-ship-1', 'physical',
             'shipped', 'FF-SH-001', 'idem-ff-ship-1', ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed fulfillment");

    sqlx::query(
        r#"
        INSERT INTO commerce_shipment
            (id, tenant_id, organization_id, shipment_no, fulfillment_id, carrier_code, tracking_no,
             status, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('shipment-ship-1', '100001', '300001', 'SH-SH-001', 'fulfillment-ship-1', 'SF',
             'SF9876543210', 'in_transit', 'SH-SH-001', 'idem-shipment-ship-1', ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed shipment");

    sqlx::query(
        r#"
        INSERT INTO commerce_shipment_package
            (id, tenant_id, organization_id, shipment_id, package_no, package_type, tracking_no,
             status, created_at, updated_at)
        VALUES
            ('package-ship-1', '100001', '300001', 'shipment-ship-1', 'PKG-SH-001', 'box',
             'SF9876543210', 'in_transit', ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed package");

    sqlx::query(
        r#"
        INSERT INTO commerce_shipment_tracking_event
            (id, tenant_id, organization_id, shipment_id, carrier_code, tracking_event_no,
             tracking_no, event_type, event_status, event_time, ingested_at, created_at)
        VALUES
            ('event-ship-1', '100001', '300001', 'shipment-ship-1', 'SF', 'TE-SH-001',
             'SF9876543210', 'picked_up', 'success', ?, ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed tracking event");
}

#[tokio::test]
async fn app_shipment_router_retrieves_packages_and_tracking_events() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_shipment_graph(&pool).await;
    let app = app_shipment_router_with_sqlite_pool(pool);

    let retrieve_response = app
        .clone()
        .oneshot(commerce_test_json_request(
            "GET",
            "/app/v3/api/shipments/shipment-ship-1",
            &commerce_standard_test_context(),
            Body::empty(),
        ))
        .await
        .expect("retrieve shipment response");
    assert_eq!(StatusCode::OK, retrieve_response.status());

    let packages_response = app
        .clone()
        .oneshot(commerce_test_json_request(
            "GET",
            "/app/v3/api/shipments/shipment-ship-1/packages",
            &commerce_standard_test_context(),
            Body::empty(),
        ))
        .await
        .expect("packages response");
    assert_eq!(StatusCode::OK, packages_response.status());
    let packages_payload = response_json(packages_response).await;
    assert!(packages_payload["data"]
        .as_array()
        .is_some_and(|items| !items.is_empty()));

    let events_response = app
        .oneshot(commerce_test_json_request(
            "GET",
            "/app/v3/api/shipments/shipment-ship-1/tracking_events",
            &commerce_standard_test_context(),
            Body::empty(),
        ))
        .await
        .expect("events response");
    assert_eq!(StatusCode::OK, events_response.status());
}
