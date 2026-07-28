use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, UpstreamAccountGroup,
};
use sdkwork_clawrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use tower::ServiceExt;

fn catalog() -> InMemoryPricingCatalog {
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
    catalog.add_provider_route(ModelUpstreamRoute::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        "openrouter",
        3001,
        "gpt-4o-mini",
    ));
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.200000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog.add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test"));
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::usd("0.150000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini"),
    );
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.110000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .for_upstream_account("openrouter", 3001),
    );
    catalog
}

fn catalog_with_hashed_api_key(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = catalog();
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash));
    catalog
}

#[tokio::test]
async fn admin_model_catalog_route_returns_plus_result_with_catalog_price_view() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_catalog_router(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/models?api_key_id=100&billing_meter=llm_input_token&vendor_code=openai")
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

    assert_eq!(0, payload["code"].as_i64().unwrap());

    assert_eq!("gpt-4o-mini", payload["data"]["items"][0]["model"]);
    assert_eq!("openai", payload["data"]["items"][0]["vendorCode"]);
    assert_eq!(
        "0.198000",
        payload["data"]["items"][0]["priceAvailability"]["customerUnitPrice"]
    );
    assert_eq!(
        "0.088000",
        payload["data"]["items"][0]["priceAvailability"]["grossMarginPerUnit"]
    );
    assert_eq!(
        "available",
        payload["data"]["items"][0]["priceAvailability"]["status"]
    );
}

#[tokio::test]
async fn admin_model_catalog_route_excludes_deprecated_hidden_and_unroutable_models() {
    let mut catalog = catalog();
    catalog.add_model(
        AiModel::new("gpt-old", "GPT Old", "openai", vec!["chat"]).with_public_metadata(
            sdkwork_clawrouter_router_service::domain::AiModelPublicMetadata {
                release_stage: Some(3),
                shelf_state: Some(1),
                routing_state: Some(1),
                replacement_model: Some("openai/gpt-4o-mini".to_owned()),
                ..Default::default()
            },
        ),
    );
    catalog.add_model(
        AiModel::new("gpt-hidden", "GPT Hidden", "openai", vec!["chat"]).with_public_metadata(
            sdkwork_clawrouter_router_service::domain::AiModelPublicMetadata {
                release_stage: Some(1),
                shelf_state: Some(2),
                routing_state: Some(1),
                ..Default::default()
            },
        ),
    );
    catalog.add_model(
        AiModel::new(
            "gpt-catalog-only",
            "GPT Catalog Only",
            "openai",
            vec!["chat"],
        )
        .with_public_metadata(
            sdkwork_clawrouter_router_service::domain::AiModelPublicMetadata {
                release_stage: Some(1),
                shelf_state: Some(1),
                routing_state: Some(0),
                ..Default::default()
            },
        ),
    );

    let router =
        sdkwork_clawrouter_router_service::api::admin_model_catalog_router(Arc::new(catalog));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/models?api_key_id=100&billing_meter=llm_input_token&vendor_code=openai")
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
    let models = payload["data"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["model"].as_str().unwrap())
        .collect::<Vec<_>>();

    assert!(models.contains(&"gpt-4o-mini"));
    assert!(!models.contains(&"gpt-old"));
    assert!(!models.contains(&"gpt-hidden"));
    assert!(!models.contains(&"gpt-catalog-only"));
}

#[tokio::test]
async fn admin_model_catalog_route_accepts_api_key_context_from_header() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_catalog_router(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/models?billing_meter=llm_input_token&vendor_code=openai")
                .header("x-sdkwork-api-key-id", "100")
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

    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!(
        "available",
        payload["data"]["items"][0]["priceAvailability"]["status"]
    );
    assert_eq!(
        "0.198000",
        payload["data"]["items"][0]["priceAvailability"]["customerUnitPrice"]
    );
}

#[tokio::test]
async fn admin_model_catalog_route_accepts_empty_body_and_marks_customer_price_unavailable() {
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_catalog_router(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/models")
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

    assert_eq!(0, payload["code"].as_i64().unwrap());
    assert_eq!("gpt-4o-mini", payload["data"]["items"][0]["model"]);
    assert_eq!(
        "unavailable",
        payload["data"]["items"][0]["priceAvailability"]["status"]
    );
    assert_eq!(
        "api key context is required for customer price",
        payload["data"]["items"][0]["priceAvailability"]["reason"]
    );
}

#[tokio::test]
async fn admin_model_catalog_route_authenticates_bearer_credential_with_configured_hasher() {
    let hasher = HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_catalog_router_with_api_key_hasher(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            Arc::new(hasher),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/models")
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

    assert_eq!(
        "available",
        payload["data"]["items"][0]["priceAvailability"]["status"]
    );
    assert_eq!(
        "0.198000",
        payload["data"]["items"][0]["priceAvailability"]["customerUnitPrice"]
    );
}

#[tokio::test]
async fn admin_model_catalog_route_rejects_invalid_bearer_credential_when_hasher_is_configured() {
    let hasher = HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_catalog_router_with_api_key_hasher(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            Arc::new(hasher),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/models")
                .header("authorization", "Bearer sk-wrong-secret")
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
    let payload: serde_json::Value = serde_json::from_str(&body).unwrap();

    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert_eq!("api key credential is invalid", payload["detail"]);
    assert!(!body.contains("sk-wrong-secret"));
}

#[tokio::test]
async fn admin_model_catalog_route_rejects_spoofed_api_key_context_when_hasher_is_configured() {
    let hasher = HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router =
        sdkwork_clawrouter_router_service::api::admin_model_catalog_router_with_api_key_hasher(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            Arc::new(hasher),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/ai/models")
                .header("x-sdkwork-api-key-id", "101")
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
    let payload: serde_json::Value = serde_json::from_str(&body).unwrap();

    assert_eq!(40001, payload["code"].as_i64().unwrap());
    assert_eq!("api key credential is required", payload["detail"]);
}
