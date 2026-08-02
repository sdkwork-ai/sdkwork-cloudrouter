pub mod common;

use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use common::InternalTrustedSubjectHeaders;
use sdkwork_clawrouter_router_service::domain::{
    DecimalValue, GatewayApiKey, UpstreamAccountGroup,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use tower::ServiceExt;

fn catalog() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_upstream_account_group(UpstreamAccountGroup::new_scoped(
        10,
        100001,
        7,
        "tenant-one",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new_scoped(
        20,
        200002,
        8,
        "tenant-two",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog
        .add_api_key(GatewayApiKey::new(100, 10, "sk-one", "hash-one").with_owner(100001, 7, 31));
    catalog
        .add_api_key(GatewayApiKey::new(200, 20, "sk-two", "hash-two").with_owner(200002, 8, 41));
    catalog
}

fn explain_request(api_key_id: i64, account_group_id: Option<i64>) -> Request<Body> {
    let payload = serde_json::json!({
        "apiKeyId": api_key_id.to_string(),
        "resourceCode": "api.openai.files",
        "apiCode": "openai.files",
        "capability": "network",
        "billingMeter": "api_request"
    });
    let account_group_id = account_group_id.unwrap_or(10);
    Request::builder()
        .method("POST")
        .uri(format!(
            "/backend/v3/api/ai/upstream_account_groups/{account_group_id}/route_explain"
        ))
        .header("content-type", "application/json")
        .internal_trusted_subject(100001, 7, 31)
        .body(Body::from(payload.to_string()))
        .unwrap()
}

async fn payload(response: axum::response::Response) -> serde_json::Value {
    let bytes = axum::body::to_bytes(response.into_body(), 64 * 1024)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

#[tokio::test]
async fn route_explain_requires_a_typed_admin_subject() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_route_explain_router(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/backend/v3/api/ai/upstream_account_groups/10/route_explain")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"apiKeyId":"100","resourceCode":"api.openai.files"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
}

#[tokio::test]
async fn route_explain_does_not_reveal_cross_tenant_objects() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_route_explain_router(Arc::new(catalog()));

    for request in [
        explain_request(200, None),
        explain_request(999, None),
        explain_request(100, Some(20)),
    ] {
        let response = router.clone().oneshot(request).await.unwrap();
        assert_eq!(StatusCode::NOT_FOUND, response.status());
        let body = payload(response).await;
        assert_eq!("route explain target was not found", body["detail"]);
        assert!(!body.to_string().contains("200002"));
        assert!(!body.to_string().contains("tenant-two"));
    }
}

#[tokio::test]
async fn route_explain_response_omits_credential_metadata() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_route_explain_router(Arc::new(catalog()));
    let response = router.oneshot(explain_request(100, None)).await.unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = payload(response).await;
    assert_eq!("10", body["data"]["item"]["id"]);
    assert_eq!(
        body["data"]["item"]["accountGroupId"],
        body["data"]["item"]["id"]
    );
    assert_eq!("runtime_selector", body["data"]["item"]["source"]);
    assert!(body["data"]["item"]["ready"].as_bool().is_some());
    let serialized = body.to_string();
    assert!(!serialized.contains("credentialId"));
    assert!(!serialized.contains("credentialRotation"));
}
