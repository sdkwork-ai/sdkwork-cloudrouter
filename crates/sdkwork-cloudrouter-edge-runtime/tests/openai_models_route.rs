use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, DecimalValue, GatewayApiKey, ModelUpstreamRoute, ModelVendor, ModelVendorDefinition,
    UpstreamAccountGroup, UpstreamAccountRoute,
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
async fn gateway_mounts_openai_models_route_with_hmac_api_key_authentication() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_cloudrouter_edge_runtime::router_with_product_catalog_and_api_key_hasher(
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
}

#[tokio::test]
async fn gateway_retrieves_openai_model_by_id() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_cloudrouter_edge_runtime::router_with_product_catalog_and_api_key_hasher(
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
    assert_eq!("openai", payload["owned_by"]);
}

/// The gateway fixture serves `GET /v1/vendors` through the mounted vendors
/// router: the key-scoped vendor/model listing used by desktop imports.
fn catalog_with_callable_account(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = catalog_with_hashed_api_key(key_hash);
    catalog.add_vendor(ModelVendorDefinition::new(
        "anthropic",
        ModelVendor::Anthropic,
        "Anthropic",
    ));
    catalog.add_model(AiModel::new(
        "claude-3-5-sonnet",
        "Claude 3.5 Sonnet",
        "anthropic",
        vec!["chat", "tools"],
    ));
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openai-supplier", 1001)
            .with_account_group_binding(10, 100, 100)
            .with_upstream_endpoint(Some("https://api.openai.com"), Some("cred:openai")),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("anthropic-supplier", 2001)
            .with_account_group_binding(10, 100, 100)
            .with_upstream_endpoint(Some("https://api.anthropic.com"), Some("cred:anthropic")),
    );
    catalog.add_model_upstream_route(ModelUpstreamRoute::new(
        "gpt-4o-mini",
        "openai-supplier",
        1001,
        "gpt-4o-mini",
    ));
    catalog.add_model_upstream_route(ModelUpstreamRoute::new(
        "claude-3-5-sonnet",
        "anthropic-supplier",
        2001,
        "claude-3-5-sonnet",
    ));
    catalog
}

#[tokio::test]
async fn gateway_lists_key_scoped_vendors_with_models() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_cloudrouter_edge_runtime::router_with_product_catalog_and_api_key_hasher(
        Arc::new(catalog_with_callable_account(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/vendors")
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
    let vendors = payload["data"].as_array().unwrap();
    assert_eq!(2, vendors.len());
    let openai = vendors
        .iter()
        .find(|vendor| vendor["code"] == "openai")
        .expect("openai vendor present");
    assert_eq!("OpenAI", openai["name"]);
    assert_eq!("gpt-4o-mini", openai["models"][0]["id"]);
    assert_eq!("GPT-4o mini", openai["models"][0]["displayName"]);
    let anthropic = vendors
        .iter()
        .find(|vendor| vendor["code"] == "anthropic")
        .expect("anthropic vendor present");
    assert_eq!("claude-3-5-sonnet", anthropic["models"][0]["id"]);
}

#[tokio::test]
async fn gateway_vendors_route_rejects_missing_credentials() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_cloudrouter_edge_runtime::router_with_product_catalog_and_api_key_hasher(
        Arc::new(catalog_with_callable_account(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/vendors")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
}
