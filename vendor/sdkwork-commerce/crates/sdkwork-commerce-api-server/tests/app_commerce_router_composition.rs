use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_commerce_api_server::{
    app_account_wallet_router_with_sqlite_pool, app_billing_history_router_with_sqlite_pool,
    app_catalog_router_with_sqlite_pool, app_invoice_router_with_sqlite_pool,
    app_payment_router_with_sqlite_pool, app_promotion_router_with_sqlite_pool,
    app_recharge_checkout_router_with_sqlite_pool, test_http::commerce_migrated_sqlite_pool,
};
use tower::ServiceExt;

#[tokio::test]
async fn commerce_app_routers_compose_without_overlapping_method_routes() {
    let pool = commerce_migrated_sqlite_pool().await;

    let _router = app_payment_router_with_sqlite_pool(pool.clone())
        .merge(app_account_wallet_router_with_sqlite_pool(pool.clone()))
        .merge(app_billing_history_router_with_sqlite_pool(pool.clone()))
        .merge(app_catalog_router_with_sqlite_pool(pool.clone()))
        .merge(app_invoice_router_with_sqlite_pool(pool.clone()))
        .merge(app_promotion_router_with_sqlite_pool(pool.clone()))
        .merge(app_recharge_checkout_router_with_sqlite_pool(pool));
}

#[tokio::test]
async fn commerce_app_routers_generate_request_id_for_every_registered_module() {
    let pool = commerce_migrated_sqlite_pool().await;
    let router = app_payment_router_with_sqlite_pool(pool.clone())
        .merge(app_account_wallet_router_with_sqlite_pool(pool.clone()))
        .merge(app_billing_history_router_with_sqlite_pool(pool.clone()))
        .merge(app_catalog_router_with_sqlite_pool(pool.clone()))
        .merge(app_invoice_router_with_sqlite_pool(pool.clone()))
        .merge(app_promotion_router_with_sqlite_pool(pool.clone()))
        .merge(app_recharge_checkout_router_with_sqlite_pool(pool));

    for uri in [
        "/app/v3/api/accounts/current/summary",
        "/app/v3/api/billing/history",
        "/app/v3/api/catalog/categories",
        "/app/v3/api/catalog/products",
        "/app/v3/api/invoices",
        "/app/v3/api/payments/attempts/payment-attempt-1",
        "/app/v3/api/recharges/packages",
        "/app/v3/api/wallet/points",
    ] {
        let response = router
            .clone()
            .oneshot(
                Request::builder()
                    .uri(uri)
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");

        assert_ne!(StatusCode::NOT_FOUND, response.status(), "{uri}");
        let request_id = response_request_id(&response);
        assert!(
            is_canonical_uuid(&request_id),
            "{uri} returned non-canonical request id {request_id}"
        );
    }
}

#[tokio::test]
async fn commerce_app_routers_overwrite_malformed_upstream_request_id() {
    let pool = commerce_migrated_sqlite_pool().await;
    let router = app_payment_router_with_sqlite_pool(pool.clone())
        .merge(app_account_wallet_router_with_sqlite_pool(pool.clone()))
        .merge(app_billing_history_router_with_sqlite_pool(pool.clone()))
        .merge(app_catalog_router_with_sqlite_pool(pool.clone()))
        .merge(app_invoice_router_with_sqlite_pool(pool.clone()))
        .merge(app_promotion_router_with_sqlite_pool(pool.clone()))
        .merge(app_recharge_checkout_router_with_sqlite_pool(pool));

    let response = router
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/recharges/packages")
                .header("X-Request-Id", "frontend-request-id")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::BAD_REQUEST, response.status());
    let request_id = response_request_id(&response);
    assert!(
        is_canonical_uuid(&request_id),
        "response returned non-canonical request id {request_id}"
    );
}

#[tokio::test]
async fn commerce_app_routers_overwrite_trusted_canonical_upstream_request_id() {
    let pool = commerce_migrated_sqlite_pool().await;
    let router = app_payment_router_with_sqlite_pool(pool.clone())
        .merge(app_account_wallet_router_with_sqlite_pool(pool.clone()))
        .merge(app_billing_history_router_with_sqlite_pool(pool.clone()))
        .merge(app_catalog_router_with_sqlite_pool(pool.clone()))
        .merge(app_invoice_router_with_sqlite_pool(pool.clone()))
        .merge(app_promotion_router_with_sqlite_pool(pool.clone()))
        .merge(app_recharge_checkout_router_with_sqlite_pool(pool));
    let trusted_request_id = "123e4567-e89b-12d3-a456-426614174000";

    let response = router
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/recharges/packages")
                .header("X-Request-Id", trusted_request_id)
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    let response_request_id = response_request_id(&response);
    assert!(is_canonical_uuid(&response_request_id));
    assert_ne!(trusted_request_id, response_request_id);
}

fn response_request_id(response: &axum::response::Response) -> String {
    response
        .headers()
        .get("X-Request-Id")
        .expect("response request id header")
        .to_str()
        .expect("request id header text")
        .to_owned()
}

fn is_canonical_uuid(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 36
        && bytes.iter().enumerate().all(|(index, byte)| match index {
            8 | 13 | 18 | 23 => *byte == b'-',
            _ => matches!(*byte, b'0'..=b'9' | b'a'..=b'f'),
        })
}
