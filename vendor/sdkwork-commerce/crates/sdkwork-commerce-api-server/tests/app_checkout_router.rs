use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::app_checkout_router_with_sqlite_pool;
use sdkwork_commerce_api_server::test_http::{
    commerce_migrated_sqlite_pool, commerce_standard_test_context, commerce_test_command_request,
    commerce_test_json_request,
};
use sdkwork_commerce_order_service::{
    checkout_owner_order_request_hash, checkout_quote_request_hash, checkout_session_request_hash,
    CheckoutLineInput, CreateCheckoutQuoteCommand, CreateCheckoutSessionCommand,
    CreateOwnerOrderCommand,
};
use sqlx::SqlitePool;
use tower::ServiceExt;

fn checkout_session_request_hash_for_request(
    sku_id: &str,
    quantity: i64,
    currency_code: &str,
) -> String {
    let lines = vec![CheckoutLineInput::new(sku_id, quantity).expect("line")];
    let command = CreateCheckoutSessionCommand::new(
        "100001",
        Some("300001"),
        "30",
        currency_code,
        lines,
        "checkout-request-1",
        "checkout-idem-1",
    )
    .expect("command");
    checkout_session_request_hash(&command)
}

fn subject_session_command_request(
    sku_id: &str,
    quantity: i64,
    currency_code: &str,
    body: &str,
) -> Request<Body> {
    commerce_test_command_request(
        "POST",
        "/app/v3/api/checkout/sessions",
        &commerce_standard_test_context(),
        "checkout-idem-1",
        "checkout-request-1",
        Some(&checkout_session_request_hash_for_request(
            sku_id,
            quantity,
            currency_code,
        )),
        Body::from(body.to_owned()),
    )
}

fn checkout_quote_request_hash_for_session(session_id: &str) -> String {
    let command = CreateCheckoutQuoteCommand::new(
        "100001",
        Some("300001"),
        "30",
        session_id,
        "checkout-request-1",
        "checkout-idem-1",
    )
    .expect("command");
    checkout_quote_request_hash(&command)
}

fn checkout_order_request_hash_for_session(session_id: &str) -> String {
    let command = CreateOwnerOrderCommand::new(
        "100001",
        Some("300001"),
        "30",
        session_id,
        "checkout-request-1",
        "checkout-idem-1",
    )
    .expect("command");
    checkout_owner_order_request_hash(&command)
}

fn subject_quote_command_request(session_id: &str) -> Request<Body> {
    commerce_test_command_request(
        "POST",
        format!("/app/v3/api/checkout/sessions/{session_id}/quotes"),
        &commerce_standard_test_context(),
        "checkout-idem-1",
        "checkout-request-1",
        Some(&checkout_quote_request_hash_for_session(session_id)),
        Body::empty(),
    )
}

fn subject_order_command_request(session_id: &str) -> Request<Body> {
    commerce_test_command_request(
        "POST",
        format!("/app/v3/api/checkout/sessions/{session_id}/orders"),
        &commerce_standard_test_context(),
        "checkout-idem-1",
        "checkout-request-1",
        Some(&checkout_order_request_hash_for_session(session_id)),
        Body::empty(),
    )
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

async fn seed_catalog_sku(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO commerce_product_spu
            (id, tenant_id, organization_id, spu_no, title, product_type, status, visible_surfaces, created_at, updated_at)
        VALUES
            ('product-1', '100001', '300001', 'product-1', 'Sample product', 'standard', 'active', '["app"]', '2026-06-17 00:00:00', '2026-06-17 00:00:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed product");

    sqlx::query(
        r#"
        INSERT INTO commerce_product_sku
            (id, tenant_id, organization_id, spu_id, sku_no, name, title, price_amount, currency_code, fulfillment_type, inventory_tracking, status, created_at, updated_at)
        VALUES
            ('sku-1', '100001', '300001', 'product-1', 'sku-1', 'Sample SKU', 'Sample SKU', '19.90', 'CNY', 'digital', 'untracked', 'active', '2026-06-17 00:00:00', '2026-06-17 00:00:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed sku");
}

#[tokio::test]
async fn app_checkout_router_creates_session_and_order() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_catalog_sku(&pool).await;
    let app = app_checkout_router_with_sqlite_pool(pool);

    let create_response = app
        .clone()
        .oneshot(subject_session_command_request(
            "sku-1",
            1,
            "CNY",
            r#"{"items":[{"skuId":"sku-1","quantity":1}],"currencyCode":"CNY"}"#,
        ))
        .await
        .expect("create session response");

    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload = response_json(create_response).await;
    assert_eq!("0", create_payload["code"]);
    let session_id = create_payload["data"]["checkoutSessionId"]
        .as_str()
        .expect("checkout session id");

    let retrieve_response = app
        .clone()
        .oneshot(commerce_test_json_request(
            "GET",
            &format!("/app/v3/api/checkout/sessions/{session_id}"),
            &commerce_standard_test_context(),
            Body::empty(),
        ))
        .await
        .expect("retrieve response");
    assert_eq!(StatusCode::OK, retrieve_response.status());

    let order_response = app
        .oneshot(subject_order_command_request(session_id))
        .await
        .expect("create order response");
    assert_eq!(StatusCode::OK, order_response.status());
    let order_payload = response_json(order_response).await;
    assert_eq!("0", order_payload["code"]);
    assert!(order_payload["data"]["orderNo"].is_string());
}

#[tokio::test]
async fn app_checkout_router_creates_quote() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_catalog_sku(&pool).await;
    let app = app_checkout_router_with_sqlite_pool(pool);

    let create_response = app
        .clone()
        .oneshot(subject_session_command_request(
            "sku-1",
            2,
            "CNY",
            r#"{"items":[{"skuId":"sku-1","quantity":2}]}"#,
        ))
        .await
        .expect("create session response");

    let create_payload = response_json(create_response).await;
    let session_id = create_payload["data"]["checkoutSessionId"]
        .as_str()
        .expect("checkout session id");

    let quote_response = app
        .oneshot(subject_quote_command_request(session_id))
        .await
        .expect("quote response");

    assert_eq!(StatusCode::OK, quote_response.status());
    let quote_payload = response_json(quote_response).await;
    assert_eq!("0", quote_payload["code"]);
    assert_eq!("39.80", quote_payload["data"]["payableAmount"]);
}

#[tokio::test]
async fn app_checkout_router_rejects_missing_request_hash() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_catalog_sku(&pool).await;
    let app = app_checkout_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(commerce_test_command_request(
            "POST",
            "/app/v3/api/checkout/sessions",
            &commerce_standard_test_context(),
            "checkout-idem-1",
            "checkout-request-1",
            None,
            Body::from(r#"{"items":[{"skuId":"sku-1","quantity":1}]}"#.to_owned()),
        ))
        .await
        .expect("create session response");

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
}
