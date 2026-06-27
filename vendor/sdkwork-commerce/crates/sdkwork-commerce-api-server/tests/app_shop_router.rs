use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::test_http::{
    commerce_migrated_sqlite_pool, commerce_standard_test_context, commerce_test_json_request,
};
use sdkwork_commerce_router_composition::{
    commerce_app_router_with_sqlite_pool, commerce_backend_router_with_sqlite_pool,
};
use tower::ServiceExt;

fn request_with_context(method: &str, uri: &str, body: Body) -> Request<Body> {
    commerce_test_json_request(method, uri, &commerce_standard_test_context(), body)
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

#[tokio::test]
async fn app_shop_router_upserts_current_shop_category_bindings() {
    let pool = commerce_migrated_sqlite_pool().await;
    let backend_app = commerce_backend_router_with_sqlite_pool(pool.clone());
    let app = commerce_app_router_with_sqlite_pool(pool.clone());

    let create_response = backend_app
        .clone()
        .oneshot(request_with_context(
            "POST",
            "/backend/v3/api/shops",
            Body::from(
                r#"{"shopNo":"APP-SHOP-001","shopName":"App Current Shop","shopType":"official","businessModel":"self_operated"}"#,
            ),
        ))
        .await
        .expect("create shop response");
    assert_eq!(StatusCode::OK, create_response.status());
    let create_payload = response_json(create_response).await;
    assert_eq!("0", create_payload["code"]);
    let shop_id = create_payload["data"]["id"]
        .as_str()
        .expect("shop id")
        .to_owned();

    let current_response = app
        .clone()
        .oneshot(request_with_context(
            "GET",
            "/app/v3/api/shops/current",
            Body::empty(),
        ))
        .await
        .expect("retrieve current shop response");
    assert_eq!(StatusCode::OK, current_response.status());
    let current_payload = response_json(current_response).await;
    assert_eq!("0", current_payload["code"]);
    assert_eq!(shop_id, current_payload["data"]["id"]);

    let upsert_binding_response = app
        .clone()
        .oneshot(request_with_context(
            "PUT",
            "/app/v3/api/shops/current/category_bindings",
            Body::from(
                r#"{"shopCategoryCode":"app-cat-1","categoryStatus":"active","reviewStatus":"approved"}"#,
            ),
        ))
        .await
        .expect("upsert current category binding response");
    assert_eq!(StatusCode::OK, upsert_binding_response.status());
    let upsert_binding_payload = response_json(upsert_binding_response).await;
    assert_eq!("0", upsert_binding_payload["code"]);
    assert_eq!(shop_id, upsert_binding_payload["data"]["shop_id"]);
    assert_eq!(
        "app-cat-1",
        upsert_binding_payload["data"]["shop_category_code"]
    );

    let list_binding_response = app
        .clone()
        .oneshot(request_with_context(
            "GET",
            "/app/v3/api/shops/current/category_bindings",
            Body::empty(),
        ))
        .await
        .expect("list current category bindings response");
    assert_eq!(StatusCode::OK, list_binding_response.status());
    let list_binding_payload = response_json(list_binding_response).await;
    assert_eq!("0", list_binding_payload["code"]);
    let items = list_binding_payload["data"]["items"]
        .as_array()
        .expect("category binding items");
    assert_eq!(1, items.len());
    assert_eq!("app-cat-1", items[0]["shopCategoryCode"]);

    let upsert_application_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            "/app/v3/api/shops/current/applications",
            Body::from(
                r#"{"applicationNo":"APP-001","applicationType":"onboarding","reviewStatus":"submitted","submittedBy":"30"}"#,
            ),
        ))
        .await
        .expect("upsert current application response");
    assert_eq!(StatusCode::OK, upsert_application_response.status());
    let upsert_application_payload = response_json(upsert_application_response).await;
    assert_eq!("0", upsert_application_payload["code"]);
    assert_eq!(shop_id, upsert_application_payload["data"]["shop_id"]);
    assert_eq!(
        "APP-001",
        upsert_application_payload["data"]["application_no"]
    );

    sqlx::query(
        r#"
        INSERT INTO commerce_shop_metric_snapshot
            (id, tenant_id, organization_id, shop_id, snapshot_date, gross_sales_amount,
             currency_code, paid_order_count, refund_order_count, fulfillment_pending_count,
             settlement_pending_amount, created_at)
        VALUES
            ('metric-1', '100001', '300001', ?, '2026-06-17', '100.00', 'CNY', 1, 0, 0,
             '25.00', '2026-06-17 00:00:00')
        "#,
    )
    .bind(&shop_id)
    .execute(&pool)
    .await
    .expect("seed metric snapshot");

    let list_settlements_response = app
        .oneshot(request_with_context(
            "GET",
            "/app/v3/api/shops/current/settlements",
            Body::empty(),
        ))
        .await
        .expect("list current settlements response");
    assert_eq!(StatusCode::OK, list_settlements_response.status());
    let list_settlements_payload = response_json(list_settlements_response).await;
    assert_eq!("0", list_settlements_payload["code"]);
    let settlement_items = list_settlements_payload["data"]["items"]
        .as_array()
        .expect("settlement items");
    assert_eq!(1, settlement_items.len());
    assert_eq!("25.00", settlement_items[0]["settlementPendingAmount"]);
}

#[tokio::test]
async fn app_shop_router_prefers_active_shop_over_closed_shop_as_current() {
    let pool = commerce_migrated_sqlite_pool().await;
    let backend_app = commerce_backend_router_with_sqlite_pool(pool.clone());
    let app = commerce_app_router_with_sqlite_pool(pool);

    let create_closed_shop_response = backend_app
        .clone()
        .oneshot(request_with_context(
            "POST",
            "/backend/v3/api/shops",
            Body::from(
                r#"{"shopNo":"SHOP-CLOSED","shopName":"Closed Shop","shopType":"official","businessModel":"self_operated"}"#,
            ),
        ))
        .await
        .expect("create closed shop response");
    assert_eq!(StatusCode::OK, create_closed_shop_response.status());
    let closed_shop_id = response_json(create_closed_shop_response).await["data"]["id"]
        .as_str()
        .expect("closed shop id")
        .to_owned();

    let close_shop_response = backend_app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{closed_shop_id}/close"),
            Body::empty(),
        ))
        .await
        .expect("close shop response");
    assert_eq!(StatusCode::OK, close_shop_response.status());

    let create_active_shop_response = backend_app
        .clone()
        .oneshot(request_with_context(
            "POST",
            "/backend/v3/api/shops",
            Body::from(
                r#"{"shopNo":"SHOP-ACTIVE","shopName":"Active Shop","shopType":"official","businessModel":"self_operated"}"#,
            ),
        ))
        .await
        .expect("create active shop response");
    assert_eq!(StatusCode::OK, create_active_shop_response.status());
    let active_shop_id = response_json(create_active_shop_response).await["data"]["id"]
        .as_str()
        .expect("active shop id")
        .to_owned();

    let approve_active_shop_response = backend_app
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{active_shop_id}/approve"),
            Body::empty(),
        ))
        .await
        .expect("approve active shop response");
    assert_eq!(StatusCode::OK, approve_active_shop_response.status());

    let current_response = app
        .oneshot(request_with_context(
            "GET",
            "/app/v3/api/shops/current",
            Body::empty(),
        ))
        .await
        .expect("retrieve current shop response");
    assert_eq!(StatusCode::OK, current_response.status());
    let current_payload = response_json(current_response).await;
    assert_eq!("0", current_payload["code"]);
    assert_eq!(active_shop_id, current_payload["data"]["id"]);
    assert_eq!("Active Shop", current_payload["data"]["shopName"]);
}
