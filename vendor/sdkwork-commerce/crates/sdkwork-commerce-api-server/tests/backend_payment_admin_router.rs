use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::test_http::{
    commerce_backend_write_request, commerce_migrated_sqlite_pool, commerce_standard_test_context,
    commerce_test_json_request,
};
use sdkwork_commerce_router_composition::commerce_backend_router_with_sqlite_pool;
use tower::ServiceExt;

fn request_with_context(method: &str, uri: &str, body: Body) -> Request<Body> {
    commerce_test_json_request(method, uri, &commerce_standard_test_context(), body)
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let body = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&body).expect("json response")
}

#[tokio::test]
async fn backend_payment_admin_router_supports_method_and_provider_lifecycle() {
    let pool = commerce_migrated_sqlite_pool().await;
    let app = commerce_backend_router_with_sqlite_pool(pool);
    let context = commerce_standard_test_context();

    let create_method_body = r#"{"methodKey":"wechat_pay","displayName":"WeChat Pay","providerCode":"wechat_pay","status":"active"}"#;
    let create_method_response = app
        .clone()
        .oneshot(commerce_backend_write_request(
            "POST",
            "/backend/v3/api/payments/methods",
            "payment-method-upsert",
            &context,
            "payment-method-create-1",
            create_method_body,
        ))
        .await
        .expect("create payment method response");
    assert_eq!(StatusCode::OK, create_method_response.status());
    let create_method_payload = response_json(create_method_response).await;
    assert_eq!("0", create_method_payload["code"]);
    assert_eq!("wechat_pay", create_method_payload["data"]["methodKey"]);
    let method_id = create_method_payload["data"]["id"]
        .as_str()
        .expect("method id")
        .to_owned();

    let list_methods_response = app
        .clone()
        .oneshot(request_with_context(
            "GET",
            "/backend/v3/api/payments/methods",
            Body::empty(),
        ))
        .await
        .expect("list payment methods response");
    assert_eq!(StatusCode::OK, list_methods_response.status());
    let list_methods_payload = response_json(list_methods_response).await;
    assert_eq!("0", list_methods_payload["code"]);
    assert!(!list_methods_payload["data"].as_array().unwrap().is_empty());

    let create_provider_account_body = r#"{"accountNo":"acct-1","providerCode":"wechat_pay","merchantId":"mch-1","environment":"sandbox","countryCode":"CN","settlementCurrency":"CNY","secretRef":"secret-1","status":"active"}"#;
    let create_provider_account_response = app
        .clone()
        .oneshot(commerce_backend_write_request(
            "POST",
            "/backend/v3/api/payments/provider_accounts",
            "payment-provider-account-upsert",
            &context,
            "payment-provider-create-1",
            create_provider_account_body,
        ))
        .await
        .expect("create provider account response");
    assert_eq!(StatusCode::OK, create_provider_account_response.status());
    let create_provider_account_payload = response_json(create_provider_account_response).await;
    assert_eq!("0", create_provider_account_payload["code"]);
    assert_eq!(
        "acct-1",
        create_provider_account_payload["data"]["accountNo"]
    );
    let provider_account_id = create_provider_account_payload["data"]["id"]
        .as_str()
        .expect("provider account id")
        .to_owned();

    let create_channel_body = format!(
        r#"{{"channelNo":"wechat_jsapi","providerAccountId":"{provider_account_id}","methodId":"{method_id}","status":"active"}}"#
    );
    let create_channel_response = app
        .clone()
        .oneshot(commerce_backend_write_request(
            "POST",
            "/backend/v3/api/payments/channels",
            "payment-channel-upsert",
            &context,
            "payment-channel-create-1",
            &create_channel_body,
        ))
        .await
        .expect("create payment channel response");
    assert_eq!(StatusCode::OK, create_channel_response.status());
    let create_channel_payload = response_json(create_channel_response).await;
    assert_eq!("0", create_channel_payload["code"]);
    assert_eq!("wechat_jsapi", create_channel_payload["data"]["channelNo"]);
    let channel_id = create_channel_payload["data"]["id"]
        .as_str()
        .expect("channel id")
        .to_owned();

    let create_route_rule_body = format!(
        r#"{{"ruleNo":"default","channelId":"{channel_id}","priority":1,"status":"active"}}"#
    );
    let create_route_rule_response = app
        .clone()
        .oneshot(commerce_backend_write_request(
            "POST",
            "/backend/v3/api/payments/route_rules",
            "payment-route-rule-upsert",
            &context,
            "payment-route-rule-create-1",
            &create_route_rule_body,
        ))
        .await
        .expect("create route rule response");
    assert_eq!(StatusCode::OK, create_route_rule_response.status());
    let create_route_rule_payload = response_json(create_route_rule_response).await;
    assert_eq!("0", create_route_rule_payload["code"]);
    assert_eq!("default", create_route_rule_payload["data"]["ruleNo"]);

    let create_reconciliation_body =
        r#"{"providerCode":"wechat_pay","accountId":"acct-1","statementDate":"2026-06-01"}"#;
    let create_reconciliation_response = app
        .oneshot(commerce_backend_write_request(
            "POST",
            "/backend/v3/api/payments/reconciliation_runs",
            "payment-reconciliation-run-create",
            &context,
            "payment-reconciliation-create-1",
            create_reconciliation_body,
        ))
        .await
        .expect("create reconciliation run response");
    assert_eq!(StatusCode::OK, create_reconciliation_response.status());
    let create_reconciliation_payload = response_json(create_reconciliation_response).await;
    assert_eq!("0", create_reconciliation_payload["code"]);
    assert_eq!("queued", create_reconciliation_payload["data"]["status"]);
    assert_eq!(
        "acct-1",
        create_reconciliation_payload["data"]["providerAccountId"]
    );
}

#[tokio::test]
async fn backend_payment_admin_router_rejects_missing_request_hash() {
    let pool = commerce_migrated_sqlite_pool().await;
    let app = commerce_backend_router_with_sqlite_pool(pool);
    let context = commerce_standard_test_context();
    let body = r#"{"methodKey":"wechat_pay","displayName":"WeChat Pay","providerCode":"wechat_pay","status":"active"}"#;

    let response = app
        .oneshot(
            sdkwork_commerce_api_server::test_http::commerce_test_command_request(
                "POST",
                "/backend/v3/api/payments/methods",
                &context,
                "payment-method-create-1",
                "payment-method-create-1-request",
                None,
                Body::from(body),
            ),
        )
        .await
        .expect("response");

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
}
