// Cloud Router `GET /v1/vendors` extension: authentication and key-scoped
// vendor/model listing used by desktop clients (e.g. Birdcoder imports) to
// build channel offerings from the gateway key itself.
use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::api::list_group_scoped_vendors;
use sdkwork_cloudrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, DecimalValue, GatewayApiKey, ModelUpstreamRoute, ModelVendor, ModelVendorDefinition,
    UpstreamAccountGroup, UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use tower::ServiceExt;

/// Two keys on two account groups: key A reaches the openai account, key B
/// reaches the anthropic account. Both accounts are callable (base URL +
/// secret ref) and healthy.
fn catalog_with_two_group_scoped_keys(
    key_hash_a: String,
    key_hash_b: String,
) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_vendor(ModelVendorDefinition::new(
        "anthropic",
        ModelVendor::Anthropic,
        "Anthropic",
    ));
    catalog.add_model(AiModel::new(
        "gpt-4o-mini",
        "GPT-4o mini",
        "openai",
        vec!["chat", "tools"],
    ));
    catalog.add_model(AiModel::new(
        "claude-3-5-sonnet",
        "Claude 3.5 Sonnet",
        "anthropic",
        vec!["chat", "tools"],
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new(
        10,
        "openai-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new(
        20,
        "anthropic-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    let openai_account = UpstreamAccountRoute::new("openai-supplier", 1001)
        .with_account_group_binding(10, 100, 100)
        .with_upstream_endpoint(Some("https://api.openai.com"), Some("cred:openai"));
    let anthropic_account = UpstreamAccountRoute::new("anthropic-supplier", 2001)
        .with_account_group_binding(20, 100, 100)
        .with_upstream_endpoint(Some("https://api.anthropic.com"), Some("cred:anthropic"));
    catalog.add_upstream_account_route(openai_account);
    catalog.add_upstream_account_route(anthropic_account);
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
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-key-a", &key_hash_a));
    catalog.add_api_key(GatewayApiKey::new(102, 20, "sk-key-b", &key_hash_b));
    catalog
}

fn vendors_router(catalog: InMemoryPricingCatalog) -> axum::Router {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    sdkwork_cloudrouter_router_service::api::openai_vendors_router(Arc::new(catalog), hasher)
}

async fn get_vendors(router: &axum::Router, secret: &str) -> (StatusCode, serde_json::Value) {
    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/vendors")
                .header("authorization", format!("Bearer {secret}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    (status, payload)
}

#[tokio::test]
async fn lists_only_the_vendors_the_keys_account_group_can_reach() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let catalog = catalog_with_two_group_scoped_keys(
        hasher.hash_secret("sk-secret-a").unwrap(),
        hasher.hash_secret("sk-secret-b").unwrap(),
    );
    let router = vendors_router(catalog);

    // Key A (group 10) can only reach the openai account.
    let (status, payload) = get_vendors(&router, "sk-secret-a").await;
    assert_eq!(StatusCode::OK, status);
    assert_eq!("list", payload["object"]);
    assert_eq!(1, payload["data"].as_array().unwrap().len());
    assert_eq!("openai", payload["data"][0]["code"]);
    assert_eq!("OpenAI", payload["data"][0]["name"]);
    let models = payload["data"][0]["models"].as_array().unwrap();
    assert_eq!(1, models.len());
    assert_eq!("gpt-4o-mini", models[0]["id"]);
    assert_eq!("GPT-4o mini", models[0]["displayName"]);

    // Key B (group 20) can only reach the anthropic account.
    let (status, payload) = get_vendors(&router, "sk-secret-b").await;
    assert_eq!(StatusCode::OK, status);
    assert_eq!(1, payload["data"].as_array().unwrap().len());
    assert_eq!("anthropic", payload["data"][0]["code"]);
    assert_eq!("Anthropic", payload["data"][0]["name"]);
    assert_eq!("claude-3-5-sonnet", payload["data"][0]["models"][0]["id"]);
}

#[tokio::test]
async fn rejects_missing_and_invalid_api_keys_without_leaking_secrets() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let catalog = catalog_with_two_group_scoped_keys(
        hasher.hash_secret("sk-secret-a").unwrap(),
        hasher.hash_secret("sk-secret-b").unwrap(),
    );
    let router = vendors_router(catalog);

    let response = router
        .clone()
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

    let (status, payload) = get_vendors(&router, "sk-wrong-secret").await;
    assert_eq!(StatusCode::UNAUTHORIZED, status);
    let serialized = serde_json::to_string(&payload).unwrap();
    assert!(
        !serialized.contains("sk-secret-a"),
        "secret leaked in {serialized}"
    );
    assert!(
        !serialized.contains("sk-secret-b"),
        "secret leaked in {serialized}"
    );
}

#[test]
fn group_scoped_vendors_require_callable_accounts() {
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
        "openai-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    // Bound to the group but not callable: no base URL / no credential.
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openai-supplier", 1001).with_account_group_binding(10, 100, 100),
    );
    catalog.add_model_upstream_route(ModelUpstreamRoute::new(
        "gpt-4o-mini",
        "openai-supplier",
        1001,
        "gpt-4o-mini",
    ));

    let vendors = list_group_scoped_vendors(&catalog, 10);
    assert!(vendors.is_empty(), "unusable accounts must not be listed");

    // Making the account callable lists the vendor with its model.
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openai-supplier", 1001)
            .with_account_group_binding(10, 100, 100)
            .with_upstream_endpoint(Some("https://api.openai.com"), Some("cred:openai")),
    );
    let vendors = list_group_scoped_vendors(&catalog, 10);
    assert_eq!(1, vendors.len());
    assert_eq!("openai", vendors[0].code);
    assert_eq!("OpenAI", vendors[0].name);
    assert_eq!(1, vendors[0].models.len());
    assert_eq!("gpt-4o-mini", vendors[0].models[0].id);

    // A different group sees nothing.
    assert!(list_group_scoped_vendors(&catalog, 99).is_empty());
}

#[test]
fn vendor_name_falls_back_to_the_code_when_unknown() {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_model(AiModel::new(
        "custom-model",
        "Custom Model",
        "custom_vendor",
        vec!["chat"],
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new(
        10,
        "group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("supplier", 1001)
            .with_account_group_binding(10, 100, 100)
            .with_upstream_endpoint(Some("https://api.example.com"), Some("cred:example")),
    );
    catalog.add_model_upstream_route(ModelUpstreamRoute::new(
        "custom-model",
        "supplier",
        1001,
        "custom-model",
    ));

    let vendors = list_group_scoped_vendors(&catalog, 10);
    assert_eq!(1, vendors.len());
    assert_eq!("custom_vendor", vendors[0].code);
    assert_eq!(
        "custom_vendor", vendors[0].name,
        "name falls back to the code"
    );
}
