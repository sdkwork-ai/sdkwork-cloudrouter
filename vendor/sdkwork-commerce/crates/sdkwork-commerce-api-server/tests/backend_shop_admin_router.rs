use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use sdkwork_commerce_api_server::test_http::{
    commerce_migrated_sqlite_pool, commerce_standard_test_context, commerce_test_json_request,
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
async fn backend_shop_admin_router_supports_shop_lifecycle_and_subresources() {
    let pool = commerce_migrated_sqlite_pool().await;
    let app = commerce_backend_router_with_sqlite_pool(pool);

    let create_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            "/backend/v3/api/shops",
            Body::from(
                r#"{"shopNo":"SHOP-001","shopName":"Backend Shop","shopType":"official","businessModel":"self_operated"}"#,
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

    let readiness_response = app
        .clone()
        .oneshot(request_with_context(
            "GET",
            &format!("/backend/v3/api/shops/{shop_id}/readiness"),
            Body::empty(),
        ))
        .await
        .expect("retrieve readiness response");
    assert_eq!(StatusCode::OK, readiness_response.status());
    let readiness_payload = response_json(readiness_response).await;
    assert_eq!("0", readiness_payload["code"]);
    assert_eq!(
        "not_ready",
        readiness_payload["data"][0]["readiness_status"]
    );

    let list_response = app
        .clone()
        .oneshot(request_with_context(
            "GET",
            "/backend/v3/api/shops?page=1&pageSize=20",
            Body::empty(),
        ))
        .await
        .expect("list shops response");
    assert_eq!(StatusCode::OK, list_response.status());
    let list_payload = response_json(list_response).await;
    assert_eq!("0", list_payload["code"]);
    assert!(list_payload["data"]["items"].is_array());

    let retrieve_response = app
        .clone()
        .oneshot(request_with_context(
            "GET",
            &format!("/backend/v3/api/shops/{shop_id}"),
            Body::empty(),
        ))
        .await
        .expect("retrieve shop response");
    assert_eq!(StatusCode::OK, retrieve_response.status());
    let retrieve_payload = response_json(retrieve_response).await;
    assert_eq!("0", retrieve_payload["code"]);
    assert_eq!(shop_id, retrieve_payload["data"]["id"]);

    let upsert_binding_response = app
        .clone()
        .oneshot(request_with_context(
            "PUT",
            &format!("/backend/v3/api/shops/{shop_id}/category_bindings"),
            Body::from(
                r#"{"shopCategoryCode":"cat-1","categoryStatus":"active","reviewStatus":"approved"}"#,
            ),
        ))
        .await
        .expect("upsert category binding response");
    assert_eq!(StatusCode::OK, upsert_binding_response.status());
    let upsert_binding_payload = response_json(upsert_binding_response).await;
    assert_eq!("0", upsert_binding_payload["code"]);
    assert_eq!(shop_id, upsert_binding_payload["data"]["shop_id"]);
    assert_eq!(
        "cat-1",
        upsert_binding_payload["data"]["shop_category_code"]
    );

    let upsert_brand_auth_response = app
        .clone()
        .oneshot(request_with_context(
            "PUT",
            &format!("/backend/v3/api/shops/{shop_id}/brand_authorizations"),
            Body::from(
                r#"{"brandCode":"brand-1","brandName":"Brand One","authorizationType":"trademark","authorizationStatus":"active"}"#,
            ),
        ))
        .await
        .expect("upsert brand authorization response");
    assert_eq!(StatusCode::OK, upsert_brand_auth_response.status());
    let upsert_brand_auth_payload = response_json(upsert_brand_auth_response).await;
    assert_eq!("0", upsert_brand_auth_payload["code"]);
    assert_eq!("brand-1", upsert_brand_auth_payload["data"]["brand_code"]);

    let upsert_qualification_response = app
        .clone()
        .oneshot(request_with_context(
            "PUT",
            &format!("/backend/v3/api/shops/{shop_id}/qualifications"),
            Body::from(
                r#"{"qualificationType":"business_license","qualificationStatus":"active","subjectType":"merchant","subjectId":"300001"}"#,
            ),
        ))
        .await
        .expect("upsert qualification response");
    assert_eq!(StatusCode::OK, upsert_qualification_response.status());
    let upsert_qualification_payload = response_json(upsert_qualification_response).await;
    assert_eq!("0", upsert_qualification_payload["code"]);
    assert_eq!(
        "business_license",
        upsert_qualification_payload["data"]["qualification_type"]
    );

    let upsert_customer_service_response = app
        .clone()
        .oneshot(request_with_context(
            "PUT",
            &format!("/backend/v3/api/shops/{shop_id}/customer_services"),
            Body::from(
                r#"{"serviceChannel":"online_chat","serviceStatus":"active","contactRef":"cs-1"}"#,
            ),
        ))
        .await
        .expect("upsert customer service response");
    assert_eq!(StatusCode::OK, upsert_customer_service_response.status());
    let upsert_customer_service_payload = response_json(upsert_customer_service_response).await;
    assert_eq!("0", upsert_customer_service_payload["code"]);
    assert_eq!(
        "online_chat",
        upsert_customer_service_payload["data"]["service_channel"]
    );

    let upsert_return_address_response = app
        .clone()
        .oneshot(request_with_context(
            "PUT",
            &format!("/backend/v3/api/shops/{shop_id}/return_addresses"),
            Body::from(
                r#"{"addressUsage":"return","addressKey":"addr-1","receiverName":"Receiver","countryCode":"CN","addressLine1":"Road 1","addressStatus":"active"}"#,
            ),
        ))
        .await
        .expect("upsert return address response");
    assert_eq!(StatusCode::OK, upsert_return_address_response.status());
    let upsert_return_address_payload = response_json(upsert_return_address_response).await;
    assert_eq!("0", upsert_return_address_payload["code"]);
    assert_eq!(
        "addr-1",
        upsert_return_address_payload["data"]["address_key"]
    );

    let upsert_shipping_template_response = app
        .clone()
        .oneshot(request_with_context(
            "PUT",
            &format!("/backend/v3/api/shops/{shop_id}/shipping_templates"),
            Body::from(
                r#"{"templateCode":"tpl-1","templateName":"Template","templateStatus":"active","pricingMode":"fixed","deliveryMethod":"standard","baseQuantity":1,"baseFeeAmount":"8.80","currencyCode":"CNY"}"#,
            ),
        ))
        .await
        .expect("upsert shipping template response");
    assert_eq!(StatusCode::OK, upsert_shipping_template_response.status());
    let upsert_shipping_template_payload = response_json(upsert_shipping_template_response).await;
    assert_eq!("0", upsert_shipping_template_payload["code"]);
    assert_eq!(
        "tpl-1",
        upsert_shipping_template_payload["data"]["template_code"]
    );

    let create_channel_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{shop_id}/channels"),
            Body::from(r#"{"channelCode":"web","storefrontStatus":"active"}"#),
        ))
        .await
        .expect("create channel response");
    assert_eq!(StatusCode::OK, create_channel_response.status());
    let create_channel_payload = response_json(create_channel_response).await;
    assert_eq!("0", create_channel_payload["code"]);
    assert_eq!("web", create_channel_payload["data"]["channel_code"]);

    let create_service_area_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{shop_id}/service_areas"),
            Body::from(
                r#"{"areaType":"country","countryCode":"CN","areaKey":"cn-all","serviceStatus":"active"}"#,
            ),
        ))
        .await
        .expect("create service area response");
    assert_eq!(StatusCode::OK, create_service_area_response.status());
    let create_service_area_payload = response_json(create_service_area_response).await;
    assert_eq!("0", create_service_area_payload["code"]);
    assert_eq!("cn-all", create_service_area_payload["data"]["area_key"]);

    let create_policy_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{shop_id}/policies"),
            Body::from(r#"{"policyType":"terms","policyStatus":"published","policyVersion":1}"#),
        ))
        .await
        .expect("create policy response");
    assert_eq!(StatusCode::OK, create_policy_response.status());
    let create_policy_payload = response_json(create_policy_response).await;
    assert_eq!("0", create_policy_payload["code"]);
    assert_eq!("terms", create_policy_payload["data"]["policy_type"]);

    let update_fulfillment_response = app
        .clone()
        .oneshot(request_with_context(
            "PATCH",
            &format!("/backend/v3/api/shops/{shop_id}/fulfillment_profile"),
            Body::from(r#"{"fulfillmentMode":"merchant"}"#),
        ))
        .await
        .expect("update fulfillment profile response");
    assert_eq!(StatusCode::OK, update_fulfillment_response.status());
    let update_fulfillment_payload = response_json(update_fulfillment_response).await;
    assert_eq!("0", update_fulfillment_payload["code"]);
    assert_eq!(
        "merchant",
        update_fulfillment_payload["data"]["fulfillment_mode"]
    );

    let create_risk_signal_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{shop_id}/risk_signals"),
            Body::from(r#"{"signalType":"manual","riskLevel":"medium","signalNo":"RS-001"}"#),
        ))
        .await
        .expect("create risk signal response");
    assert_eq!(StatusCode::OK, create_risk_signal_response.status());
    let create_risk_signal_payload = response_json(create_risk_signal_response).await;
    assert_eq!("0", create_risk_signal_payload["code"]);
    let risk_signal_id = create_risk_signal_payload["data"]["id"]
        .as_str()
        .expect("risk signal id")
        .to_owned();

    let resolve_risk_signal_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{shop_id}/risk_signals/{risk_signal_id}/resolve"),
            Body::empty(),
        ))
        .await
        .expect("resolve risk signal response");
    assert_eq!(StatusCode::OK, resolve_risk_signal_response.status());
    let resolve_risk_signal_payload = response_json(resolve_risk_signal_response).await;
    assert_eq!("0", resolve_risk_signal_payload["code"]);
    assert_eq!(
        "resolved",
        resolve_risk_signal_payload["data"]["signal_status"]
    );

    let submit_review_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{shop_id}/submit_review"),
            Body::empty(),
        ))
        .await
        .expect("submit review response");
    assert_eq!(StatusCode::OK, submit_review_response.status());
    let submit_review_payload = response_json(submit_review_response).await;
    assert_eq!("0", submit_review_payload["code"]);
    assert_eq!(
        "pending_review",
        submit_review_payload["data"]["operation_status"]
    );
    assert_eq!("Backend Shop", submit_review_payload["data"]["shop_name"]);

    let approve_shop_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{shop_id}/approve"),
            Body::empty(),
        ))
        .await
        .expect("approve shop response");
    assert_eq!(StatusCode::OK, approve_shop_response.status());
    let approve_shop_payload = response_json(approve_shop_response).await;
    assert_eq!("0", approve_shop_payload["code"]);
    assert_eq!("active", approve_shop_payload["data"]["operation_status"]);
    assert_eq!("Backend Shop", approve_shop_payload["data"]["shop_name"]);

    let readiness_after_approve_response = app
        .clone()
        .oneshot(request_with_context(
            "GET",
            &format!("/backend/v3/api/shops/{shop_id}/readiness"),
            Body::empty(),
        ))
        .await
        .expect("retrieve readiness after approve response");
    assert_eq!(StatusCode::OK, readiness_after_approve_response.status());
    let readiness_after_approve_payload = response_json(readiness_after_approve_response).await;
    assert_eq!("0", readiness_after_approve_payload["code"]);
    assert_eq!(
        "ready",
        readiness_after_approve_payload["data"][0]["readiness_status"]
    );

    let list_status_events_response = app
        .clone()
        .oneshot(request_with_context(
            "GET",
            &format!("/backend/v3/api/shops/{shop_id}/status_events"),
            Body::empty(),
        ))
        .await
        .expect("list status events response");
    assert_eq!(StatusCode::OK, list_status_events_response.status());
    let list_status_events_payload = response_json(list_status_events_response).await;
    assert_eq!("0", list_status_events_payload["code"]);
    assert!(list_status_events_payload["data"].as_array().unwrap().len() >= 2);

    let update_business_hours_response = app
        .clone()
        .oneshot(request_with_context(
            "PATCH",
            &format!("/backend/v3/api/shops/{shop_id}/business_hours"),
            Body::from(
                r#"{"scheduleType":"default","timezone":"Asia/Shanghai","status":"active"}"#,
            ),
        ))
        .await
        .expect("update business hours response");
    assert_eq!(StatusCode::OK, update_business_hours_response.status());
    let first_business_hour_id = response_json(update_business_hours_response).await["data"]["id"]
        .as_str()
        .expect("business hour id")
        .to_owned();

    let update_business_hours_again_response = app
        .clone()
        .oneshot(request_with_context(
            "PATCH",
            &format!("/backend/v3/api/shops/{shop_id}/business_hours"),
            Body::from(
                r#"{"scheduleType":"default","timezone":"Asia/Shanghai","status":"inactive"}"#,
            ),
        ))
        .await
        .expect("update business hours again response");
    assert_eq!(
        StatusCode::OK,
        update_business_hours_again_response.status()
    );
    let update_business_hours_again_payload =
        response_json(update_business_hours_again_response).await;
    assert_eq!(
        first_business_hour_id,
        update_business_hours_again_payload["data"]["id"]
    );
    assert_eq!(
        "inactive",
        update_business_hours_again_payload["data"]["status"]
    );

    let approve_settlement_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{shop_id}/settlement_profile/approve"),
            Body::empty(),
        ))
        .await
        .expect("approve settlement profile response");
    assert_eq!(StatusCode::OK, approve_settlement_response.status());
    let approve_settlement_payload = response_json(approve_settlement_response).await;
    assert_eq!("0", approve_settlement_payload["code"]);
    assert_eq!(
        "approved",
        approve_settlement_payload["data"]["settlement_status"]
    );

    let deposit_review_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{shop_id}/deposit_account/review"),
            Body::from(
                r#"{"depositStatus":"approved","requiredAmount":"1000.00","paidAmount":"1000.00"}"#,
            ),
        ))
        .await
        .expect("review deposit account response");
    assert_eq!(StatusCode::OK, deposit_review_response.status());
    let deposit_review_payload = response_json(deposit_review_response).await;
    assert_eq!("0", deposit_review_payload["code"]);
    assert_eq!("approved", deposit_review_payload["data"]["deposit_status"]);

    let suspend_shop_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{shop_id}/suspend"),
            Body::empty(),
        ))
        .await
        .expect("suspend shop response");
    assert_eq!(StatusCode::OK, suspend_shop_response.status());
    let suspend_shop_payload = response_json(suspend_shop_response).await;
    assert_eq!("0", suspend_shop_payload["code"]);
    assert_eq!(
        "suspended",
        suspend_shop_payload["data"]["operation_status"]
    );

    let close_shop_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{shop_id}/close"),
            Body::empty(),
        ))
        .await
        .expect("close shop response");
    assert_eq!(StatusCode::OK, close_shop_response.status());
    let close_shop_payload = response_json(close_shop_response).await;
    assert_eq!("0", close_shop_payload["code"]);
    assert_eq!("closed", close_shop_payload["data"]["operation_status"]);

    let create_reject_shop_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            "/backend/v3/api/shops",
            Body::from(
                r#"{"shopNo":"SHOP-REJECT","shopName":"Reject Shop","shopType":"official","businessModel":"self_operated"}"#,
            ),
        ))
        .await
        .expect("create reject shop response");
    assert_eq!(StatusCode::OK, create_reject_shop_response.status());
    let reject_shop_id = response_json(create_reject_shop_response).await["data"]["id"]
        .as_str()
        .expect("reject shop id")
        .to_owned();

    let submit_reject_shop_response = app
        .clone()
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{reject_shop_id}/submit_review"),
            Body::empty(),
        ))
        .await
        .expect("submit reject shop review response");
    assert_eq!(StatusCode::OK, submit_reject_shop_response.status());

    let reject_shop_response = app
        .oneshot(request_with_context(
            "POST",
            &format!("/backend/v3/api/shops/{reject_shop_id}/reject"),
            Body::empty(),
        ))
        .await
        .expect("reject shop response");
    assert_eq!(StatusCode::OK, reject_shop_response.status());
    let reject_shop_payload = response_json(reject_shop_response).await;
    assert_eq!("0", reject_shop_payload["code"]);
    assert_eq!("rejected", reject_shop_payload["data"]["operation_status"]);
    assert_eq!("rejected", reject_shop_payload["data"]["review_status"]);
}
