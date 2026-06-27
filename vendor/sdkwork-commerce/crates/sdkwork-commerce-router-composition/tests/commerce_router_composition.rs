use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_commerce_router_composition::{
    commerce_app_router_with_sqlite_pool, commerce_backend_router_with_sqlite_pool,
};
use sdkwork_commerce_storage_repository_sqlx::commerce_migrated_sqlite_memory_pool;
use tower::ServiceExt;

#[tokio::test]
async fn commerce_app_router_composes_membership_and_manifest_stubs_without_overlap() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/memberships/current")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_FOUND, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_orders_list_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/orders")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_payment_methods_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/payments/methods")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_payments_create_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/payments")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"orderId":"missing-order"}"#.to_owned()))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_orders_create_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/orders")
                .header("content-type", "application/json")
                .header("Idempotency-Key", "router-compose-order-create")
                .body(Body::from(
                    r#"{"checkoutSessionId":"missing-session"}"#.to_owned(),
                ))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_user_coupon_claims_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/promotions/user_coupon_claims")
                .header("content-type", "application/json")
                .header("Idempotency-Key", "router-compose-coupon-claim")
                .body(Body::from(r#"{"offerId":"missing-offer"}"#.to_owned()))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_payments_reconcile_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/payments/reconciliations")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"orderId":"missing-order"}"#.to_owned()))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_checkout_sessions_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/checkout/sessions")
                .header("content-type", "application/json")
                .header("Idempotency-Key", "router-compose-checkout-session")
                .body(Body::from(
                    r#"{"items":[{"skuId":"missing-sku"}]}"#.to_owned(),
                ))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_after_sales_requests_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/after_sales/requests")
                .header("content-type", "application/json")
                .header("Idempotency-Key", "router-compose-after-sales")
                .body(Body::from(
                    r#"{"orderId":"missing-order","reasonCode":"damaged"}"#.to_owned(),
                ))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_cart_current_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/cart/current")
                .extension(sdkwork_iam_context_service::IamAppContext::new(
                    "100001",
                    Some("300001"),
                    "30",
                    "session-1",
                    "app-1",
                    sdkwork_iam_context_service::Environment::Test,
                    sdkwork_iam_context_service::DeploymentMode::Local,
                    sdkwork_iam_context_service::AuthLevel::Password,
                    vec!["tenant:100001".to_owned()],
                    vec!["commerce:read".to_owned()],
                ))
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_payment_intents_create_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/payments/intents")
                .header("content-type", "application/json")
                .header("Idempotency-Key", "router-compose-payment-intent")
                .body(Body::from(r#"{"orderId":"missing-order"}"#.to_owned()))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_discount_applications_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/promotions/discount_applications")
                .header("content-type", "application/json")
                .header("Idempotency-Key", "router-compose-discount-apply")
                .body(Body::from(
                    r#"{"orderId":"missing-order","userCouponId":"missing-coupon"}"#.to_owned(),
                ))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_refunds_create_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/refunds")
                .header("content-type", "application/json")
                .header("Idempotency-Key", "router-compose-refund")
                .body(Body::from(
                    r#"{"orderId":"missing-order","reasonCode":"buyer_request"}"#.to_owned(),
                ))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_shipment_packages_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/shipments/missing-shipment/packages")
                .extension(sdkwork_iam_context_service::IamAppContext::new(
                    "100001",
                    Some("300001"),
                    "30",
                    "session-1",
                    "app-1",
                    sdkwork_iam_context_service::Environment::Test,
                    sdkwork_iam_context_service::DeploymentMode::Local,
                    sdkwork_iam_context_service::AuthLevel::Password,
                    vec!["tenant:100001".to_owned()],
                    vec!["commerce:read".to_owned()],
                ))
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_app_router_returns_fulfillments_list_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_app_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/fulfillments")
                .extension(sdkwork_iam_context_service::IamAppContext::new(
                    "100001",
                    Some("300001"),
                    "30",
                    "session-1",
                    "app-1",
                    sdkwork_iam_context_service::Environment::Test,
                    sdkwork_iam_context_service::DeploymentMode::Local,
                    sdkwork_iam_context_service::AuthLevel::Password,
                    vec!["tenant:100001".to_owned()],
                    vec!["commerce:read".to_owned()],
                ))
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_backend_router_returns_shops_list_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_backend_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/shops?page=1&pageSize=20")
                .extension(sdkwork_iam_context_service::IamAppContext::new(
                    "100001",
                    Some("300001"),
                    "30",
                    "session-1",
                    "app-1",
                    sdkwork_iam_context_service::Environment::Test,
                    sdkwork_iam_context_service::DeploymentMode::Local,
                    sdkwork_iam_context_service::AuthLevel::Password,
                    vec!["tenant:100001".to_owned()],
                    vec!["commerce:read".to_owned()],
                ))
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}

#[tokio::test]
async fn commerce_backend_router_returns_payment_methods_instead_of_manifest_stub() {
    let pool = commerce_migrated_sqlite_memory_pool().await;
    let router = commerce_backend_router_with_sqlite_pool(pool);

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/payments/methods")
                .extension(sdkwork_iam_context_service::IamAppContext::new(
                    "100001",
                    Some("300001"),
                    "30",
                    "session-1",
                    "app-1",
                    sdkwork_iam_context_service::Environment::Test,
                    sdkwork_iam_context_service::DeploymentMode::Local,
                    sdkwork_iam_context_service::AuthLevel::Password,
                    vec!["tenant:100001".to_owned()],
                    vec!["commerce:read".to_owned()],
                ))
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_ne!(StatusCode::NOT_IMPLEMENTED, response.status());
}
