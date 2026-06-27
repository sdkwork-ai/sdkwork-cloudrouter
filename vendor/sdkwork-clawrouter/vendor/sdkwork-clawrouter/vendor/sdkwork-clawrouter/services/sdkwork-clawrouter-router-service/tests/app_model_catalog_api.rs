use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, ChannelGroup, DecimalValue, GatewayApiKey, ModelPrice,
    ModelProviderRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    ProviderChannelRoute,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use tower::ServiceExt;

fn catalog() -> InMemoryPricingCatalog {
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
    catalog.add_vendor(ModelVendorDefinition::new(
        "kuaishou",
        ModelVendor::Kuaishou,
        "Kuaishou",
    ));
    catalog.add_model(
        AiModel::new(
            "gpt-4o-mini",
            "GPT-4o mini",
            "openai",
            vec!["chat", "tools"],
        )
        .with_public_metadata(
            sdkwork_clawrouter_router_service::domain::AiModelPublicMetadata {
                description: Some("Fast public OpenAI model.".to_owned()),
                modalities: vec!["text".to_owned(), "image".to_owned()],
                input_modalities: vec!["text".to_owned(), "image".to_owned()],
                output_modalities: vec!["text".to_owned()],
                api_format: Some("openai_responses".to_owned()),
                capability_intro: Some("Low latency chat model with tools.".to_owned()),
                limitations: vec!["Validate critical facts.".to_owned()],
                supported_languages: vec!["English".to_owned(), "Chinese".to_owned()],
                use_cases: vec!["Customer support".to_owned(), "Data extraction".to_owned()],
                training_data_cutoff: Some("2025".to_owned()),
                context_tokens: Some(128000),
                max_output_tokens: Some(16384),
                supports_streaming: true,
                supports_tools: true,
                supports_json_schema: false,
                release_stage: Some(1),
                shelf_state: Some(1),
                routing_state: Some(1),
                replacement_model: None,
            },
        ),
    );
    catalog.add_model(AiModel::new(
        "claude-3-haiku",
        "Claude 3 Haiku",
        "anthropic",
        vec!["chat"],
    ));
    catalog.add_model(
        AiModel::new("kling-v2", "Kling v2", "kuaishou", vec!["video"])
            .with_catalog_key("kuaishou/kling-v2")
            .with_public_metadata(
                sdkwork_clawrouter_router_service::domain::AiModelPublicMetadata {
                    description: Some("Video generation model.".to_owned()),
                    modalities: vec!["video".to_owned()],
                    input_modalities: vec!["text".to_owned(), "image".to_owned()],
                    output_modalities: vec!["video".to_owned()],
                    api_format: Some("kling_video".to_owned()),
                    capability_intro: None,
                    limitations: vec![],
                    supported_languages: vec!["Chinese".to_owned()],
                    use_cases: vec!["Video generation".to_owned()],
                    training_data_cutoff: None,
                    context_tokens: None,
                    max_output_tokens: None,
                    supports_streaming: false,
                    supports_tools: false,
                    supports_json_schema: false,
                    release_stage: Some(1),
                    shelf_state: Some(1),
                    routing_state: Some(1),
                    replacement_model: None,
                },
            ),
    );
    catalog.add_provider_route(ModelProviderRoute::new_for_catalog_key(
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
    catalog.add_channel_group(ChannelGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog.add_channel_group(
        ChannelGroup::new(
            11,
            "premium-lab",
            "standard",
            DecimalValue::parse("1.000000").unwrap(),
            DecimalValue::parse("1.100000").unwrap(),
        )
        .with_name("Premium Lab"),
    );
    catalog.add_api_key(GatewayApiKey::new(
        100,
        10,
        "sk-test",
        "hash:sk-live-secret",
    ));
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
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::cny("1.200000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .with_region_code("cn"),
    );
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmOutputToken,
            Money::usd("0.600000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini"),
    );
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmCacheReadToken,
            Money::usd("0.075000").unwrap(),
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
        .for_provider("openrouter", 3001),
    );
    let mut channel_scoped_official_price = ModelPrice::new(
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmReasoningToken,
        Money::usd("99.000000").unwrap(),
    )
    .with_catalog_key("openai/gpt-4o-mini");
    channel_scoped_official_price.channel_id = Some(3001);
    catalog.add_price(channel_scoped_official_price);
    catalog.add_price(
        ModelPrice::new(
            "kling-v2",
            PriceSide::OfficialReference,
            BillingMeter::VideoResult,
            Money::cny("1.200000").unwrap(),
        )
        .with_catalog_key("kuaishou/kling-v2"),
    );
    catalog
}

#[tokio::test]
async fn app_model_catalog_route_returns_standard_items_for_playground_grouping() {
    let mut catalog = catalog();
    catalog.add_model(
        AiModel::new("image-gen-pro", "Image Gen Pro", "openai", vec!["image"])
            .with_catalog_key("openai/image-gen-pro")
            .with_public_metadata(
                sdkwork_clawrouter_router_service::domain::AiModelPublicMetadata {
                    description: Some("High quality image generation model.".to_owned()),
                    modalities: vec!["image".to_owned()],
                    input_modalities: vec!["text".to_owned()],
                    output_modalities: vec!["image".to_owned()],
                    api_format: Some("openai_images".to_owned()),
                    supports_streaming: false,
                    release_stage: Some(1),
                    shelf_state: Some(1),
                    routing_state: Some(1),
                    ..Default::default()
                },
            ),
    );

    let router =
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(catalog));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/models")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    let payload: serde_json::Value = serde_json::from_str(&body_text).unwrap();

    assert_eq!("2000", payload["code"]);
    let items = payload["data"]["items"].as_array().unwrap();
    let gpt = items
        .iter()
        .find(|item| item["catalogKey"] == "openai/gpt-4o-mini")
        .unwrap();
    let image = items
        .iter()
        .find(|item| item["catalogKey"] == "openai/image-gen-pro")
        .unwrap();
    let video = items
        .iter()
        .find(|item| item["catalogKey"] == "kuaishou/kling-v2")
        .unwrap();

    assert_eq!("GPT-4o mini", gpt["displayName"]);
    assert_eq!(serde_json::json!(["text", "image"]), gpt["modalities"]);
    assert_eq!(serde_json::json!(["text"]), gpt["outputModalities"]);
    assert_eq!("Image Gen Pro", image["displayName"]);
    assert_eq!(serde_json::json!(["image"]), image["outputModalities"]);
    assert_eq!("Kling v2", video["displayName"]);
    assert_eq!(serde_json::json!(["video"]), video["outputModalities"]);
    assert!(payload["data"].get("models").is_none());
    assert!(body_text.contains("\"items\""));
    assert!(!body_text.contains("\"agents\""));
    assert!(!body_text.contains("lowestUpstreamCostUnitPrice"));
    assert!(!body_text.contains("customerUnitPrice"));
    assert!(!body_text.contains("hash:sk-live-secret"));
}

#[tokio::test]
async fn app_model_catalog_route_excludes_deprecated_hidden_and_unroutable_models() {
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
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(catalog));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/models")
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
    let catalog_keys = payload["data"]["items"]
        .as_array()
        .unwrap()
        .iter()
        .map(|item| item["catalogKey"].as_str().unwrap())
        .collect::<Vec<_>>();

    assert!(catalog_keys.contains(&"openai/gpt-4o-mini"));
    assert!(!catalog_keys.contains(&"openai/gpt-old"));
    assert!(!catalog_keys.contains(&"openai/gpt-hidden"));
    assert!(!catalog_keys.contains(&"openai/gpt-catalog-only"));
}

#[tokio::test]
async fn app_model_vendor_route_returns_catalog_vendors_with_model_counts() {
    let router =
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/model_vendors")
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

    assert_eq!("2000", payload["code"]);
    assert_eq!(
        serde_json::json!([
            { "label": "Anthropic", "code": "anthropic", "modelCount": 1 },
            { "label": "Kuaishou", "code": "kuaishou", "modelCount": 1 },
            { "label": "OpenAI", "code": "openai", "modelCount": 1 }
        ]),
        payload["data"]["items"]
    );
}

#[tokio::test]
async fn app_model_catalog_route_returns_public_plus_result_without_secret_material() {
    let router =
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/models?vendor_code=openai&billing_meter=llm_input_token")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    let payload: serde_json::Value = serde_json::from_str(&body_text).unwrap();

    assert_eq!("2000", payload["code"]);
    assert_eq!("SUCCESS", payload["msg"]);
    assert_eq!(None, payload.get("message"));
    assert_eq!(1, payload["data"]["items"].as_array().unwrap().len());
    assert_eq!("gpt-4o-mini", payload["data"]["items"][0]["model"]);
    assert_eq!(
        "openai/gpt-4o-mini",
        payload["data"]["items"][0]["catalogKey"]
    );
    assert_eq!("GPT-4o mini", payload["data"]["items"][0]["displayName"]);
    assert_eq!("openai", payload["data"]["items"][0]["vendorCode"]);
    assert!(!payload["data"]["items"][0]
        .as_object()
        .unwrap()
        .contains_key("regionCode"));
    assert_eq!("openai", payload["data"]["items"][0]["vendor"]);
    assert_eq!("chat", payload["data"]["items"][0]["capabilities"][0]);
    assert_eq!("tools", payload["data"]["items"][0]["capabilities"][1]);
    assert_eq!(
        "Fast public OpenAI model.",
        payload["data"]["items"][0]["description"]
    );
    assert_eq!("text", payload["data"]["items"][0]["modalities"][0]);
    assert_eq!("image", payload["data"]["items"][0]["inputModalities"][1]);
    assert_eq!("text", payload["data"]["items"][0]["outputModalities"][0]);
    assert_eq!("openai_responses", payload["data"]["items"][0]["apiFormat"]);
    assert_eq!(
        "Low latency chat model with tools.",
        payload["data"]["items"][0]["capabilityIntro"]
    );
    assert_eq!(
        "Validate critical facts.",
        payload["data"]["items"][0]["limitations"][0]
    );
    assert_eq!(
        "Customer support",
        payload["data"]["items"][0]["useCases"][0]
    );
    assert_eq!("2025", payload["data"]["items"][0]["trainingDataCutoff"]);
    assert_eq!(128000, payload["data"]["items"][0]["contextTokens"]);
    assert_eq!(16384, payload["data"]["items"][0]["maxOutputTokens"]);
    assert_eq!(true, payload["data"]["items"][0]["supportsStreaming"]);
    assert_eq!(true, payload["data"]["items"][0]["supportsTools"]);
    assert_eq!(false, payload["data"]["items"][0]["supportsJsonSchema"]);
    assert_eq!(
        "openrouter",
        payload["data"]["items"][0]["providerCodes"][0]
    );
    assert!(!payload["data"]["items"][0]
        .as_object()
        .unwrap()
        .contains_key("officialReferenceUnitPrice"));
    assert!(!payload["data"]["items"][0]
        .as_object()
        .unwrap()
        .contains_key("officialReferenceCurrency"));
    assert_eq!(
        "reference",
        payload["data"]["items"][0]["priceAvailability"]["status"]
    );
    assert_eq!(
        4,
        payload["data"]["items"][0]["officialReferencePrices"]
            .as_array()
            .unwrap()
            .len()
    );
    assert_model_catalog_price(
        &payload["data"]["items"][0],
        "global",
        "llm_input_token",
        "0.150000",
        "USD",
    );
    assert_model_catalog_price(
        &payload["data"]["items"][0],
        "cn",
        "llm_input_token",
        "1.200000",
        "CNY",
    );
    assert_model_catalog_price(
        &payload["data"]["items"][0],
        "global",
        "llm_output_token",
        "0.600000",
        "USD",
    );
    assert_model_catalog_price(
        &payload["data"]["items"][0],
        "global",
        "llm_cache_read_token",
        "0.075000",
        "USD",
    );
    assert_no_model_catalog_price(&payload["data"]["items"][0], "llm_reasoning_token");
    assert_eq!(
        "Public reference price only. Customer-specific pricing requires an API key context.",
        payload["data"]["items"][0]["priceAvailability"]["reason"]
    );
    let item = payload["data"]["items"][0].as_object().unwrap();
    let price_availability = item["priceAvailability"].as_object().unwrap();

    assert!(!item.contains_key("lowestUpstreamCostUnitPrice"));
    assert!(!price_availability.contains_key("groupCode"));
    assert!(!price_availability.contains_key("pricingPlanCode"));
    assert!(!price_availability.contains_key("customerUnitPrice"));
    assert!(!price_availability.contains_key("grossMarginPerUnit"));
    assert!(!body_text.contains("0.110000"));
    assert!(!body_text.contains("lowestUpstreamCostUnitPrice"));
    assert!(!body_text.contains("groupCode"));
    assert!(!body_text.contains("pricingPlanCode"));
    assert!(!body_text.contains("customerUnitPrice"));
    assert!(!body_text.contains("grossMarginPerUnit"));
    assert!(!body_text.contains("hash:sk-live-secret"));
    assert!(!body_text.contains("sk-live-secret"));
    assert!(!body_text.contains("keyHash"));
    assert!(!body_text.contains("key_hash"));
    assert!(!body_text.contains("99.000000"));
    assert_public_model_catalog_response_has_no_sensitive_material(&body_text);
}

#[tokio::test]
async fn app_model_catalog_route_returns_complete_public_reference_prices_in_one_call() {
    let router =
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/models?vendor_code=openai")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body.to_vec()).unwrap();
    let payload: serde_json::Value = serde_json::from_str(&body_text).unwrap();
    let item = &payload["data"]["items"][0];

    assert_eq!("openai/gpt-4o-mini", item["catalogKey"]);
    assert_eq!(4, item["officialReferencePrices"].as_array().unwrap().len());
    assert_model_catalog_price(item, "global", "llm_input_token", "0.150000", "USD");
    assert_model_catalog_price(item, "cn", "llm_input_token", "1.200000", "CNY");
    assert_model_catalog_price(item, "global", "llm_output_token", "0.600000", "USD");
    assert_model_catalog_price(item, "global", "llm_cache_read_token", "0.075000", "USD");
    assert_no_model_catalog_price(item, "llm_reasoning_token");
    assert_eq!("reference", item["priceAvailability"]["status"]);
    assert!(!body_text.contains("0.110000"));
    assert!(!body_text.contains("99.000000"));
    assert!(!body_text.contains("customerUnitPrice"));
    assert!(!body_text.contains("grossMarginPerUnit"));
    assert_public_model_catalog_response_has_no_sensitive_material(&body_text);
}

#[tokio::test]
async fn app_model_catalog_route_marks_non_default_meter_reference_prices_available() {
    let router =
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/models?vendor_code=kuaishou")
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
    let item = &payload["data"]["items"][0];

    assert_eq!("kuaishou/kling-v2", item["catalogKey"]);
    assert!(!item
        .as_object()
        .unwrap()
        .contains_key("officialReferenceUnitPrice"));
    assert_model_catalog_price(item, "global", "video_result", "1.200000", "CNY");
    assert_eq!("reference", item["priceAvailability"]["status"]);
    assert_eq!(
        "Public reference price only. Customer-specific pricing requires an API key context.",
        item["priceAvailability"]["reason"]
    );
}

#[tokio::test]
async fn app_model_catalog_route_keeps_unpriced_models_explicitly_unavailable() {
    let router =
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/models")
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
    let items = payload["data"]["items"].as_array().unwrap();
    let claude = items
        .iter()
        .find(|item| item["model"] == "claude-3-haiku")
        .unwrap();

    assert_eq!("unavailable", claude["priceAvailability"]["status"]);
    assert_eq!(
        "Public reference price is not configured for this model.",
        claude["priceAvailability"]["reason"]
    );
    assert!(!claude
        .as_object()
        .unwrap()
        .contains_key("officialReferenceUnitPrice"));
    assert!(!claude
        .as_object()
        .unwrap()
        .contains_key("lowestUpstreamCostUnitPrice"));
    let price_availability = claude["priceAvailability"].as_object().unwrap();
    assert!(!price_availability.contains_key("groupCode"));
    assert!(!price_availability.contains_key("pricingPlanCode"));
    assert!(!price_availability.contains_key("customerUnitPrice"));
    assert!(!price_availability.contains_key("grossMarginPerUnit"));
}

#[tokio::test]
async fn app_model_catalog_route_returns_public_taxonomy_and_filters_server_side() {
    let mut catalog = catalog();
    catalog.add_channel_group(
        ChannelGroup::new(
            12,
            "empty-admin-group",
            "standard",
            DecimalValue::parse("1.000000").unwrap(),
            DecimalValue::parse("1.100000").unwrap(),
        )
        .with_name("Empty Admin Group"),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3001)
            .with_resource_scoped_group_binding(10, 10, 100, Vec::<String>::new(), vec!["llm"])
            .with_resource_scoped_group_binding(11, 20, 100, Vec::<String>::new(), vec!["tools"]),
    );
    let router =
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(catalog));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/models?vendor_codes=openai,anthropic&modalities=text&capabilities=tools&categories=Recommended,Proprietary&groups=premium-lab&q=gpt&limit=10")
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
    let items = payload["data"]["items"].as_array().unwrap();

    assert_eq!(1, items.len());
    let item = &items[0];
    assert_eq!("openai/gpt-4o-mini", item["catalogKey"]);
    assert_eq!(
        serde_json::json!(["premium-lab", "standard-group"]),
        item["groups"]
    );
    assert_eq!(
        serde_json::json!(["Recommended", "Proprietary"]),
        item["categories"]
    );
    assert_eq!(
        serde_json::json!([
            { "key": "premium-lab", "label": "Premium Lab", "modelCount": 1 },
            { "key": "standard-group", "label": "standard-group", "modelCount": 3 },
            { "key": "empty-admin-group", "label": "Empty Admin Group", "modelCount": 0 }
        ]),
        payload["data"]["groups"]
    );
}

#[tokio::test]
async fn app_model_catalog_route_applies_offset_after_server_side_filters() {
    let router =
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(catalog()));
    let first_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/models?limit=1&offset=0")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let second_response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/models?limit=1&offset=1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, first_response.status());
    assert_eq!(StatusCode::OK, second_response.status());
    let first_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(first_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    let second_payload: serde_json::Value = serde_json::from_slice(
        &axum::body::to_bytes(second_response.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(1, first_payload["data"]["items"].as_array().unwrap().len());
    assert_eq!(1, second_payload["data"]["items"].as_array().unwrap().len());
    assert_ne!(
        first_payload["data"]["items"][0]["catalogKey"],
        second_payload["data"]["items"][0]["catalogKey"]
    );
}

#[tokio::test]
async fn app_model_catalog_router_exposes_only_standard_ai_catalog_paths() {
    let router =
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(catalog()));
    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/router/models")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());

    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/router/model_vendors")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());

    let removed_playground_models_path = format!("{}{}", "/app/v3/api/ai/playground", "/models");
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(removed_playground_models_path.as_str())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
}

#[tokio::test]
async fn app_model_catalog_route_rejects_non_standard_query_parameters() {
    let router =
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(catalog()));
    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/ai/models?vendor_code=openai&billing_meter=llm_input_token&search_query=gpt")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
}

fn assert_model_catalog_price(
    item: &serde_json::Value,
    region_code: &str,
    billing_meter: &str,
    unit_price: &str,
    currency: &str,
) {
    let prices = item["officialReferencePrices"].as_array().unwrap();
    let price = prices
        .iter()
        .find(|price| price["regionCode"] == region_code && price["billingMeter"] == billing_meter)
        .unwrap_or_else(|| {
            panic!("missing official reference price for {region_code}/{billing_meter}")
        });

    assert_eq!(region_code, price["regionCode"]);
    assert_eq!(unit_price, price["unitPrice"]);
    assert_eq!(currency, price["currency"]);
}

fn assert_no_model_catalog_price(item: &serde_json::Value, billing_meter: &str) {
    let prices = item["officialReferencePrices"].as_array().unwrap();
    assert!(
        !prices
            .iter()
            .any(|price| price["billingMeter"] == billing_meter),
        "unexpected official reference price for {billing_meter}"
    );
}

fn assert_public_model_catalog_response_has_no_sensitive_material(body_text: &str) {
    for sensitive in [
        "lowestUpstreamCostUnitPrice",
        "lowest_upstream_cost_unit_price",
        "upstreamCost",
        "upstream_cost",
        "upstreamCostAmount",
        "upstream_cost_amount",
        "costAmount",
        "cost_amount",
        "costPrice",
        "cost_price",
        "customerUnitPrice",
        "customer_unit_price",
        "customerChargeAmount",
        "customer_charge_amount",
        "grossMarginPerUnit",
        "gross_margin_per_unit",
        "pricingPlanCode",
        "pricing_plan_code",
        "pricingSnapshot",
        "pricing_snapshot",
        "groupCode",
        "group_code",
        "secretRef",
        "secret_ref",
        "credentialRef",
        "credential_ref",
        "keyHash",
        "key_hash",
    ] {
        assert!(
            !body_text.contains(sensitive),
            "public app model catalog response must not expose sensitive field {sensitive}"
        );
    }
}
