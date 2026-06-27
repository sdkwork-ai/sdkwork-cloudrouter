use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::test_http::{
    commerce_app_write_request, commerce_app_write_request_without_request_no,
    commerce_migrated_sqlite_pool, commerce_standard_test_context, commerce_test_json_request,
};
use sdkwork_commerce_api_server::{
    app_account_wallet_router_with_sqlite_pool, app_promotion_router_with_sqlite_pool,
};
use sqlx::SqlitePool;
use tower::ServiceExt;

async fn seed_promotion_codes(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO promotion_offer
            (id, tenant_id, organization_id, offer_no, offer_code, name, offer_type,
             audience_scope, combinability, priority, status, current_offer_version_id, starts_at, ends_at,
             created_at, updated_at)
        VALUES
            ('offer-welcome', '100001', '300001', 'offer-welcome', 'welcome_points',
             'Welcome points', 'coupon', 'new_user', 'exclusive', 100, 'active',
             'offer-version-welcome-v1',
             '2026-01-01 00:00:00', '2099-01-01 00:00:00',
             '2026-05-20 00:00:00', '2026-05-20 00:00:00'),
            ('offer-other-org', '100001', '300002', 'offer-other-org', 'other_org_points',
             'Other org points', 'coupon', 'new_user', 'exclusive', 90, 'active',
             'offer-version-other-org-v1',
             '2026-01-01 00:00:00', '2099-01-01 00:00:00',
             '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed promotion offers");

    sqlx::query(
        r#"
        INSERT INTO promotion_offer_version
            (id, tenant_id, organization_id, offer_id, version_no, lifecycle_status,
             discount_type, discount_value, minimum_amount, maximum_discount_amount,
             currency_code, rule_json, stack_rule_json, published_at, created_at, updated_at)
        VALUES
            ('offer-version-welcome-v1', '100001', '300001', 'offer-welcome', 'v1',
             'published', 'fixed_amount', '5.00', '0', NULL, 'CNY',
             '{}', NULL, '2026-05-20 00:00:00',
             '2026-05-20 00:00:00', '2026-05-20 00:00:00'),
            ('offer-version-other-org-v1', '100001', '300002', 'offer-other-org', 'v1',
             'published', 'fixed_amount', '9.00', '0', NULL, 'CNY',
             '{}', NULL, '2026-05-20 00:00:00',
             '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed promotion offer versions");

    sqlx::query(
        r#"
        INSERT INTO promotion_coupon_stock
            (id, tenant_id, organization_id, stock_no, name, offer_id, offer_version_id,
             stock_type, total_quantity, available_quantity, claimed_quantity,
             redeemed_quantity, locked_quantity, status, starts_at, expires_at,
             created_at, updated_at)
        VALUES
            ('stock-welcome', '100001', '300001', 'stock-welcome', 'Welcome stock', 'offer-welcome',
             'offer-version-welcome-v1', 'limited', 100, 100, 0, 0, 0, 'active',
             '2026-01-01 00:00:00', '2099-01-01 00:00:00',
             '2026-05-20 00:00:00', '2026-05-20 00:00:00'),
            ('stock-other-org', '100001', '300002', 'stock-other-org', 'Other org stock', 'offer-other-org',
             'offer-version-other-org-v1', 'limited', 100, 100, 0, 0, 0, 'active',
             '2026-01-01 00:00:00', '2099-01-01 00:00:00',
             '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed promotion coupon stocks");

    sqlx::query(
        r#"
        INSERT INTO promotion_code
            (id, tenant_id, organization_id, code_no, stock_id, offer_id, offer_version_id, promotion_code,
             code_type, max_claims, claimed_quantity, status, starts_at, expires_at,
             created_at, updated_at)
        VALUES
            ('code-welcome', '100001', '300001', 'code-welcome', 'stock-welcome',
             'offer-welcome', 'offer-version-welcome-v1', 'WELCOME', 'public', 100, 0, 'active',
             '2026-01-01 00:00:00', '2099-01-01 00:00:00',
             '2026-05-20 00:00:00', '2026-05-20 00:00:00'),
            ('code-other-org', '100001', '300002', 'code-other-org', 'stock-other-org',
             'offer-other-org', 'offer-version-other-org-v1', 'WELCOME-OTHER', 'public', 100, 0, 'active',
             '2026-01-01 00:00:00', '2099-01-01 00:00:00',
             '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed promotion codes");
}

async fn seed_token_account(pool: &SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO commerce_account
            (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code,
             available_amount, frozen_amount, status, version, created_at, updated_at)
        VALUES
            ('token-account-1', '100001', '300001', '30', 'token', NULL,
             '120', '8', 'active', 1, '2026-05-20 00:00:00', '2026-05-20 00:00:00'),
            ('token-account-other-org', '100001', '300002', '30', 'token', NULL,
             '999', '0', 'active', 1, '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
    )
    .execute(pool)
    .await
    .expect("seed token account");
}

async fn seed_account_summary(pool: &SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE iam_user (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            username TEXT,
            display_name TEXT,
            email TEXT,
            status TEXT
        )
        "#,
        r#"
        CREATE TABLE iam_organization (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            name TEXT,
            status TEXT
        )
        "#,
        r#"
        INSERT INTO iam_user
            (id, tenant_id, username, display_name, email, status)
        VALUES
            ('30', '100001', 'ada', 'Ada Lovelace', 'ada@example.test', 'active')
        "#,
        r#"
        INSERT INTO iam_organization
            (id, tenant_id, name, status)
        VALUES
            ('300001', '100001', 'Research Console', 'active')
        "#,
        r#"
        INSERT INTO commerce_account
            (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code,
             available_amount, frozen_amount, status, version, created_at, updated_at)
        VALUES
            ('points-account-1', '100001', '300001', '30', 'points', NULL,
             '88', '0', 'active', 1, '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
    ] {
        sqlx::query(statement)
            .execute(pool)
            .await
            .expect("seed account summary");
    }
}

fn subject_read_request(method: &str, uri: &str) -> Request<Body> {
    commerce_test_json_request(
        method,
        uri,
        &commerce_standard_test_context(),
        Body::empty(),
    )
}

fn subject_write_request(uri: &str, scope: &str, body_json: &str) -> Request<Body> {
    commerce_app_write_request(
        "POST",
        uri,
        scope,
        &commerce_standard_test_context(),
        "redeem-idem-1",
        body_json,
    )
}

fn subject_request_with_request_id_header_only(
    uri: &str,
    scope: &str,
    idempotency_key: &str,
    body_json: &str,
) -> Request<Body> {
    commerce_app_write_request_without_request_no(
        "POST",
        uri,
        scope,
        &commerce_standard_test_context(),
        idempotency_key,
        body_json,
        &[("X-Request-Id", "123e4567-e89b-12d3-a456-426614174000")],
    )
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

#[tokio::test]
async fn app_account_wallet_router_exposes_account_summary_from_commerce_store() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_account_summary(&pool).await;
    let app = app_account_wallet_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_read_request(
            "GET",
            "/app/v3/api/accounts/current/summary",
        ))
        .await
        .expect("account summary response");

    assert_eq!(response.status(), StatusCode::OK);
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("30", payload["data"]["id"]);
    assert_eq!("Ada Lovelace", payload["data"]["name"]);
    assert_eq!("ada@example.test", payload["data"]["email"]);
    assert_eq!("Research Console", payload["data"]["organization"]);
    assert_eq!(88.0, payload["data"]["availableCredits"]);
    assert_eq!(0.0, payload["data"]["monthlyConsumption"]);
    assert!(payload["data"]["consumptionByService"]
        .as_array()
        .unwrap()
        .is_empty());
}

#[tokio::test]
async fn app_promotion_router_redeems_code_and_exposes_points_and_coupon_history() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_promotion_codes(&pool).await;
    let app = app_promotion_router_with_sqlite_pool(pool);

    let response = app
        .clone()
        .oneshot(subject_write_request(
            "/app/v3/api/promotions/codes/redemptions",
            "promotions.codes.redeem",
            r#"{"code":"WELCOME"}"#,
        ))
        .await
        .expect("redeem response");

    assert_eq!(response.status(), StatusCode::OK);
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("Promotion code redeemed", payload["data"]["message"]);
    assert_eq!("5.00", payload["data"]["amount"]);
    assert_eq!(50, payload["data"]["creditedPoints"]);
    assert_eq!(50, payload["data"]["balance"]);

    let response = app
        .clone()
        .oneshot(subject_read_request("GET", "/app/v3/api/wallet/points"))
        .await
        .expect("points response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(50, payload["data"]["availablePoints"]);
    assert_eq!(0, payload["data"]["frozenPoints"]);

    let response = app
        .clone()
        .oneshot(subject_read_request(
            "GET",
            "/app/v3/api/wallet/points/history",
        ))
        .await
        .expect("points history response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(1, payload["data"].as_array().unwrap().len());
    assert_eq!(50, payload["data"][0]["amount"]);
    assert_eq!("in", payload["data"][0]["direction"]);
    assert_eq!("redeem", payload["data"][0]["businessType"]);
    assert_eq!(50, payload["data"][0]["balanceAfter"]);

    let response = app
        .oneshot(subject_read_request(
            "GET",
            "/app/v3/api/promotions/user_coupons",
        ))
        .await
        .expect("coupon history response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(1, payload["data"].as_array().unwrap().len());
    assert_eq!("5.00", payload["data"][0]["amount"]);
    assert_eq!("success", payload["data"][0]["status"]);
}

#[tokio::test]
async fn app_promotion_router_claims_user_coupon_for_offer() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_promotion_codes(&pool).await;
    let app = app_promotion_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_write_request(
            "/app/v3/api/promotions/user_coupon_claims",
            "promotions.userCoupons.claim",
            r#"{"offerId":"offer-welcome"}"#,
        ))
        .await
        .expect("claim coupon response");

    assert_eq!(response.status(), StatusCode::OK);
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("5.00", payload["data"]["amount"]);
    assert_eq!("pending", payload["data"]["status"]);
}

async fn seed_claimed_user_coupon(pool: &SqlitePool) -> String {
    let now = "2026-06-17 00:00:00";
    sqlx::query(
        r#"
        INSERT INTO promotion_user_coupon
            (id, tenant_id, organization_id, coupon_no, stock_id, code_id, offer_id,
             offer_version_id, subject_type, subject_id, owner_user_id, coupon_code,
             status, claimed_at, valid_from, expires_at, redeemed_at, disabled_at,
             request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('user-coupon-apply-1', '100001', '300001', 'coupon-apply-1', 'stock-welcome',
             NULL, 'offer-welcome', 'offer-version-welcome-v1', 'user', '30', '30',
             'WELCOME-APPLY', 'claimed', ?, ?, '2099-01-01 00:00:00', NULL, NULL,
             'claim-apply-1', 'claim-apply-idem-1', ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed claimed user coupon");
    "user-coupon-apply-1".to_owned()
}

async fn seed_discount_order(pool: &SqlitePool) {
    let now = "2026-06-17 00:00:00";
    sqlx::query(
        r#"
        INSERT INTO commerce_order
            (id, tenant_id, organization_id, owner_user_id, order_no, status, payment_status,
             fulfillment_status, refund_status, subject, currency_code, request_no,
             idempotency_key, created_at, paid_at, cancelled_at, expired_at, updated_at)
        VALUES
            ('order-discount-1', '100001', '300001', '30', 'ORD-DISC-001', 'pending_payment',
             'pending', 'unfulfilled', 'none', 'Discount order', 'CNY', 'ORD-DISC-001', 'idem-disc-1',
             ?, NULL, NULL, ?, ?)
        "#,
    )
    .bind(now)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .expect("seed discount order");
}

#[tokio::test]
async fn app_promotion_router_applies_and_reverses_discount_application() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_promotion_codes(&pool).await;
    seed_claimed_user_coupon(&pool).await;
    seed_discount_order(&pool).await;
    let app = app_promotion_router_with_sqlite_pool(pool);

    let apply_response = app
        .clone()
        .oneshot(subject_write_request(
            "/app/v3/api/promotions/discount_applications",
            "promotions.discounts.apply",
            r#"{"orderId":"order-discount-1","userCouponId":"user-coupon-apply-1"}"#,
        ))
        .await
        .expect("apply discount response");
    assert_eq!(apply_response.status(), StatusCode::OK);
    let apply_payload = response_json(apply_response).await;
    assert_eq!("2000", apply_payload["code"]);
    assert_eq!("success", apply_payload["data"]["status"]);

    let reverse_response = app
        .oneshot(subject_write_request(
            "/app/v3/api/promotions/discount_applications/reversals",
            "promotions.discounts.reverse",
            r#"{"userCouponId":"user-coupon-apply-1"}"#,
        ))
        .await
        .expect("reverse discount response");
    assert_eq!(reverse_response.status(), StatusCode::OK);
    let reverse_payload = response_json(reverse_response).await;
    assert_eq!("2000", reverse_payload["code"]);
    assert_eq!("pending", reverse_payload["data"]["status"]);
}

#[tokio::test]
async fn app_promotion_router_does_not_use_frontend_request_id_as_business_request_no() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_promotion_codes(&pool).await;
    let inspect_pool = pool.clone();
    let app = app_promotion_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_request_with_request_id_header_only(
            "/app/v3/api/promotions/codes/redemptions",
            "promotions.codes.redeem",
            "redeem-idem-header-only",
            r#"{"code":"WELCOME"}"#,
        ))
        .await
        .expect("redeem response");

    assert_eq!(response.status(), StatusCode::OK);
    let request_no: String = sqlx::query_scalar(
        r#"
        SELECT request_no
        FROM promotion_user_coupon
        WHERE tenant_id = '100001'
          AND owner_user_id = '30'
          AND idempotency_key = 'redeem-idem-header-only'
        "#,
    )
    .fetch_one(&inspect_pool)
    .await
    .expect("coupon request_no");
    assert_ne!("123e4567-e89b-12d3-a456-426614174000", request_no);
    assert!(request_no.starts_with("promotion-code-redemption-30-WELCOME-"));
}

#[tokio::test]
async fn app_promotion_router_requires_authenticated_runtime_context_for_points_reads() {
    let pool = commerce_migrated_sqlite_pool().await;
    let app = app_promotion_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/wallet/points")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn app_account_wallet_router_exposes_token_balance_from_standard_account_table() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_token_account(&pool).await;
    let app = app_account_wallet_router_with_sqlite_pool(pool);

    let response = app
        .clone()
        .oneshot(subject_read_request("GET", "/app/v3/api/wallet/tokens"))
        .await
        .expect("token balance response");

    assert_eq!(response.status(), StatusCode::OK);
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(120, payload["data"]["availableTokens"]);
    assert_eq!(8, payload["data"]["frozenTokens"]);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/wallet/tokens")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("missing subject response");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn app_account_wallet_router_does_not_register_retired_token_deduction_route() {
    let pool = commerce_migrated_sqlite_pool().await;
    let app = app_account_wallet_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(commerce_test_json_request(
            "POST",
            "/app/v3/api/wallet/tokens/deductions",
            &commerce_standard_test_context(),
            Body::from("{}"),
        ))
        .await
        .expect("token deductions response");

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
