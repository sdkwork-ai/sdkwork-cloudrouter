use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, DecimalValue, GatewayApiKey, ModelVendor, ModelVendorDefinition, UpstreamAccountGroup,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
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
    // Relay catalog keys carry the vendor prefix (`<vendor>/<modelId>`); the
    // SDK percent-encodes that slash inside the path segment.
    catalog.add_model(AiModel::new(
        "deepseek-flash",
        "DeepSeek V4.1 Flash",
        "deepseek",
        vec!["chat"],
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
    let router = sdkwork_cloudrouter_router_service::api::openai_models_router(
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
    let router = sdkwork_cloudrouter_router_service::api::openai_models_router(
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
async fn openai_models_route_lists_model_groups_as_an_openai_list() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_cloudrouter_router_service::api::openai_models_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/models/gpt-4o-mini/groups")
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
    assert!(
        payload["data"].is_array(),
        "the groups endpoint must answer the documented {{ object: \"list\", data: [...] }} envelope"
    );
}

#[tokio::test]
async fn openai_models_route_accepts_a_percent_encoded_vendor_model_key() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_cloudrouter_router_service::api::openai_models_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                // Generated SDKs encode the slash inside `{model}`; the route
                // must still match one segment and resolve `deepseek/deepseek-flash`.
                .uri("/v1/models/deepseek%2Fdeepseek-flash/groups")
                .header("authorization", "Bearer sk-live-secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(payload["object"], "list");
    assert!(payload["data"].is_array());
}

#[tokio::test]
async fn openai_models_route_reports_unknown_models_for_the_groups_endpoint() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_cloudrouter_router_service::api::openai_models_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/models/no-such-model/groups")
                .header("authorization", "Bearer sk-live-secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("model_not_found", payload["error"]["code"]);
}

#[tokio::test]
async fn openai_models_route_rejects_missing_api_key() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let router = sdkwork_cloudrouter_router_service::api::openai_models_router(
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
    let router = sdkwork_cloudrouter_router_service::api::openai_models_router(
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
