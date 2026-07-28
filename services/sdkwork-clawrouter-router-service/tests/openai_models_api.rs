use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::domain::{
    AiModel, UpstreamAccountGroup, DecimalValue, GatewayApiKey, ModelVendor, ModelVendorDefinition,
};
use sdkwork_clawrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use tower::ServiceExt;

fn catalog_with_hashed_api_key(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(AiModel::new(
        "gpt-4o-mini",
        "GPT-4o mini",
        "openai",
        vec!["chat", "tools"],
    ));
    catalog.add_model(AiModel::new(
        "text-embedding-3-small",
        "Text embedding 3 small",
        "openai",
        vec!["embedding"],
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash));
    catalog
}

#[tokio::test]
async fn openai_models_route_authenticates_bearer_key_and_returns_openai_list() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_models_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/models")
                .header("authorization", "Bearer sk-live-secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("list", payload["object"]);
    assert_eq!("gpt-4o-mini", payload["data"][0]["id"]);
    assert_eq!("model", payload["data"][0]["object"]);
    assert_eq!(0, payload["data"][0]["created"]);
    assert_eq!("openai", payload["data"][0]["owned_by"]);
    assert_eq!("text-embedding-3-small", payload["data"][1]["id"]);
}

#[tokio::test]
async fn openai_models_route_retrieves_model_by_id() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_models_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/models/gpt-4o-mini")
                .header("authorization", "Bearer sk-live-secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("gpt-4o-mini", payload["id"]);
    assert_eq!("model", payload["object"]);
    assert_eq!(0, payload["created"]);
    assert_eq!("openai", payload["owned_by"]);
}

#[tokio::test]
async fn openai_models_route_rejects_missing_api_key() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let router = sdkwork_clawrouter_router_service::api::openai_models_router(
        Arc::new(catalog_with_hashed_api_key("irrelevant".to_owned())),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/models")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        "invalid_api_key",
        payload["error"]["code"].as_str().unwrap()
    );
    assert_eq!("invalid_request_error", payload["error"]["type"]);
}

#[tokio::test]
async fn openai_models_route_rejects_invalid_api_key_without_leaking_secret() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let router = sdkwork_clawrouter_router_service::api::openai_models_router(
        Arc::new(catalog_with_hashed_api_key(
            "not-the-request-hash".to_owned(),
        )),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/models")
                .header("authorization", "Bearer sk-live-secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();

    assert!(body.contains("invalid_api_key"));
    assert!(!body.contains("sk-live-secret"));
}
