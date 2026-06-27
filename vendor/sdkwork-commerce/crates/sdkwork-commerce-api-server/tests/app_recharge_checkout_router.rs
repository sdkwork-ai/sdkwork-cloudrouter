use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::app_recharge_checkout_router_with_sqlite_pool;
use sdkwork_commerce_api_server::test_http::{
    commerce_app_write_request, commerce_app_write_request_with_options,
    commerce_app_write_request_without_request_no, commerce_migrated_sqlite_pool,
    commerce_standard_test_context, commerce_test_json_request,
};
use sdkwork_commerce_membership_repository_sqlx::upsert_sqlite_commerce_experience_seed;
use sqlx::SqlitePool;
use tower::ServiceExt;

async fn seed_recharge_data(pool: &SqlitePool) {
    for statement in [
        r#"
        INSERT INTO commerce_product_spu
            (id, tenant_id, organization_id, spu_no, title, product_type, status, visible_surfaces, created_at, updated_at)
        VALUES
            ('product-owner', '100001', '300001', 'points-recharge-owner', 'Points recharge', 'points_recharge', 'active', '["app"]', '2026-05-20 00:00:00', '2026-05-20 00:00:00'),
            ('product-tenant-20', '100001', NULL, 'points-recharge-tenant', 'Tenant points recharge', 'points_recharge', 'active', '["app"]', '2026-05-20 00:00:00', '2026-05-20 00:00:00'),
            ('product-other-org', '100001', '300002', 'points-recharge-other', 'Other Org Recharge', 'points_recharge', 'active', '["app"]', '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
        r#"
        INSERT INTO commerce_product_sku
            (id, tenant_id, organization_id, spu_id, sku_no, name, title, price_amount, currency_code, fulfillment_type, inventory_tracking, status, created_at, updated_at)
        VALUES
            ('sku-owner-10', '100001', '300001', 'product-owner', 'starter', 'Starter Pack', 'Starter Pack', '10.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-05-20 00:00:00', '2026-05-20 00:00:00'),
            ('sku-tenant-20', '100001', NULL, 'product-tenant-20', 'tenant-pack', 'Tenant Pack', 'Tenant Pack', '20.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-05-20 00:00:00', '2026-05-20 00:00:00'),
            ('sku-other-org-30', '100001', '300002', 'product-other-org', 'other-pack', 'Other Org Pack', 'Other Org Pack', '30.00', 'CNY', 'points_credit', 'untracked', 'active', '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
        r#"
        INSERT INTO commerce_recharge_package
            (id, tenant_id, organization_id, external_id, package_no, sku_id, name, price_amount, currency_code, bonus_points, status, valid_from, valid_to, sort_weight, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('pack-owner-10', '100001', '300001', 1001, 'starter', 'sku-owner-10', 'Starter Pack', '10.00', 'CNY', 25, 'active', '2026-01-01 00:00:00', '2099-01-01 00:00:00', 1, 'seed-pack-owner', 'seed-pack-owner', '2026-05-20 00:00:00', '2026-05-20 00:00:00'),
            ('pack-tenant-20', '100001', NULL, 1002, 'tenant-pack', 'sku-tenant-20', 'Tenant Pack', '20.00', 'CNY', 50, 'active', '2026-01-01 00:00:00', '2099-01-01 00:00:00', 2, 'seed-pack-tenant', 'seed-pack-tenant', '2026-05-20 00:00:00', '2026-05-20 00:00:00'),
            ('pack-other-org-30', '100001', '300002', 1002, 'other-pack', 'sku-other-org-30', 'Other Org Pack', '30.00', 'CNY', 75, 'active', '2026-01-01 00:00:00', '2099-01-01 00:00:00', 2, 'seed-pack-other', 'seed-pack-other', '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
        r#"
        INSERT INTO commerce_payment_method
            (id, tenant_id, organization_id, method_key, display_name, provider_code, status, sort_order, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('method-wechat-pay', '100001', '300001', 'wechat_pay', 'WeChat Pay', 'wechat_pay', 'active', 1, 'seed-method-wechat-pay', 'seed-method-wechat-pay', '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
        r#"
        INSERT INTO commerce_exchange_rule
            (id, tenant_id, organization_id, rule_no, source_asset_type, target_asset_type, rate, status, remark, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('exchange-cash-points-owner', '100001', '300001', 'CASH_TO_POINTS', 'cash', 'points', '10.000000', 'active', '{"baseCurrencyCode":"CNY","currencyToCnyRates":{"CNY":"1","USD":"7"}}', 'seed-exchange-cash-points-owner', 'seed-exchange-cash-points-owner', '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
    ] {
        sqlx::query(statement)
            .execute(pool)
            .await
            .expect("seed recharge data");
    }
}

fn subject_read_request(method: &str, uri: impl AsRef<str>) -> Request<Body> {
    commerce_test_json_request(
        method,
        uri.as_ref(),
        &commerce_standard_test_context(),
        Body::empty(),
    )
}

fn subject_write_request(body_json: &str) -> Request<Body> {
    commerce_app_write_request(
        "POST",
        "/app/v3/api/recharges/orders",
        "recharge.submit",
        &commerce_standard_test_context(),
        "recharge-idem-1",
        body_json,
    )
}

fn subject_write_request_with_idempotency(
    idempotency_key: &str,
    request_no: &str,
    body_json: &str,
) -> Request<Body> {
    commerce_app_write_request_with_options(
        "POST",
        "/app/v3/api/recharges/orders",
        "recharge.submit",
        &commerce_standard_test_context(),
        idempotency_key,
        Some(request_no),
        body_json,
        &[],
    )
}

fn subject_request_with_request_id_header_only(
    idempotency_key: &str,
    body_json: &str,
) -> Request<Body> {
    commerce_app_write_request_without_request_no(
        "POST",
        "/app/v3/api/recharges/orders",
        "recharge.submit",
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
async fn app_recharge_router_lists_packages_from_sqlite_store() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_recharge_data(&pool).await;
    let app = app_recharge_checkout_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_read_request(
            "GET",
            "/app/v3/api/recharges/packages",
        ))
        .await
        .expect("packages response");

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(2, payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("pack-owner-10", payload["data"]["items"][0]["id"]);
    assert_eq!("10.00", payload["data"]["items"][0]["priceAmount"]);
    assert_eq!("CNY", payload["data"]["items"][0]["currencyCode"]);
    assert_eq!(25, payload["data"]["items"][0]["bonusPoints"]);
    assert_eq!(125, payload["data"]["items"][0]["grantAmount"]);
    assert_eq!(125, payload["data"]["items"][0]["points"]);
    assert_eq!("pack-tenant-20", payload["data"]["items"][1]["id"]);
    assert_eq!("20.00", payload["data"]["items"][1]["priceAmount"]);
    assert_eq!("CNY", payload["data"]["items"][1]["currencyCode"]);
    assert_eq!(50, payload["data"]["items"][1]["bonusPoints"]);
    assert_eq!(250, payload["data"]["items"][1]["grantAmount"]);
    assert_eq!(250, payload["data"]["items"][1]["points"]);
}

#[tokio::test]
async fn app_recharge_router_lists_default_seed_packages_for_current_tenant() {
    let pool = commerce_migrated_sqlite_pool().await;
    upsert_sqlite_commerce_experience_seed(&pool)
        .await
        .expect("commerce experience seed");
    let app = app_recharge_checkout_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_read_request(
            "GET",
            "/app/v3/api/recharges/packages",
        ))
        .await
        .expect("packages response");

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    let items = payload["data"]["items"].as_array().expect("seeded items");
    assert_eq!(9, items.len());
    assert_eq!("5.00", payload["data"]["items"][0]["priceAmount"]);
    assert_eq!("CNY", payload["data"]["items"][0]["currencyCode"]);
    assert_eq!(50, payload["data"]["items"][0]["grantAmount"]);
    assert_eq!("10.00", payload["data"]["items"][1]["priceAmount"]);
    assert_eq!("CNY", payload["data"]["items"][1]["currencyCode"]);
    assert_eq!(100, payload["data"]["items"][1]["grantAmount"]);
    assert_eq!("1000.00", payload["data"]["items"][8]["priceAmount"]);
    assert_eq!("CNY", payload["data"]["items"][8]["currencyCode"]);
    assert_eq!(10000, payload["data"]["items"][8]["grantAmount"]);
    assert!(items.iter().all(|item| item["currencyCode"] == "CNY"));
}

#[tokio::test]
async fn app_recharge_router_creates_current_tenant_order_from_default_seed_package() {
    let pool = commerce_migrated_sqlite_pool().await;
    upsert_sqlite_commerce_experience_seed(&pool)
        .await
        .expect("commerce experience seed");
    sqlx::query(
        r#"
        UPDATE commerce_payment_method
        SET status = 'active'
        WHERE tenant_id = '100001'
          AND organization_id = '0'
          AND method_key = 'alipay'
        "#,
    )
    .execute(&pool)
    .await
    .expect("activate seeded payment method");
    let inspect_pool = pool.clone();
    let app = app_recharge_checkout_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_write_request(
            r#"{"clientRequestNo":"seed-recharge-1","amount":"5.00","currencyCode":"CNY","packageId":"seed-recharge-package-cny-500","source":"console-recharge"}"#,
        ))
        .await
        .expect("recharge response");

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(true, payload["data"]["success"]);
    assert_eq!("5.00", payload["data"]["amount"]);
    assert_eq!("CNY", payload["data"]["currencyCode"]);
    assert_eq!(50, payload["data"]["points"]);
    assert_eq!("wechat_pay", payload["data"]["providerCode"]);
    assert_eq!("wechat_pay", payload["data"]["paymentMethod"]);
    assert_eq!("wechat_native", payload["data"]["paymentProduct"]);
    assert_eq!("pending", payload["data"]["status"]);
    assert_eq!("scan_qr", payload["data"]["nextAction"]);
    assert_eq!(
        payload["data"]["cashierUrl"],
        payload["data"]["qrCodePayload"]
    );
    assert_eq!(
        serde_json::Value::Null,
        payload["data"]["requestPaymentPayload"]
    );

    let order_no = payload["data"]["orderNo"].as_str().expect("orderNo");
    let row: (String, String, String) = sqlx::query_as(
        r#"
        SELECT tenant_id, organization_id, owner_user_id
        FROM commerce_order
        WHERE order_no = ?
        "#,
    )
    .bind(order_no)
    .fetch_one(&inspect_pool)
    .await
    .expect("created order row");
    assert_eq!("100001", row.0);
    assert_eq!("300001", row.1);
    assert_eq!("30", row.2);
}

#[tokio::test]
async fn app_recharge_router_serves_recharge_settings_for_current_tenant() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_recharge_data(&pool).await;
    let app = app_recharge_checkout_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_read_request(
            "GET",
            "/app/v3/api/recharges/settings",
        ))
        .await
        .expect("settings response");

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!("CNY", payload["data"]["baseCurrencyCode"]);
    assert_eq!("10", payload["data"]["basePointsPerCny"]);
    assert_eq!("1", payload["data"]["currencyToCnyRates"]["CNY"]);
    assert_eq!("7", payload["data"]["currencyToCnyRates"]["USD"]);
    assert_eq!(
        50,
        payload["data"]["previewExamples"]["CNY"]["5"]["grantAmount"]
    );
    assert_eq!(
        350,
        payload["data"]["previewExamples"]["USD"]["5"]["grantAmount"]
    );
}

#[tokio::test]
async fn app_recharge_router_creates_recharge_order_and_checkout_reads_status() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_recharge_data(&pool).await;
    let app = app_recharge_checkout_router_with_sqlite_pool(pool);

    let response = app
        .clone()
        .oneshot(subject_write_request(
            r#"{"amount":"10.00","currencyCode":"CNY","packageId":"pack-owner-10"}"#,
        ))
        .await
        .expect("recharge response");

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(true, payload["data"]["success"]);
    assert_eq!("10.00", payload["data"]["amount"]);
    assert_eq!("CNY", payload["data"]["currencyCode"]);
    assert_eq!(125, payload["data"]["points"]);
    assert_eq!("wechat_pay", payload["data"]["providerCode"]);
    assert_eq!("wechat_pay", payload["data"]["paymentMethod"]);
    assert_eq!("wechat_native", payload["data"]["paymentProduct"]);
    assert_eq!("pending", payload["data"]["status"]);
    assert_eq!("scan_qr", payload["data"]["nextAction"]);
    let order_no = payload["data"]["orderNo"]
        .as_str()
        .expect("orderNo")
        .to_owned();
    let expected_cashier_url = format!(
        "https://im.sdkwork.com/cashier?scene=recharge&orderId={order_no}&outTradeNo={}",
        payload["data"]["outTradeNo"].as_str().unwrap_or_default()
    );
    assert_eq!(expected_cashier_url, payload["data"]["cashierUrl"]);
    assert_eq!(expected_cashier_url, payload["data"]["qrCodePayload"]);
    assert_eq!(
        serde_json::Value::Null,
        payload["data"]["requestPaymentPayload"]
    );

    let response = app
        .oneshot(subject_read_request(
            "GET",
            format!("/app/v3/api/recharges/orders/{order_no}"),
        ))
        .await
        .expect("checkout response");

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(order_no, payload["data"]["orderNo"]);
    assert_eq!("10.00", payload["data"]["amount"]);
    assert_eq!("CNY", payload["data"]["currencyCode"]);
    assert_eq!(125, payload["data"]["points"]);
    assert_eq!("wechat_pay", payload["data"]["providerCode"]);
    assert_eq!("wechat_pay", payload["data"]["paymentMethod"]);
    assert_eq!("wechat_native", payload["data"]["paymentProduct"]);
    assert_eq!("pending", payload["data"]["status"]);
    assert_eq!("pending", payload["data"]["paymentStatus"]);
    assert_eq!("scan_qr", payload["data"]["nextAction"]);
    assert_eq!(
        format!(
            "https://im.sdkwork.com/cashier?scene=recharge&orderId={order_no}&outTradeNo={}",
            payload["data"]["outTradeNo"].as_str().expect("outTradeNo")
        ),
        payload["data"]["qrCodePayload"]
    );
    assert_eq!(
        payload["data"]["cashierUrl"],
        payload["data"]["qrCodePayload"]
    );
    assert_eq!(
        serde_json::Value::Null,
        payload["data"]["requestPaymentPayload"]
    );
}

#[tokio::test]
async fn app_recharge_router_reuses_pending_unpaid_order_for_same_user_package_amount_and_currency()
{
    let pool = commerce_migrated_sqlite_pool().await;
    seed_recharge_data(&pool).await;
    let inspect_pool = pool.clone();
    let app = app_recharge_checkout_router_with_sqlite_pool(pool);

    let first_response = app
        .clone()
        .oneshot(subject_write_request_with_idempotency(
            "recharge-idem-reuse-1",
            "recharge-request-reuse-1",
            r#"{"clientRequestNo":"console-recharge-1","amount":"10.00","currencyCode":"CNY","packageId":"pack-owner-10","source":"console-recharge"}"#,
        ))
        .await
        .expect("first recharge response");

    assert_eq!(StatusCode::OK, first_response.status());
    let first_payload = response_json(first_response).await;
    assert_eq!("2000", first_payload["code"]);
    let first_order_no = first_payload["data"]["orderNo"]
        .as_str()
        .expect("first order no")
        .to_owned();
    let first_out_trade_no = first_payload["data"]["outTradeNo"]
        .as_str()
        .expect("first out trade no")
        .to_owned();

    let second_response = app
        .oneshot(subject_write_request_with_idempotency(
            "recharge-idem-reuse-2",
            "recharge-request-reuse-2",
            r#"{"clientRequestNo":"console-recharge-2","amount":"10.00","currencyCode":"CNY","packageId":"pack-owner-10","source":"console-recharge"}"#,
        ))
        .await
        .expect("second recharge response");

    assert_eq!(StatusCode::OK, second_response.status());
    let second_payload = response_json(second_response).await;
    assert_eq!("2000", second_payload["code"]);
    assert_eq!(first_order_no, second_payload["data"]["orderNo"]);
    assert_eq!(first_out_trade_no, second_payload["data"]["outTradeNo"]);
    assert_eq!(
        first_payload["data"]["cashierUrl"],
        second_payload["data"]["cashierUrl"]
    );
    assert_eq!(
        first_payload["data"]["qrCodePayload"],
        second_payload["data"]["qrCodePayload"]
    );
    assert_eq!(
        first_payload["data"]["points"],
        second_payload["data"]["points"]
    );

    let order_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM commerce_order
        WHERE tenant_id = '100001'
          AND owner_user_id = '30'
          AND subject = 'points_recharge'
        "#,
    )
    .fetch_one(&inspect_pool)
    .await
    .expect("recharge order count");
    assert_eq!(1, order_count);

    let payment_intent_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM commerce_payment_intent
        WHERE tenant_id = '100001'
          AND owner_user_id = '30'
        "#,
    )
    .fetch_one(&inspect_pool)
    .await
    .expect("recharge payment intent count");
    assert_eq!(1, payment_intent_count);
    let payment_intent_fact: (String, String) = sqlx::query_as(
        r#"
        SELECT payment_method, provider_code
        FROM commerce_payment_intent
        WHERE tenant_id = '100001'
          AND owner_user_id = '30'
        "#,
    )
    .fetch_one(&inspect_pool)
    .await
    .expect("recharge payment intent method and provider");
    assert_eq!("wechat_pay", payment_intent_fact.0);
    assert_eq!("wechat_pay", payment_intent_fact.1);

    let payment_attempt_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM commerce_payment_attempt
        WHERE tenant_id = '100001'
          AND owner_user_id = '30'
        "#,
    )
    .fetch_one(&inspect_pool)
    .await
    .expect("recharge payment attempt count");
    assert_eq!(1, payment_attempt_count);
    let payment_attempt_fact: (String, String) = sqlx::query_as(
        r#"
        SELECT payment_method, provider_code
        FROM commerce_payment_attempt
        WHERE tenant_id = '100001'
          AND owner_user_id = '30'
        "#,
    )
    .fetch_one(&inspect_pool)
    .await
    .expect("recharge payment attempt method and provider");
    assert_eq!("wechat_pay", payment_attempt_fact.0);
    assert_eq!("wechat_pay", payment_attempt_fact.1);
}

#[tokio::test]
async fn app_recharge_router_fails_closed_when_default_payment_method_is_unavailable() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_recharge_data(&pool).await;
    sqlx::query(
        r#"
        UPDATE commerce_payment_method
        SET status = 'inactive'
        WHERE tenant_id = '100001'
          AND organization_id = '300001'
          AND method_key = 'wechat_pay'
        "#,
    )
    .execute(&pool)
    .await
    .expect("deactivate default method");
    sqlx::query(
        r#"
        INSERT INTO commerce_payment_method
            (id, tenant_id, organization_id, method_key, display_name, provider_code, status, sort_order, request_no, idempotency_key, created_at, updated_at)
        VALUES
            ('method-alipay', '100001', '300001', 'alipay', 'Alipay', 'alipay', 'active', 2, 'seed-method-alipay', 'seed-method-alipay', '2026-05-20 00:00:00', '2026-05-20 00:00:00')
        "#,
    )
    .execute(&pool)
    .await
    .expect("insert selected method");
    let app = app_recharge_checkout_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_write_request_with_idempotency(
            "recharge-idem-method-unavailable",
            "recharge-request-method-unavailable",
            r#"{"clientRequestNo":"console-recharge-method-unavailable","amount":"10.00","currencyCode":"CNY","packageId":"pack-owner-10","source":"console-recharge"}"#,
        ))
        .await
        .expect("method unavailable response");

    assert_eq!(StatusCode::CONFLICT, response.status());
    let payload = response_json(response).await;
    assert_eq!("4090", payload["code"]);
    assert_eq!(
        "recharge payment method is unavailable",
        payload["msg"].as_str().unwrap_or_default()
    );
}

#[tokio::test]
async fn app_recharge_router_creates_new_order_after_previous_package_order_is_paid() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_recharge_data(&pool).await;
    let inspect_pool = pool.clone();
    let app = app_recharge_checkout_router_with_sqlite_pool(pool);

    let first_response = app
        .clone()
        .oneshot(subject_write_request_with_idempotency(
            "recharge-idem-paid-1",
            "recharge-request-paid-1",
            r#"{"clientRequestNo":"console-recharge-paid-1","amount":"10.00","currencyCode":"CNY","packageId":"pack-owner-10","source":"console-recharge"}"#,
        ))
        .await
        .expect("first paid-scene response");

    assert_eq!(StatusCode::OK, first_response.status());
    let first_payload = response_json(first_response).await;
    let first_order_no = first_payload["data"]["orderNo"]
        .as_str()
        .expect("first paid-scene order no")
        .to_owned();

    sqlx::query(
        r#"
        UPDATE commerce_order
        SET status = 'paid',
            paid_at = '2026-05-20 10:05:00',
            updated_at = '2026-05-20 10:05:00'
        WHERE tenant_id = '100001'
          AND owner_user_id = '30'
          AND order_no = ?1
        "#,
    )
    .bind(&first_order_no)
    .execute(&inspect_pool)
    .await
    .expect("mark order paid");

    sqlx::query(
        r#"
        UPDATE commerce_payment_intent
        SET status = 'succeeded',
            updated_at = '2026-05-20 10:05:00'
        WHERE tenant_id = '100001'
          AND owner_user_id = '30'
          AND order_id = (
              SELECT id
              FROM commerce_order
              WHERE tenant_id = '100001'
                AND owner_user_id = '30'
                AND order_no = ?1
          )
        "#,
    )
    .bind(&first_order_no)
    .execute(&inspect_pool)
    .await
    .expect("mark payment intent succeeded");

    sqlx::query(
        r#"
        UPDATE commerce_payment_attempt
        SET status = 'succeeded',
            paid_at = '2026-05-20 10:05:00',
            updated_at = '2026-05-20 10:05:00'
        WHERE tenant_id = '100001'
          AND owner_user_id = '30'
          AND order_id = (
              SELECT id
              FROM commerce_order
              WHERE tenant_id = '100001'
                AND owner_user_id = '30'
                AND order_no = ?1
          )
        "#,
    )
    .bind(&first_order_no)
    .execute(&inspect_pool)
    .await
    .expect("mark payment attempt succeeded");

    let second_response = app
        .oneshot(subject_write_request_with_idempotency(
            "recharge-idem-paid-2",
            "recharge-request-paid-2",
            r#"{"clientRequestNo":"console-recharge-paid-2","amount":"10.00","currencyCode":"CNY","packageId":"pack-owner-10","source":"console-recharge"}"#,
        ))
        .await
        .expect("second paid-scene response");

    assert_eq!(StatusCode::OK, second_response.status());
    let second_payload = response_json(second_response).await;
    let second_order_no = second_payload["data"]["orderNo"]
        .as_str()
        .expect("second paid-scene order no");
    assert_ne!(first_order_no, second_order_no);

    let package_order_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM commerce_order
        WHERE tenant_id = '100001'
          AND owner_user_id = '30'
          AND subject = 'points_recharge'
          AND currency_code = 'CNY'
        "#,
    )
    .fetch_one(&inspect_pool)
    .await
    .expect("paid-scene recharge order count");
    assert_eq!(2, package_order_count);
}

#[tokio::test]
async fn app_recharge_router_does_not_use_frontend_request_id_as_business_request_no() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_recharge_data(&pool).await;
    let inspect_pool = pool.clone();
    let app = app_recharge_checkout_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_request_with_request_id_header_only(
            "recharge-idem-header-only",
            r#"{"amount":"10.00","currencyCode":"CNY","packageId":"pack-owner-10"}"#,
        ))
        .await
        .expect("recharge response");

    assert_eq!(response.status(), StatusCode::OK);
    let order_no: String = sqlx::query_scalar(
        r#"
        SELECT order_no
        FROM commerce_order
        WHERE tenant_id = '100001'
          AND owner_user_id = '30'
          AND idempotency_key = 'recharge-idem-header-only'
        "#,
    )
    .fetch_one(&inspect_pool)
    .await
    .expect("order number");
    let frontend_request_id_order_no =
        expected_recharge_order_no("123e4567-e89b-12d3-a456-426614174000");
    let server_owned_order_no = expected_recharge_order_no(
        "points-recharge-30-10.00-wechat_pay-recharge-idem-header-only",
    );
    assert_ne!(frontend_request_id_order_no, order_no);
    assert_eq!(server_owned_order_no, order_no);
}

#[tokio::test]
async fn app_recharge_router_accepts_standard_top_level_payload() {
    let pool = commerce_migrated_sqlite_pool().await;
    seed_recharge_data(&pool).await;
    let app = app_recharge_checkout_router_with_sqlite_pool(pool);

    let response = app
        .oneshot(subject_write_request(
            r#"{"clientRequestNo":"console-recharge-1","amount":"10.00","currencyCode":"CNY","packageId":"pack-owner-10","source":"console-recharge"}"#,
        ))
        .await
        .expect("recharge response");

    assert_eq!(StatusCode::OK, response.status());
    let payload = response_json(response).await;
    assert_eq!("2000", payload["code"]);
    assert_eq!(true, payload["data"]["success"]);
    assert_eq!("10.00", payload["data"]["amount"]);
    assert_eq!("CNY", payload["data"]["currencyCode"]);
    assert_eq!(125, payload["data"]["points"]);
    assert_eq!("wechat_pay", payload["data"]["paymentMethod"]);
}

#[tokio::test]
async fn app_recharge_router_allows_public_recharge_reads_but_still_requires_auth_for_order_create()
{
    let pool = commerce_migrated_sqlite_pool().await;
    seed_recharge_data(&pool).await;
    let app = app_recharge_checkout_router_with_sqlite_pool(pool);

    let packages_response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/recharges/packages")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("packages response");
    assert_eq!(StatusCode::OK, packages_response.status());

    let settings_response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/app/v3/api/recharges/settings")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("settings response");
    assert_eq!(StatusCode::OK, settings_response.status());

    let create_response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/recharges/orders")
                .header("content-type", "application/json")
                .header("Idempotency-Key", "public-recharge-idem")
                .body(Body::from(
                    r#"{"amount":"10.00","currencyCode":"CNY","packageId":"pack-owner-10"}"#,
                ))
                .expect("request"),
        )
        .await
        .expect("response");

    assert_eq!(StatusCode::UNAUTHORIZED, create_response.status());
}

fn expected_recharge_order_no(request_no: &str) -> String {
    let seed =
        format!("100001|300001|30|10.00|wechat_pay|{request_no}|recharge-idem-header-only");
    format!("RC{}", stable_hex_token(&seed))
}

fn stable_hex_token(value: &str) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in value.bytes() {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}
