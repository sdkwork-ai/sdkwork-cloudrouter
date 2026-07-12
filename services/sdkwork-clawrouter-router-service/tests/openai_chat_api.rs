use std::sync::Arc;
use std::sync::Mutex;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_claw_test_support::assert_server_generated_request_id;
use sdkwork_clawrouter_router_service::api::{
    OpenAiInvocationContext, OpenAiInvocationFault, OpenAiInvocationPlugin,
    OpenAiInvocationPluginError, OpenAiInvocationPluginFuture, OpenAiInvocationRelayOutcome,
    OpenAiProviderRoute, OpenAiRuntimeFailureStrategy, OpenAiRuntimeRouteConfig,
};
use sdkwork_clawrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, ChannelGroup, DecimalValue, GatewayApiKey, ModelMappingBindingType,
    ModelMappingRule, ModelPrice, ModelProviderRoute, ModelVendor, ModelVendorDefinition, Money,
    PriceSide, PricingPlan, ProviderAuthProfile, ProviderChannelRoute, ProviderRetryPolicy,
    RouteCandidate, RoutingCapability, RoutingPolicy, RoutingPolicyScope, RoutingRule,
};
use sdkwork_clawrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_clawrouter_router_service::ports::{
    ChatCompletionRelay, ChatCompletionRelayRequest, ChatCompletionRelayResponse,
    ChatCompletionStreamRelay, ChatCompletionStreamRelayResponse, GatewayRequestTraceCommand,
    GatewayUsageRecordCommand, GatewayUsageRecorder,
};
use tower::ServiceExt;

fn catalog_with_hashed_api_key(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    add_group_routing_policy(
        &mut catalog,
        10,
        9001,
        9101,
        9102,
        "standard-group-gpt-4o-mini",
        "openai/gpt-4o-mini",
        3001,
    );
    catalog
}

fn catalog_with_hashed_api_key_missing_billing_subject(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = catalog_with_hashed_api_key(key_hash.clone());
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash));
    catalog
}

fn catalog_with_hashed_api_key_without_routing(key_hash: String) -> InMemoryPricingCatalog {
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
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter",
            3001,
            "openai/gpt-4o-mini",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/main"),
        )
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter"),
                Some("vault://providers/openrouter/account/main"),
            )
            .with_timeout_ms(30_000)
            .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
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
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash).with_owner(10, 20, 30));
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("0.150000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.110000").unwrap(),
        )
        .for_provider("openrouter", 3001),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmCacheReadToken,
        Money::usd("0.075000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmCacheReadToken,
            Money::usd("0.055000").unwrap(),
        )
        .for_provider("openrouter", 3001),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmOutputToken,
        Money::usd("0.600000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmOutputToken,
            Money::usd("0.440000").unwrap(),
        )
        .for_provider("openrouter", 3001),
    );
    catalog
}

fn catalog_with_hashed_api_key_without_provider_route_snapshot(
    key_hash: String,
) -> InMemoryPricingCatalog {
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
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash).with_owner(10, 20, 30));
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("0.150000").unwrap(),
    ));
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmCacheReadToken,
        Money::usd("0.075000").unwrap(),
    ));
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmOutputToken,
        Money::usd("0.600000").unwrap(),
    ));
    catalog
}

fn add_group_routing_policy(
    catalog: &mut InMemoryPricingCatalog,
    group_id: i64,
    policy_id: i64,
    profile_id: i64,
    rule_id: i64,
    rule_code: &str,
    catalog_key: &str,
    channel_id: i64,
) {
    catalog.add_routing_policy(
        RoutingPolicy::new(
            policy_id,
            10,
            20,
            &format!("{rule_code}-policy"),
            RoutingPolicyScope::ChannelGroup,
            Some(group_id),
            Some(profile_id),
        )
        .with_capability(RoutingCapability::Chat),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            rule_id,
            10,
            20,
            profile_id,
            rule_code,
            1,
            &format!(r#"{{"catalogKey":"{catalog_key}"}}"#),
            catalog_key,
        )
        .with_candidate_channels(vec![RouteCandidate::new(channel_id, 100)]),
    );
}

fn catalog_with_group_channel_routes(
    standard_key_hash: String,
    premium_key_hash: String,
) -> InMemoryPricingCatalog {
    let mut catalog = catalog_with_hashed_api_key(standard_key_hash);
    catalog.add_channel_group(ChannelGroup::new(
        20,
        "premium-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog.add_api_key(
        GatewayApiKey::new(202, 20, "sk-premium", &premium_key_hash).with_owner(10, 20, 31),
    );
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter-premium",
            3002,
            "openai/gpt-4o-mini-premium",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-premium"),
            Some("vault://providers/openrouter/account/premium"),
        )
        .with_timeout_ms(20_000),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-premium", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-premium"),
                Some("vault://providers/openrouter/account/premium"),
            )
            .with_timeout_ms(20_000),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.115000").unwrap(),
        )
        .for_provider("openrouter-premium", 3002),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmOutputToken,
            Money::usd("0.460000").unwrap(),
        )
        .for_provider("openrouter-premium", 3002),
    );
    add_group_routing_policy(
        &mut catalog,
        20,
        9201,
        9301,
        9302,
        "premium-group-gpt-4o-mini",
        "openai/gpt-4o-mini",
        3002,
    );
    catalog
}

fn catalog_with_regional_minimax_pricing_and_routes(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "minimax",
        ModelVendor::MiniMax,
        "MiniMax China",
    ));
    catalog.add_vendor(ModelVendorDefinition::new(
        "minimax",
        ModelVendor::MiniMax,
        "MiniMax Global",
    ));
    catalog.add_model(
        AiModel::new(
            "MiniMax-M2.7",
            "MiniMax M2.7",
            "minimax",
            vec!["chat", "tools"],
        )
        .with_catalog_key("minimax/MiniMax-M2.7"),
    );
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            "minimax_direct",
            4001,
            "MiniMax-M2.7",
        )
        .with_region_code("cn")
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/minimax"),
            Some("vault://providers/minimax/account/cn"),
        ),
    );
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            "minimax_global_direct",
            4002,
            "MiniMax-M2.7",
        )
        .with_region_code("global")
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/minimax-global"),
            Some("vault://providers/minimax/account/global"),
        ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("minimax_direct", 4001)
            .with_region_code("cn")
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/minimax"),
                Some("vault://providers/minimax/account/cn"),
            ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("minimax_global_direct", 4002)
            .with_region_code("global")
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/minimax-global"),
                Some("vault://providers/minimax/account/global"),
            ),
    );
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.000000").unwrap(),
        Money::cny("0.000000").unwrap(),
    ));
    catalog.add_channel_group(ChannelGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash).with_owner(10, 20, 30));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::cny("0.004000").unwrap(),
        )
        .with_region_code("cn"),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::cny("0.004000").unwrap(),
        )
        .with_region_code("cn")
        .for_provider("minimax_direct", 4001),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::cny("0.006000").unwrap(),
        )
        .with_region_code("global"),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::cny("0.006000").unwrap(),
        )
        .with_region_code("global")
        .for_provider("minimax_global_direct", 4002),
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9401,
            10,
            20,
            "standard-group-minimax-policy",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(9501),
        )
        .with_capability(RoutingCapability::Chat),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9502,
            10,
            20,
            9501,
            "standard-group-minimax-m27-base",
            1,
            r#"{"catalogKey":"minimax/MiniMax-M2.7"}"#,
            "minimax/MiniMax-M2.7",
        )
        .with_candidate_channels(vec![RouteCandidate::new(4001, 100)]),
    );
    catalog
}

#[tokio::test]
async fn openai_chat_completions_authenticates_and_returns_honest_relay_not_implemented() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_IMPLEMENTED, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    let payload: serde_json::Value = serde_json::from_str(&body).unwrap();

    assert_eq!(
        "provider_relay_not_configured",
        payload["error"]["code"].as_str().unwrap()
    );
    assert_eq!("server_error", payload["error"]["type"]);
    assert!(!body.contains("sk-live-secret"));
}

#[tokio::test]
async fn openai_chat_completions_rejects_api_key_without_billing_subject_before_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog_with_hashed_api_key_missing_billing_subject(
            key_hash,
        )),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::INTERNAL_SERVER_ERROR, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    let payload: serde_json::Value = serde_json::from_str(&body).unwrap();

    assert_eq!(
        "billing_subject_missing",
        payload["error"]["code"].as_str().unwrap()
    );
    assert_eq!("server_error", payload["error"]["type"]);
    let message = payload["error"]["message"].as_str().unwrap();
    assert!(message.contains("tenant"));
    assert!(message.contains("organization"));
    assert!(message.contains("user"));
    assert!(!body.contains("sk-live-secret"));
    assert!(captured.lock().unwrap().is_empty());
}

#[tokio::test]
async fn openai_chat_completions_rejects_unknown_model_after_authentication() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"missing-model","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        "model_not_found",
        payload["error"]["code"].as_str().unwrap()
    );
}

#[tokio::test]
async fn openai_chat_completions_accepts_official_model_id_when_model_is_not_region_scoped() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router(
        Arc::new(catalog_with_regional_minimax_pricing_and_routes(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"MiniMax-M2.7","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_IMPLEMENTED, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        "provider_relay_not_configured",
        payload["error"]["code"].as_str().unwrap()
    );
}

#[tokio::test]
async fn openai_chat_completions_accepts_base_catalog_key_for_region_scoped_price_route() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router(
        Arc::new(catalog_with_regional_minimax_pricing_and_routes(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"minimax/MiniMax-M2.7","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_IMPLEMENTED, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        "provider_relay_not_configured",
        payload["error"]["code"].as_str().unwrap()
    );
}

#[tokio::test]
async fn openai_chat_completions_routes_each_channel_group_to_its_configured_channel_route() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let standard_key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let premium_key_hash = hasher.hash_secret("sk-premium-secret").unwrap();
    let mut catalog = catalog_with_group_channel_routes(standard_key_hash, premium_key_hash);
    catalog.add_routing_policy(RoutingPolicy::new(
        9001,
        10,
        20,
        "standard-group-policy",
        RoutingPolicyScope::ChannelGroup,
        Some(10),
        Some(9101),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            9102,
            10,
            20,
            9101,
            "standard-group-gpt-4o-mini",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)]),
    );
    catalog.add_routing_policy(RoutingPolicy::new(
        9002,
        10,
        20,
        "premium-group-policy",
        RoutingPolicyScope::ChannelGroup,
        Some(20),
        Some(9201),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            9202,
            10,
            20,
            9201,
            "premium-group-gpt-4o-mini",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3002, 100)]),
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    for api_key in ["sk-standard-secret", "sk-premium-secret"] {
        let response = router
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/chat/completions")
                    .header("authorization", format!("Bearer {api_key}"))
                    .header("content-type", "application/json")
                    .body(Body::from(
                        r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(StatusCode::OK, response.status());
    }

    let captured = captured.lock().unwrap();
    assert_eq!(2, captured.len());
    assert_eq!(101, captured[0].api_key_id);
    assert_eq!(10, captured[0].group_id);
    assert_eq!("openrouter", captured[0].provider_code);
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        captured[0].provider_base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter/account/main"),
        captured[0].provider_secret_ref.as_deref()
    );
    assert_eq!(202, captured[1].api_key_id);
    assert_eq!(20, captured[1].group_id);
    assert_eq!("openrouter-premium", captured[1].provider_code);
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter-premium"),
        captured[1].provider_base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter/account/premium"),
        captured[1].provider_secret_ref.as_deref()
    );
    assert_eq!("openai/gpt-4o-mini-premium", captured[1].provider_model);
}

#[tokio::test]
async fn openai_chat_completions_uses_group_channel_route_endpoint_for_selected_model_route() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3001)
            .with_provider_endpoint(
                Some("http://account-pool.internal/openrouter-standard"),
                Some("vault://providers/openrouter/account/standard-pool"),
            )
            .with_auth_profile(ProviderAuthProfile::header("x-api-key"))
            .with_timeout_ms(45_000)
            .with_retry_policy(ProviderRetryPolicy::new(4, vec![408, 429, 503], 50).unwrap()),
    );
    add_group_routing_policy(
        &mut catalog,
        10,
        9001,
        9101,
        9102,
        "standard-group-gpt-4o-mini",
        "openai/gpt-4o-mini",
        3001,
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("openrouter", captured[0].provider_code);
    assert_eq!("gpt-4o-mini", captured[0].provider_model);
    assert_eq!(
        Some("http://account-pool.internal/openrouter-standard"),
        captured[0].provider_base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter/account/standard-pool"),
        captured[0].provider_secret_ref.as_deref()
    );
    assert_eq!(
        ProviderAuthProfile::header("x-api-key"),
        captured[0].provider_auth_profile
    );
    assert_eq!(Some(45_000), captured[0].provider_timeout_ms);
    assert_eq!(
        Some(ProviderRetryPolicy::new(4, vec![408, 429, 503], 50).unwrap()),
        captured[0].provider_retry_policy
    );
}

#[tokio::test]
async fn openai_chat_completions_applies_model_mapping_before_provider_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key(key_hash);
    catalog.add_model_mapping(
        ModelMappingRule::new(
            1,
            ModelMappingBindingType::Global,
            "openai-fast",
            "openai/gpt-4o-mini",
            100,
        )
        .with_target_provider_model("openrouter/gpt-4o-mini-fast"),
    );
    catalog.add_model_mapping(
        ModelMappingRule::new(
            2,
            ModelMappingBindingType::Channel,
            "openai-fast",
            "openai/gpt-4o-mini",
            10,
        )
        .with_binding_id(3001)
        .with_target_provider_model("openrouter/gpt-4o-mini-account"),
    );
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"openai-fast","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("openai-fast", captured[0].model);
    assert_eq!("openai-fast", captured[0].request_body["model"]);
    assert_eq!("openrouter/gpt-4o-mini-account", captured[0].provider_model);
}

#[tokio::test]
async fn openai_chat_completions_channel_scoped_mapping_switches_target_route_on_same_account() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key(key_hash);
    catalog.add_model(
        AiModel::new("gpt-4o", "GPT-4o", "openai", vec!["chat", "tools"])
            .with_catalog_key("openai/gpt-4o"),
    );
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o",
            "gpt-4o",
            "openrouter",
            3001,
            "openrouter/gpt-4o-account",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/main"),
        ),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o",
        "gpt-4o",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("2.500000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o",
            "gpt-4o",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("2.000000").unwrap(),
        )
        .for_provider("openrouter", 3001),
    );
    catalog.add_model_mapping(
        ModelMappingRule::new(
            3,
            ModelMappingBindingType::Channel,
            "gpt-4o-mini",
            "openai/gpt-4o",
            10,
        )
        .with_binding_id(3001),
    );
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!("gpt-4o-mini", captured[0].model);
    assert_eq!("openrouter/gpt-4o-account", captured[0].provider_model);
}

#[tokio::test]
async fn openai_chat_completions_routes_catalog_model_through_channel_route_without_model_route() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_model(
        AiModel::new("gpt-5.5", "GPT-5.5", "openai", vec!["chat"])
            .with_catalog_key("openai/gpt-5.5"),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-5.5",
        "gpt-5.5",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("1.250000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-5.5",
            "gpt-5.5",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.900000").unwrap(),
        )
        .for_provider("openrouter-gpt55", 3002),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-gpt55", 3002)
            .with_provider_endpoint(
                Some("http://account-pool.internal/openrouter-gpt55"),
                Some("vault://providers/openrouter-gpt55/account/group-10"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["llm"]),
    );
    add_group_routing_policy(
        &mut catalog,
        10,
        9001,
        9101,
        9102,
        "standard-group-gpt-55",
        "openai/gpt-5.5",
        3002,
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"openai/gpt-5.5","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(10, captured[0].group_id);
    assert_eq!(3002, captured[0].provider_channel_id);
    assert_eq!("openrouter-gpt55", captured[0].provider_code);
    assert_eq!("gpt-5.5", captured[0].provider_model);
    assert_eq!(
        Some("http://account-pool.internal/openrouter-gpt55"),
        captured[0].provider_base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter-gpt55/account/group-10"),
        captured[0].provider_secret_ref.as_deref()
    );
}

#[tokio::test]
async fn openai_chat_completions_accepts_slash_native_model_and_sends_native_model_upstream() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_vendor(ModelVendorDefinition::new(
        "openrouter",
        ModelVendor::Unknown,
        "OpenRouter",
    ));
    catalog.add_model(
        AiModel::new(
            "anthropic/claude-3-opus",
            "Claude 3 Opus via OpenRouter",
            "openrouter",
            vec!["chat"],
        )
        .with_catalog_key("openrouter/anthropic/claude-3-opus"),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openrouter/anthropic/claude-3-opus",
        "anthropic/claude-3-opus",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("1.250000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openrouter/anthropic/claude-3-opus",
            "anthropic/claude-3-opus",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.900000").unwrap(),
        )
        .for_provider("openrouter", 3003),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3003)
            .with_provider_endpoint(
                Some("http://account-pool.internal/openrouter"),
                Some("vault://providers/openrouter/account/group-10"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["llm"]),
    );
    add_group_routing_policy(
        &mut catalog,
        10,
        9201,
        9202,
        9203,
        "standard-group-openrouter-claude",
        "openrouter/anthropic/claude-3-opus",
        3003,
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"anthropic/claude-3-opus","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("openrouter", captured[0].provider_code);
    assert_eq!("anthropic/claude-3-opus", captured[0].provider_model);
    assert_eq!(
        Some("http://account-pool.internal/openrouter"),
        captured[0].provider_base_url.as_deref()
    );
}

#[tokio::test]
async fn openai_chat_completions_routes_alibaba_regional_model_through_region_scoped_group_channel_route(
) {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_vendor(ModelVendorDefinition::new(
        "alibaba",
        ModelVendor::Alibaba,
        "Alibaba",
    ));
    catalog.add_model(
        AiModel::new(
            "qwen3.6-max-preview",
            "Qwen3.6 Max Preview",
            "alibaba",
            vec!["chat"],
        )
        .with_catalog_key("alibaba/qwen3.6-max-preview"),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "alibaba/qwen3.6-max-preview",
        "qwen3.6-max-preview",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("1.500000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "alibaba/qwen3.6-max-preview",
            "qwen3.6-max-preview",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("1.000000").unwrap(),
        )
        .for_provider("dashscope", 3101),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("dashscope", 3101)
            .with_provider_endpoint(
                Some("http://account-pool.internal/dashscope-cn"),
                Some("vault://providers/dashscope/account/group-10"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["llm"]),
    );
    add_group_routing_policy(
        &mut catalog,
        10,
        9301,
        9401,
        9402,
        "standard-group-alibaba-cn",
        "alibaba/qwen3.6-max-preview",
        3101,
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"alibaba/qwen3.6-max-preview","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(10, captured[0].group_id);
    assert_eq!(3101, captured[0].provider_channel_id);
    assert_eq!("dashscope", captured[0].provider_code);
    assert_eq!("qwen3.6-max-preview", captured[0].provider_model);
    assert_eq!(
        Some("http://account-pool.internal/dashscope-cn"),
        captured[0].provider_base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/dashscope/account/group-10"),
        captured[0].provider_secret_ref.as_deref()
    );
}

#[tokio::test]
async fn openai_chat_completions_routes_group_bound_channel_route_without_explicit_policy_rule() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_vendor(ModelVendorDefinition::new(
        "alibaba",
        ModelVendor::Alibaba,
        "Alibaba",
    ));
    catalog.add_model(
        AiModel::new(
            "qwen3.6-max-preview",
            "Qwen3.6 Max Preview",
            "alibaba",
            vec!["chat"],
        )
        .with_catalog_key("alibaba/qwen3.6-max-preview"),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "alibaba/qwen3.6-max-preview",
        "qwen3.6-max-preview",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("1.500000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "alibaba/qwen3.6-max-preview",
            "qwen3.6-max-preview",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("1.000000").unwrap(),
        )
        .for_provider("dashscope", 3101),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("dashscope", 3101)
            .with_provider_endpoint(
                Some("http://account-pool.internal/dashscope-cn"),
                Some("vault://providers/dashscope/account/group-10"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["llm"]),
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"alibaba/qwen3.6-max-preview","messages":[{"role":"user","content":"ping"}],"temperature":0.2}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(10, captured[0].group_id);
    assert_eq!(3101, captured[0].provider_channel_id);
    assert_eq!("dashscope", captured[0].provider_code);
    assert_eq!("qwen3.6-max-preview", captured[0].provider_model);
    assert_eq!(
        Some("http://account-pool.internal/dashscope-cn"),
        captured[0].provider_base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/dashscope/account/group-10"),
        captured[0].provider_secret_ref.as_deref()
    );
    assert_eq!(
        serde_json::json!({
            "model": "alibaba/qwen3.6-max-preview",
            "messages": [{"role":"user","content":"ping"}],
            "temperature": 0.2
        }),
        captured[0].request_body
    );
}

#[tokio::test]
async fn openai_chat_completions_routes_model_candidates_through_bound_group_channel_route() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter-unbound",
            3001,
            "gpt-4o-mini-unbound",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-unbound"),
            Some("vault://providers/openrouter-unbound/account/main"),
        ),
    );
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter-bound",
            3002,
            "gpt-4o-mini-bound",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-bound"),
            Some("vault://providers/openrouter-bound/account/main"),
        ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-unbound", 3001).with_provider_endpoint(
            Some("http://account-pool.internal/openrouter-unbound"),
            Some("vault://providers/openrouter-unbound/account/main"),
        ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-bound", 3002)
            .with_provider_endpoint(
                Some("http://account-pool.internal/openrouter-bound"),
                Some("vault://providers/openrouter-bound/account/group-10"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["llm"]),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.120000").unwrap(),
        )
        .for_provider("openrouter-bound", 3002),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmOutputToken,
            Money::usd("0.480000").unwrap(),
        )
        .for_provider("openrouter-bound", 3002),
    );
    add_group_routing_policy(
        &mut catalog,
        10,
        9001,
        9101,
        9102,
        "standard-group-gpt-4o-mini",
        "openai/gpt-4o-mini",
        3001,
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9103,
            10,
            20,
            9101,
            "standard-group-weighted-account-pool",
            0,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![
            RouteCandidate::new(3001, 100),
            RouteCandidate::new(3002, 50),
        ]),
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(10, captured[0].group_id);
    assert_eq!(3002, captured[0].provider_channel_id);
    assert_eq!("openrouter-bound", captured[0].provider_code);
    assert_eq!("gpt-4o-mini-bound", captured[0].provider_model);
    assert_eq!(
        Some("http://account-pool.internal/openrouter-bound"),
        captured[0].provider_base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter-bound/account/group-10"),
        captured[0].provider_secret_ref.as_deref()
    );
}

#[tokio::test]
async fn openai_chat_completions_sanitizes_empty_route_snapshot_errors() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog_with_hashed_api_key_without_provider_route_snapshot(
            key_hash,
        )),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    assert!(captured.lock().unwrap().is_empty());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let message = payload["error"]["message"].as_str().unwrap();

    assert_eq!(
        "provider_route_snapshot_empty",
        payload["error"]["code"].as_str().unwrap()
    );
    assert!(message.contains("provider route snapshot is empty for model"));
    assert!(!message.contains("route diagnostics"), "{message}");
    assert!(!message.contains("api_key_id"), "{message}");
    assert!(!message.contains("tenant_id"), "{message}");
    assert!(!message.contains("organization_id"), "{message}");
    assert!(!message.contains("user_id"), "{message}");
    assert!(!message.contains("channel_group_code"), "{message}");
}

#[tokio::test]
async fn openai_chat_completions_rejects_misconfigured_group_channel_route_without_cross_pool_fallback(
) {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_routing_policy(RoutingPolicy::new(
        9001,
        10,
        20,
        "standard-group-policy",
        RoutingPolicyScope::ChannelGroup,
        Some(10),
        Some(9101),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            9102,
            10,
            20,
            9101,
            "standard-group-broken-pool",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(9999, 100)]),
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    assert!(captured.lock().unwrap().is_empty());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        "provider_route_not_available",
        payload["error"]["code"].as_str().unwrap()
    );
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("channel route"));
}

#[tokio::test]
async fn openai_chat_completions_reports_pricing_unavailable_for_callable_route_without_price() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
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
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter",
            3001,
            "openai/gpt-4o-mini",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/main"),
        ),
    );
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
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash).with_owner(10, 20, 30));
    add_group_routing_policy(
        &mut catalog,
        10,
        9001,
        9101,
        9102,
        "standard-group-gpt-4o-mini",
        "openai/gpt-4o-mini",
        3001,
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    assert!(captured.lock().unwrap().is_empty());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        "pricing_unavailable",
        payload["error"]["code"].as_str().unwrap()
    );
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("official reference price"));
}

#[tokio::test]
async fn openai_chat_completions_rejects_group_policy_missing_chat_capability_without_global_fallback(
) {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "global-openrouter",
            3003,
            "openai/gpt-4o-mini-global",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/global-openrouter"),
            Some("vault://providers/openrouter/account/global"),
        ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("global-openrouter", 3003).with_provider_endpoint(
            Some("http://provider-proxy.internal/global-openrouter"),
            Some("vault://providers/openrouter/account/global"),
        ),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.120000").unwrap(),
        )
        .for_provider("global-openrouter", 3003),
    );
    catalog.add_routing_policy(RoutingPolicy::new(
        8001,
        0,
        0,
        "global-chat-policy",
        RoutingPolicyScope::Global,
        None,
        Some(8101),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            8102,
            0,
            0,
            8101,
            "global-chat-rule",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3003, 100)]),
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9001,
            10,
            20,
            "standard-group-embedding-policy",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(9101),
        )
        .with_capability(RoutingCapability::Embedding),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9102,
            10,
            20,
            9101,
            "standard-group-embedding-rule",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)]),
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    assert!(captured.lock().unwrap().is_empty());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        "provider_route_not_available",
        payload["error"]["code"].as_str().unwrap()
    );
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("has no routing policy for capability"));
}

#[tokio::test]
async fn openai_chat_completions_rejects_configured_group_policy_without_matching_rule() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_routing_policy(RoutingPolicy::new(
        9001,
        10,
        20,
        "standard-group-policy",
        RoutingPolicyScope::ChannelGroup,
        Some(10),
        Some(9101),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            9102,
            10,
            20,
            9101,
            "standard-group-other-model",
            1,
            r#"{"catalogKey":"openai/other-model"}"#,
            "openai/other-model",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)]),
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    assert!(captured.lock().unwrap().is_empty());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        "provider_route_not_available",
        payload["error"]["code"].as_str().unwrap()
    );
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("has no routing rule"));
}

#[derive(Debug)]
struct RecordingRelay {
    captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
}

impl RecordingRelay {
    fn new(captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>) -> Self {
        Self { captured }
    }
}

impl ChatCompletionRelay for RecordingRelay {
    fn create_chat_completion<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        self.captured.lock().unwrap().push(request);
        Box::pin(async {
            Ok(ChatCompletionRelayResponse::json(
                200,
                serde_json::json!({
                    "id": "chatcmpl-test",
                    "object": "chat.completion",
                    "model": "gpt-4o-mini",
                    "choices": [
                        {
                            "index": 0,
                            "message": {"role": "assistant", "content": "pong"},
                            "finish_reason": "stop"
                        }
                    ],
                    "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}
                }),
            ))
        })
    }
}

#[derive(Debug)]
struct CachedUsageRelay;

impl ChatCompletionRelay for CachedUsageRelay {
    fn create_chat_completion<'a>(
        &'a self,
        _request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        Box::pin(async {
            Ok(ChatCompletionRelayResponse::json(
                200,
                serde_json::json!({
                    "id": "chatcmpl-cached-usage",
                    "object": "chat.completion",
                    "model": "gpt-4o-mini",
                    "choices": [
                        {
                            "index": 0,
                            "message": {"role": "assistant", "content": "pong"},
                            "finish_reason": "stop"
                        }
                    ],
                    "usage": {
                        "prompt_tokens": 1_000_000,
                        "completion_tokens": 500_000,
                        "total_tokens": 1_500_000,
                        "prompt_tokens_details": {"cached_tokens": 250_000}
                    }
                }),
            ))
        })
    }
}

#[derive(Debug)]
struct FailingRelay;

impl ChatCompletionRelay for FailingRelay {
    fn create_chat_completion<'a>(
        &'a self,
        _request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        Box::pin(async {
            Err(sdkwork_clawrouter_router_service::domain::DomainError::new(
                "upstream connection failed",
            ))
        })
    }
}

#[derive(Debug)]
struct FailingPrimaryRelay {
    captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
    failing_provider_code: &'static str,
}

impl FailingPrimaryRelay {
    fn new(
        captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
        failing_provider_code: &'static str,
    ) -> Self {
        Self {
            captured,
            failing_provider_code,
        }
    }
}

#[derive(Debug)]
struct RetryableStatusPrimaryRelay {
    captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
    failing_provider_code: &'static str,
}

impl RetryableStatusPrimaryRelay {
    fn new(
        captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
        failing_provider_code: &'static str,
    ) -> Self {
        Self {
            captured,
            failing_provider_code,
        }
    }
}

impl ChatCompletionRelay for RetryableStatusPrimaryRelay {
    fn create_chat_completion<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        let provider_code = request.provider_code.clone();
        self.captured.lock().unwrap().push(request);
        Box::pin(async move {
            if provider_code == self.failing_provider_code {
                return Ok(ChatCompletionRelayResponse::json(
                    503,
                    serde_json::json!({
                        "error": {
                            "message": "upstream overloaded",
                            "type": "server_error",
                            "code": "overloaded"
                        }
                    }),
                ));
            }
            Ok(ChatCompletionRelayResponse::json(
                200,
                serde_json::json!({
                    "id": "chatcmpl-fallback",
                    "object": "chat.completion",
                    "model": "gpt-4o-mini",
                    "choices": [
                        {
                            "index": 0,
                            "message": {"role": "assistant", "content": "pong"},
                            "finish_reason": "stop"
                        }
                    ],
                    "usage": {"prompt_tokens": 2, "completion_tokens": 3, "total_tokens": 5}
                }),
            ))
        })
    }
}

impl ChatCompletionRelay for FailingPrimaryRelay {
    fn create_chat_completion<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        let provider_code = request.provider_code.clone();
        self.captured.lock().unwrap().push(request);
        Box::pin(async move {
            if provider_code == self.failing_provider_code {
                return Err(sdkwork_clawrouter_router_service::domain::DomainError::new(
                    "upstream connection failed",
                ));
            }
            Ok(ChatCompletionRelayResponse::json(
                200,
                serde_json::json!({
                    "id": "chatcmpl-fallback",
                    "object": "chat.completion",
                    "model": "gpt-4o-mini",
                    "choices": [
                        {
                            "index": 0,
                            "message": {"role": "assistant", "content": "pong"},
                            "finish_reason": "stop"
                        }
                    ],
                    "usage": {"prompt_tokens": 2, "completion_tokens": 3, "total_tokens": 5}
                }),
            ))
        })
    }
}

#[derive(Debug)]
struct RecordingStreamRelay {
    captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
    body: &'static str,
}

impl RecordingStreamRelay {
    fn new(captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>) -> Self {
        Self {
            captured,
            body: "data: {\"id\":\"chatcmpl-stream\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\ndata: {\"id\":\"chatcmpl-stream\",\"choices\":[],\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":1,\"total_tokens\":2}}\n\ndata: [DONE]\n\n",
        }
    }

    fn with_body(
        captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
        body: &'static str,
    ) -> Self {
        Self { captured, body }
    }
}

impl ChatCompletionStreamRelay for RecordingStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionStreamRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        self.captured.lock().unwrap().push(request);
        Box::pin(async {
            Ok(ChatCompletionStreamRelayResponse::new(
                200,
                Some("text/event-stream".to_owned()),
                axum::body::Body::from(self.body),
            ))
        })
    }
}

#[derive(Debug)]
struct FailingPrimaryStreamRelay {
    captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
    failing_provider_code: &'static str,
}

impl FailingPrimaryStreamRelay {
    fn new(
        captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
        failing_provider_code: &'static str,
    ) -> Self {
        Self {
            captured,
            failing_provider_code,
        }
    }
}

impl ChatCompletionStreamRelay for FailingPrimaryStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionStreamRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        let provider_code = request.provider_code.clone();
        self.captured.lock().unwrap().push(request);
        Box::pin(async move {
            if provider_code == self.failing_provider_code {
                return Err(sdkwork_clawrouter_router_service::domain::DomainError::new(
                    "upstream stream connection failed",
                ));
            }
            Ok(ChatCompletionStreamRelayResponse::new(
                200,
                Some("text/event-stream".to_owned()),
                axum::body::Body::from(
                    "data: {\"id\":\"chatcmpl-stream-fallback\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\ndata: {\"id\":\"chatcmpl-stream-fallback\",\"choices\":[],\"usage\":{\"prompt_tokens\":2,\"completion_tokens\":3,\"total_tokens\":5}}\n\ndata: [DONE]\n\n",
                ),
            ))
        })
    }
}

#[derive(Debug)]
struct MissingUsageRelay;

impl ChatCompletionRelay for MissingUsageRelay {
    fn create_chat_completion<'a>(
        &'a self,
        _request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<
                        ChatCompletionRelayResponse,
                    >,
                > + Send
                + 'a,
        >,
    > {
        Box::pin(async {
            Ok(ChatCompletionRelayResponse::json(
                200,
                serde_json::json!({
                    "id": "chatcmpl-missing-usage",
                    "object": "chat.completion",
                    "model": "gpt-4o-mini",
                    "choices": [
                        {
                            "index": 0,
                            "message": {"role": "assistant", "content": "pong"},
                            "finish_reason": "stop"
                        }
                    ]
                }),
            ))
        })
    }
}

#[derive(Debug)]
struct RecordingUsageRecorder {
    captured: Arc<Mutex<Vec<GatewayUsageRecordCommand>>>,
    traces: Arc<Mutex<Vec<GatewayRequestTraceCommand>>>,
}

impl RecordingUsageRecorder {
    fn new(captured: Arc<Mutex<Vec<GatewayUsageRecordCommand>>>) -> Self {
        Self {
            captured,
            traces: Arc::new(Mutex::new(Vec::new())),
        }
    }

    fn with_traces(
        captured: Arc<Mutex<Vec<GatewayUsageRecordCommand>>>,
        traces: Arc<Mutex<Vec<GatewayRequestTraceCommand>>>,
    ) -> Self {
        Self { captured, traces }
    }
}

impl GatewayUsageRecorder for RecordingUsageRecorder {
    fn record_gateway_trace<'a>(
        &'a self,
        command: GatewayRequestTraceCommand,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<()>,
                > + Send
                + 'a,
        >,
    > {
        self.traces.lock().unwrap().push(command);
        Box::pin(async { Ok(()) })
    }

    fn record_gateway_usage<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<
                    Output = sdkwork_clawrouter_router_service::domain::DomainResult<()>,
                > + Send
                + 'a,
        >,
    > {
        self.captured.lock().unwrap().push(command);
        Box::pin(async { Ok(()) })
    }
}

#[derive(Debug)]
struct RecordingInvocationPlugin {
    events: Arc<Mutex<Vec<String>>>,
}

impl RecordingInvocationPlugin {
    fn new(events: Arc<Mutex<Vec<String>>>) -> Self {
        Self { events }
    }
}

impl OpenAiInvocationPlugin for RecordingInvocationPlugin {
    fn before_route_selection<'a>(
        &'a self,
        context: &'a OpenAiInvocationContext,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events.lock().unwrap().push(format!(
            "before_route_selection:{}",
            context.requested_model
        ));
        Box::pin(async { Ok(()) })
    }

    fn after_route_selection<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        route: &'a mut OpenAiProviderRoute,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events.lock().unwrap().push(format!(
            "after_route_selection:{}:{}",
            route.provider_code, route.channel_id
        ));
        Box::pin(async { Ok(()) })
    }

    fn before_relay<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        route: &'a mut OpenAiProviderRoute,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events.lock().unwrap().push(format!(
            "before_relay:{}",
            route.provider_base_url.as_deref().unwrap_or_default()
        ));
        Box::pin(async { Ok(()) })
    }

    fn after_relay<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        _route: &'a OpenAiProviderRoute,
        outcome: &'a OpenAiInvocationRelayOutcome,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events
            .lock()
            .unwrap()
            .push(format!("after_relay:{}", outcome.status_code));
        Box::pin(async { Ok(()) })
    }

    fn on_route_fault<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        route: &'a OpenAiProviderRoute,
        fault: &'a OpenAiInvocationFault,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events.lock().unwrap().push(format!(
            "route_fault:{}:{}",
            route.provider_code, fault.error_code
        ));
        Box::pin(async { Ok(()) })
    }

    fn on_route_success<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        route: &'a OpenAiProviderRoute,
        outcome: &'a OpenAiInvocationRelayOutcome,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events.lock().unwrap().push(format!(
            "route_success:{}:{}",
            route.provider_code, outcome.status_code
        ));
        Box::pin(async { Ok(()) })
    }
}

#[derive(Debug)]
struct BlockingInvocationPlugin {
    events: Arc<Mutex<Vec<String>>>,
}

impl BlockingInvocationPlugin {
    fn new(events: Arc<Mutex<Vec<String>>>) -> Self {
        Self { events }
    }
}

impl OpenAiInvocationPlugin for BlockingInvocationPlugin {
    fn before_relay<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        route: &'a mut OpenAiProviderRoute,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events
            .lock()
            .unwrap()
            .push(format!("blocked_before_relay:{}", route.provider_code));
        Box::pin(async {
            Err(OpenAiInvocationPluginError::new(
                StatusCode::TOO_MANY_REQUESTS,
                "quota_exceeded",
                "rate_limit_error",
                "request quota is exhausted",
            ))
        })
    }
}

#[derive(Debug)]
struct FailingAfterRelayInvocationPlugin {
    events: Arc<Mutex<Vec<String>>>,
}

impl FailingAfterRelayInvocationPlugin {
    fn new(events: Arc<Mutex<Vec<String>>>) -> Self {
        Self { events }
    }
}

impl OpenAiInvocationPlugin for FailingAfterRelayInvocationPlugin {
    fn after_relay<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        _route: &'a OpenAiProviderRoute,
        outcome: &'a OpenAiInvocationRelayOutcome,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events
            .lock()
            .unwrap()
            .push(format!("after_relay_failed:{}", outcome.status_code));
        Box::pin(async {
            Err(OpenAiInvocationPluginError::new(
                StatusCode::BAD_GATEWAY,
                "monitoring_failed",
                "server_error",
                "monitoring sink is unavailable",
            ))
        })
    }

    fn on_error<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        _route: Option<&'a OpenAiProviderRoute>,
        error: &'a OpenAiInvocationPluginError,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events
            .lock()
            .unwrap()
            .push(format!("observed_error:{}", error.code));
        Box::pin(async { Ok(()) })
    }
}

#[derive(Debug)]
struct RecordingErrorInvocationPlugin {
    events: Arc<Mutex<Vec<String>>>,
}

impl RecordingErrorInvocationPlugin {
    fn new(events: Arc<Mutex<Vec<String>>>) -> Self {
        Self { events }
    }
}

impl OpenAiInvocationPlugin for RecordingErrorInvocationPlugin {
    fn on_error<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        route: Option<&'a OpenAiProviderRoute>,
        error: &'a OpenAiInvocationPluginError,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events.lock().unwrap().push(format!(
            "error:{}:{}:{}",
            error.status_code.as_u16(),
            error.code,
            route
                .map(|route| route.provider_code.as_str())
                .unwrap_or("unrouted")
        ));
        Box::pin(async { Ok(()) })
    }
}

#[derive(Debug)]
struct AccountOverrideInvocationPlugin;

impl OpenAiInvocationPlugin for AccountOverrideInvocationPlugin {
    fn before_relay<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        route: &'a mut OpenAiProviderRoute,
    ) -> OpenAiInvocationPluginFuture<'a> {
        route.provider_base_url = Some("http://plugin-account-pool.internal/openrouter".to_owned());
        route.provider_secret_ref = Some("vault://providers/openrouter/account/plugin".to_owned());
        route.provider_auth_profile = ProviderAuthProfile::header("x-api-key");
        route.provider_timeout_ms = Some(12_000);
        Box::pin(async { Ok(()) })
    }
}

#[tokio::test]
async fn openai_chat_completions_fails_over_to_rule_fallback_after_primary_relay_failure() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter-fallback",
            3002,
            "openai/gpt-4o-mini-fallback",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/fallback"),
        ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-fallback", 3002).with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/fallback"),
        ),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.120000").unwrap(),
        )
        .for_provider("openrouter-fallback", 3002),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmOutputToken,
            Money::usd("0.480000").unwrap(),
        )
        .for_provider("openrouter-fallback", 3002),
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9001,
            10,
            20,
            "standard-group-failover-policy",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(9101),
        )
        .with_capability(RoutingCapability::Chat),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9102,
            10,
            20,
            9101,
            "standard-group-gpt-4o-mini-failover",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)])
        .with_fallback_chain(vec![RouteCandidate::new(3002, 50)]),
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let usage_records = Arc::new(Mutex::new(Vec::new()));
    let error_events = Arc::new(Mutex::new(Vec::new()));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_and_usage_recorder_and_plugins(
        Arc::new(catalog),
        hasher,
        Arc::new(FailingPrimaryRelay::new(Arc::clone(&captured), "openrouter")),
        Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_records))),
        vec![Arc::new(RecordingErrorInvocationPlugin::new(Arc::clone(&error_events)))],
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-failover")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(2, captured.len());
    assert_eq!("openrouter", captured[0].provider_code);
    assert_eq!("openrouter-fallback", captured[1].provider_code);

    let usage_records = usage_records.lock().unwrap();
    assert_eq!(1, usage_records.len());
    assert_server_generated_request_id(&usage_records[0].request_id, "req-failover");
    assert_eq!("openrouter-fallback", usage_records[0].provider_code);
    assert_eq!(3002, usage_records[0].channel_id);
    assert_eq!(2, usage_records[0].prompt_tokens);
    assert_eq!(3, usage_records[0].completion_tokens);

    assert_eq!(
        vec!["error:502:provider_relay_failed:openrouter"],
        *error_events.lock().unwrap()
    );
}

#[tokio::test]
async fn openai_chat_completions_fails_over_after_retryable_provider_status() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter-fallback",
            3002,
            "openai/gpt-4o-mini-fallback",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/fallback"),
        ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-fallback", 3002).with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/fallback"),
        ),
    );
    for meter in [BillingMeter::LlmInputToken, BillingMeter::LlmOutputToken] {
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openai/gpt-4o-mini",
                "gpt-4o-mini",
                PriceSide::UpstreamCost,
                meter,
                Money::usd("0.120000").unwrap(),
            )
            .for_provider("openrouter-fallback", 3002),
        );
    }
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9001,
            10,
            20,
            "standard-group-failover-policy",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(9101),
        )
        .with_capability(RoutingCapability::Chat),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9102,
            10,
            20,
            9101,
            "standard-group-gpt-4o-mini-failover",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)])
        .with_fallback_chain(vec![RouteCandidate::new(3002, 50)]),
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let usage_records = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_and_usage_recorder(
            Arc::new(catalog),
            hasher,
            Arc::new(RetryableStatusPrimaryRelay::new(
                Arc::clone(&captured),
                "openrouter",
            )),
            Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_records))),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-http-failover")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(2, captured.len());
    assert_eq!("openrouter", captured[0].provider_code);
    assert_eq!("openrouter-fallback", captured[1].provider_code);
    assert_eq!(3002, usage_records.lock().unwrap()[0].channel_id);
}

#[tokio::test]
async fn openai_chat_completions_uses_runtime_default_retry_policy_for_status_failover() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter"),
                Some("vault://providers/openrouter/account/main"),
            )
            .with_timeout_ms(30_000),
    );
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter-fallback",
            3002,
            "openai/gpt-4o-mini-fallback",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/fallback"),
        ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-fallback", 3002).with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/fallback"),
        ),
    );
    for meter in [BillingMeter::LlmInputToken, BillingMeter::LlmOutputToken] {
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openai/gpt-4o-mini",
                "gpt-4o-mini",
                PriceSide::UpstreamCost,
                meter,
                Money::usd("0.120000").unwrap(),
            )
            .for_provider("openrouter-fallback", 3002),
        );
    }
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9001,
            10,
            20,
            "standard-group-failover-policy",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(9101),
        )
        .with_capability(RoutingCapability::Chat),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9102,
            10,
            20,
            9101,
            "standard-group-gpt-4o-mini-failover",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)])
        .with_fallback_chain(vec![RouteCandidate::new(3002, 50)]),
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let usage_records = Arc::new(Mutex::new(Vec::new()));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_usage_recorder_plugins_and_runtime_config(
        Arc::new(catalog),
        hasher,
        Arc::new(RetryableStatusPrimaryRelay::new(
            Arc::clone(&captured),
            "openrouter",
        )),
        Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_records))),
        Vec::new(),
        OpenAiRuntimeRouteConfig::new(
            ProviderRetryPolicy::new(2, vec![429], 0).unwrap(),
            OpenAiRuntimeFailureStrategy::Failover,
        ),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-http-runtime-retry-policy")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("openrouter", captured[0].provider_code);
    assert!(usage_records.lock().unwrap().is_empty());
}

#[tokio::test]
async fn openai_chat_completions_fail_closed_strategy_stops_after_retryable_provider_status() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter-fallback",
            3002,
            "openai/gpt-4o-mini-fallback",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/fallback"),
        ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-fallback", 3002).with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/fallback"),
        ),
    );
    for meter in [BillingMeter::LlmInputToken, BillingMeter::LlmOutputToken] {
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openai/gpt-4o-mini",
                "gpt-4o-mini",
                PriceSide::UpstreamCost,
                meter,
                Money::usd("0.120000").unwrap(),
            )
            .for_provider("openrouter-fallback", 3002),
        );
    }
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9001,
            10,
            20,
            "standard-group-failover-policy",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(9101),
        )
        .with_capability(RoutingCapability::Chat),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9102,
            10,
            20,
            9101,
            "standard-group-gpt-4o-mini-failover",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)])
        .with_fallback_chain(vec![RouteCandidate::new(3002, 50)]),
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let usage_records = Arc::new(Mutex::new(Vec::new()));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_usage_recorder_plugins_and_failure_strategy(
        Arc::new(catalog),
        hasher,
        Arc::new(RetryableStatusPrimaryRelay::new(
            Arc::clone(&captured),
            "openrouter",
        )),
        Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_records))),
        Vec::new(),
        OpenAiRuntimeFailureStrategy::FailClosed,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-http-fail-closed")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("openrouter", captured[0].provider_code);
    assert!(usage_records.lock().unwrap().is_empty());
}

#[tokio::test]
async fn openai_chat_completions_stream_fails_over_to_rule_fallback_before_response_start() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key_without_routing(key_hash);
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter-fallback",
            3002,
            "openai/gpt-4o-mini-fallback",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/fallback"),
        ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-fallback", 3002).with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/fallback"),
        ),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.120000").unwrap(),
        )
        .for_provider("openrouter-fallback", 3002),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmOutputToken,
            Money::usd("0.480000").unwrap(),
        )
        .for_provider("openrouter-fallback", 3002),
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9001,
            10,
            20,
            "standard-group-stream-failover-policy",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(9101),
        )
        .with_capability(RoutingCapability::Chat),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9102,
            10,
            20,
            9101,
            "standard-group-gpt-4o-mini-stream-failover",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)])
        .with_fallback_chain(vec![RouteCandidate::new(3002, 50)]),
    );

    let captured = Arc::new(Mutex::new(Vec::new()));
    let usage_records = Arc::new(Mutex::new(Vec::new()));
    let events = Arc::new(Mutex::new(Vec::new()));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relays_and_usage_recorder_and_plugins(
        Arc::new(catalog),
        hasher,
        Arc::new(RecordingRelay::new(Arc::new(Mutex::new(Vec::new())))),
        Arc::new(FailingPrimaryStreamRelay::new(Arc::clone(&captured), "openrouter")),
        Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_records))),
        vec![Arc::new(RecordingInvocationPlugin::new(Arc::clone(&events)))],
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-stream-failover")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(body.contains("chatcmpl-stream-fallback"));

    let captured = captured.lock().unwrap();
    assert_eq!(2, captured.len());
    assert_eq!("openrouter", captured[0].provider_code);
    assert_eq!("openrouter-fallback", captured[1].provider_code);

    let usage_records = usage_records.lock().unwrap();
    assert_eq!(1, usage_records.len());
    assert_server_generated_request_id(&usage_records[0].request_id, "req-stream-failover");
    assert!(usage_records[0].streaming);
    assert_eq!("openrouter-fallback", usage_records[0].provider_code);
    assert_eq!(3002, usage_records[0].channel_id);

    let events = events.lock().unwrap();
    assert!(events.contains(&"route_fault:openrouter:provider_relay_failed".to_owned()));
    assert!(events.contains(&"route_success:openrouter-fallback:200".to_owned()));
}

#[tokio::test]
async fn openai_chat_invocation_plugins_observe_route_and_relay_lifecycle() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let events = Arc::new(Mutex::new(Vec::new()));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_and_plugins(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(RecordingRelay::new(Arc::clone(&captured))),
        vec![Arc::new(RecordingInvocationPlugin::new(Arc::clone(
            &events,
        )))],
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        vec![
            "before_route_selection:gpt-4o-mini",
            "after_route_selection:openrouter:3001",
            "before_relay:http://provider-proxy.internal/openrouter",
            "route_success:openrouter:200",
            "after_relay:200",
        ],
        *events.lock().unwrap()
    );
    assert_eq!(1, captured.lock().unwrap().len());
}

#[tokio::test]
async fn openai_chat_invocation_plugin_can_short_circuit_before_relay_without_calling_provider() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let events = Arc::new(Mutex::new(Vec::new()));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_and_plugins(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(RecordingRelay::new(Arc::clone(&captured))),
        vec![Arc::new(BlockingInvocationPlugin::new(Arc::clone(&events)))],
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::TOO_MANY_REQUESTS, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("quota_exceeded", payload["error"]["code"].as_str().unwrap());
    assert_eq!(
        vec!["blocked_before_relay:openrouter"],
        *events.lock().unwrap()
    );
    assert!(captured.lock().unwrap().is_empty());
}

#[tokio::test]
async fn openai_chat_invocation_plugin_observes_provider_relay_errors() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let events = Arc::new(Mutex::new(Vec::new()));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_and_plugins(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(FailingRelay),
        vec![Arc::new(RecordingErrorInvocationPlugin::new(Arc::clone(
            &events,
        )))],
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_GATEWAY, response.status());
    assert_eq!(
        vec!["error:502:provider_relay_failed:openrouter"],
        *events.lock().unwrap()
    );
}

#[tokio::test]
async fn openai_chat_invocation_plugin_cannot_override_selected_provider_account_before_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_and_plugins(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(RecordingRelay::new(Arc::clone(&captured))),
        vec![Arc::new(AccountOverrideInvocationPlugin)],
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::INTERNAL_SERVER_ERROR, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(
        "provider_route_mutation_not_allowed",
        payload["error"]["code"]
    );
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("plugin mutated selected provider route"));

    let captured = captured.lock().unwrap();
    assert!(captured.is_empty());
}

#[tokio::test]
async fn openai_chat_completions_relays_non_stream_request_after_auth_model_and_price_validation() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("chatcmpl-test", payload["id"]);
    assert_eq!("pong", payload["choices"][0]["message"]["content"]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(101, captured[0].api_key_id);
    assert_eq!(10, captured[0].tenant_id);
    assert_eq!(20, captured[0].organization_id);
    assert_eq!(30, captured[0].user_id);
    assert_eq!("standard-group", captured[0].group_code);
    assert_eq!("standard", captured[0].pricing_plan_code);
    assert_eq!("gpt-4o-mini", captured[0].model);
    assert_eq!("openrouter", captured[0].provider_code);
    assert_eq!("gpt-4o-mini", captured[0].provider_model);
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        captured[0].provider_base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter/account/main"),
        captured[0].provider_secret_ref.as_deref()
    );
    assert_eq!(Some(30_000), captured[0].provider_timeout_ms);
    assert_eq!(
        Some(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
        captured[0].provider_retry_policy
    );
    assert_eq!("ping", captured[0].request_body["messages"][0]["content"]);
}

#[tokio::test]
async fn openai_chat_completions_carries_channel_retry_policy_to_non_stream_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        relay,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("openrouter", captured[0].provider_code);
    assert_eq!(Some(30_000), captured[0].provider_timeout_ms);
    assert_eq!(
        Some(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
        captured[0].provider_retry_policy
    );
}

#[tokio::test]
async fn openai_chat_completions_records_non_stream_usage_after_provider_success() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let relay_captured = Arc::new(Mutex::new(Vec::new()));
    let usage_captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&relay_captured)));
    let recorder = Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_captured)));
    let router =
        sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_and_usage_recorder(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            relay,
            recorder,
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-chat-usage-1")
                .header("x-trace-id", "trace-chat-usage-1")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());

    let captured = usage_captured.lock().unwrap();
    assert_eq!(1, captured.len());
    let command = &captured[0];
    assert_server_generated_request_id(&command.request_id, "req-chat-usage-1");
    assert_eq!(Some("trace-chat-usage-1"), command.trace_id.as_deref());
    assert_eq!(10, command.tenant_id);
    assert_eq!(20, command.organization_id);
    assert_eq!(30, command.user_id);
    assert_eq!(101, command.api_key_id);
    assert_eq!(10, command.channel_group_id);
    assert_eq!("standard-group", command.channel_group_snapshot);
    assert_eq!("sk-live", command.api_key_name_snapshot);
    assert_eq!("openai/gpt-4o-mini", command.catalog_key);
    assert_eq!("gpt-4o-mini", command.requested_model);
    assert_eq!("openai/gpt-4o-mini", command.requested_model_catalog_key);
    assert_eq!("openrouter", command.provider_code);
    assert_eq!(3001, command.channel_id);
    assert_eq!("gpt-4o-mini", command.provider_model);
    assert_eq!("gpt-4o-mini", command.provider_native_model);
    assert_eq!("/v1/chat/completions", command.request_path);
    assert_eq!("POST", command.http_method);
    assert_eq!(200, command.http_status);
    assert!(!command.streaming);
    assert_eq!(1, command.prompt_tokens);
    assert_eq!(1, command.completion_tokens);
    assert_eq!(0, command.cached_tokens);
    assert_eq!(2, command.total_tokens);
    assert_eq!("0.198000", command.base_input_unit_price);
    assert_eq!("0.792000", command.base_output_unit_price);
    assert_eq!("0.099000", command.cache_read_unit_price);
    assert_eq!("1.000000", command.rate_multiplier);
    assert_eq!("1.320000", command.reference_multiplier);
    assert_eq!("0.000000750000", command.official_reference_amount);
    assert_eq!("0.000000990000", command.customer_charge_amount);
    assert_eq!("0.000000550000", command.upstream_cost_amount);
    assert_eq!("USD", command.currency);
    assert_eq!("standard", command.pricing_plan_code);
    let pricing_snapshot: serde_json::Value =
        serde_json::from_str(&command.pricing_snapshot).unwrap();
    assert_eq!(
        "openai",
        pricing_snapshot["vendor"]["code"].as_str().unwrap()
    );
    assert_eq!(
        "openai/gpt-4o-mini",
        pricing_snapshot["model"]["catalogKey"].as_str().unwrap()
    );
    assert_eq!(
        "0.198000",
        pricing_snapshot["meters"]["input"]["customerUnitPrice"]
            .as_str()
            .unwrap()
    );
}

#[tokio::test]
async fn openai_chat_completions_records_spend_per_million_with_cache_read_price() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let usage_captured = Arc::new(Mutex::new(Vec::new()));
    let recorder = Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_captured)));
    let router =
        sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_and_usage_recorder(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            Arc::new(CachedUsageRelay),
            recorder,
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-chat-cached-usage")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());

    let captured = usage_captured.lock().unwrap();
    assert_eq!(1, captured.len());
    let command = &captured[0];
    assert_eq!(1_000_000, command.prompt_tokens);
    assert_eq!(250_000, command.cached_tokens);
    assert_eq!(500_000, command.completion_tokens);
    assert_eq!("0.198000", command.base_input_unit_price);
    assert_eq!("0.099000", command.cache_read_unit_price);
    assert_eq!("0.792000", command.base_output_unit_price);
    assert_eq!("0.569250000000", command.customer_charge_amount);
    assert_eq!("0.316250000000", command.upstream_cost_amount);
}

#[tokio::test]
async fn openai_chat_completions_records_usage_even_when_after_relay_observer_fails() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let usage_captured = Arc::new(Mutex::new(Vec::new()));
    let events = Arc::new(Mutex::new(Vec::new()));
    let recorder = Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_and_usage_recorder_and_plugins(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(RecordingRelay::new(Arc::new(Mutex::new(Vec::new())))),
        recorder,
        vec![Arc::new(FailingAfterRelayInvocationPlugin::new(Arc::clone(&events)))],
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-chat-after-relay-observer-fails")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        vec!["after_relay_failed:200", "observed_error:monitoring_failed"],
        *events.lock().unwrap()
    );
    let captured = usage_captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_server_generated_request_id(
        &captured[0].request_id,
        "req-chat-after-relay-observer-fails",
    );
    assert_eq!("0.000000990000", captured[0].customer_charge_amount);
}

#[tokio::test]
async fn openai_chat_completions_rejects_usage_recording_when_success_response_omits_usage() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let usage_captured = Arc::new(Mutex::new(Vec::new()));
    let recorder = Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_captured)));
    let router =
        sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_and_usage_recorder(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            Arc::new(MissingUsageRelay),
            recorder,
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_GATEWAY, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(
        "provider_usage_record_failed",
        payload["error"]["code"].as_str().unwrap()
    );
    assert!(usage_captured.lock().unwrap().is_empty());
}

#[tokio::test]
async fn openai_chat_completions_relays_stream_request_after_auth_model_and_price_validation() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let stream_relay = Arc::new(RecordingStreamRelay::new(Arc::clone(&captured)));
    let router =
        sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_streaming_relay(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            stream_relay,
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        Some("text/event-stream"),
        response
            .headers()
            .get("content-type")
            .and_then(|value| value.to_str().ok())
    );
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();

    assert!(body.contains("data: "));
    assert!(body.contains("chatcmpl-stream"));
    assert!(body.contains("data: [DONE]"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(101, captured[0].api_key_id);
    assert_eq!("standard-group", captured[0].group_code);
    assert_eq!("openrouter", captured[0].provider_code);
    assert_eq!("gpt-4o-mini", captured[0].provider_model);
    assert_eq!(Some(30_000), captured[0].provider_timeout_ms);
    assert_eq!(true, captured[0].request_body["stream"]);
    assert_eq!("ping", captured[0].request_body["messages"][0]["content"]);
}

#[tokio::test]
async fn openai_chat_completions_records_failed_provider_status_trace_without_usage_fact() {
    let hasher = HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap();
    let key_hash = hasher.hash_secret("sk-live").unwrap();
    let catalog = Arc::new(catalog_with_hashed_api_key(key_hash));
    let usage_captured = Arc::new(Mutex::new(Vec::new()));
    let trace_captured = Arc::new(Mutex::new(Vec::new()));
    let recorder = Arc::new(RecordingUsageRecorder::with_traces(
        Arc::clone(&usage_captured),
        Arc::clone(&trace_captured),
    ));
    let router =
        sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay_and_usage_recorder(
            catalog,
            Arc::new(hasher),
            Arc::new(RetryableStatusPrimaryRelay::new(
                Arc::new(Mutex::new(Vec::new())),
                "openrouter",
            )),
            recorder,
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live")
                .header("x-request-id", "req-chat-upstream-503")
                .header("x-trace-id", "trace-chat-upstream-503")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    assert!(usage_captured.lock().unwrap().is_empty());
    let traces = trace_captured.lock().unwrap();
    assert_eq!(1, traces.len());
    let trace = &traces[0];
    assert_server_generated_request_id(&trace.request_id, "req-chat-upstream-503");
    assert_eq!(Some("trace-chat-upstream-503"), trace.trace_id.as_deref());
    assert_eq!(10, trace.tenant_id);
    assert_eq!(20, trace.organization_id);
    assert_eq!(30, trace.user_id);
    assert_eq!(101, trace.api_key_id);
    assert_eq!("standard-group", trace.channel_group_snapshot);
    assert_eq!("gpt-4o-mini", trace.requested_model);
    assert_eq!("openai/gpt-4o-mini", trace.requested_model_catalog_key);
    assert_eq!("openrouter", trace.provider_code);
    assert_eq!(3001, trace.channel_id);
    assert_eq!("gpt-4o-mini", trace.provider_model);
    assert_eq!("gpt-4o-mini", trace.provider_native_model);
    assert_eq!(Some(503), trace.http_status);
    assert_eq!(Some("overloaded"), trace.provider_error_code.as_deref());
    assert_eq!(Some("server_error"), trace.error_type.as_deref());
    assert_eq!(
        Some("upstream overloaded"),
        trace.error_message_masked.as_deref()
    );
    assert_eq!(0, trace.total_tokens);
    assert!(!trace.streaming);
    assert!(trace.latency_ms.is_some_and(|value| value >= 1));
}

#[tokio::test]
async fn openai_chat_completions_records_stream_usage_after_provider_success() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let relay_captured = Arc::new(Mutex::new(Vec::new()));
    let usage_captured = Arc::new(Mutex::new(Vec::new()));
    let stream_relay = Arc::new(RecordingStreamRelay::new(Arc::clone(&relay_captured)));
    let recorder = Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_captured)));
    let router =
        sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relays_and_usage_recorder(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            Arc::new(RecordingRelay::new(Arc::new(Mutex::new(Vec::new())))),
            stream_relay,
            recorder,
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-chat-stream-usage-1")
                .header("x-trace-id", "trace-chat-stream-usage-1")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(body.contains("chatcmpl-stream"));

    let captured = usage_captured.lock().unwrap();
    assert_eq!(1, captured.len());
    let command = &captured[0];
    assert_server_generated_request_id(&command.request_id, "req-chat-stream-usage-1");
    assert_eq!(
        Some("trace-chat-stream-usage-1"),
        command.trace_id.as_deref()
    );
    assert!(command.streaming);
    assert_eq!(1, command.prompt_tokens);
    assert_eq!(1, command.completion_tokens);
    assert_eq!(2, command.total_tokens);
    assert_eq!("0.000000990000", command.customer_charge_amount);
    assert_eq!("0.000000550000", command.upstream_cost_amount);
}

#[tokio::test]
async fn openai_chat_completions_records_stream_usage_from_crlf_sse_events() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let relay_captured = Arc::new(Mutex::new(Vec::new()));
    let usage_captured = Arc::new(Mutex::new(Vec::new()));
    let stream_relay = Arc::new(RecordingStreamRelay::with_body(
        Arc::clone(&relay_captured),
        "data: {\"id\":\"chatcmpl-stream-crlf\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\r\n\r\ndata: {\"id\":\"chatcmpl-stream-crlf\",\"choices\":[],\"usage\":{\"prompt_tokens\":3,\"completion_tokens\":5,\"total_tokens\":8}}\r\n\r\ndata: [DONE]\r\n\r\n",
    ));
    let recorder = Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_captured)));
    let router =
        sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relays_and_usage_recorder(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            Arc::new(RecordingRelay::new(Arc::new(Mutex::new(Vec::new())))),
            stream_relay,
            recorder,
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-chat-stream-usage-crlf-1")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(body.contains("chatcmpl-stream-crlf"));

    let captured = usage_captured.lock().unwrap();
    assert_eq!(1, captured.len());
    let command = &captured[0];
    assert_server_generated_request_id(&command.request_id, "req-chat-stream-usage-crlf-1");
    assert!(command.streaming);
    assert_eq!(3, command.prompt_tokens);
    assert_eq!(5, command.completion_tokens);
    assert_eq!(8, command.total_tokens);
    assert_eq!("0.000004554000", command.customer_charge_amount);
    assert_eq!("0.000002530000", command.upstream_cost_amount);
}

#[tokio::test]
async fn openai_chat_completions_records_zero_token_usage_when_stream_provider_omits_usage() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let relay_captured = Arc::new(Mutex::new(Vec::new()));
    let usage_captured = Arc::new(Mutex::new(Vec::new()));
    let trace_captured = Arc::new(Mutex::new(Vec::new()));
    let stream_relay = Arc::new(RecordingStreamRelay::with_body(
        Arc::clone(&relay_captured),
        "data: {\"id\":\"chatcmpl-stream-missing-usage\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\ndata: [DONE]\n\n",
    ));
    let recorder = Arc::new(RecordingUsageRecorder::with_traces(
        Arc::clone(&usage_captured),
        Arc::clone(&trace_captured),
    ));
    let router =
        sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relays_and_usage_recorder(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            Arc::new(RecordingRelay::new(Arc::new(Mutex::new(Vec::new())))),
            stream_relay,
            recorder,
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-chat-stream-missing-usage-1")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(body.contains("chatcmpl-stream-missing-usage"), "{body}");
    assert!(body.ends_with("data: [DONE]\n\n"), "{body}");

    let captured = usage_captured.lock().unwrap();
    assert_eq!(1, captured.len());
    let command = &captured[0];
    assert_server_generated_request_id(&command.request_id, "req-chat-stream-missing-usage-1");
    assert!(command.streaming);
    assert_eq!("llm_input_token", command.billing_meter_code);
    assert_eq!("0", command.billable_quantity);
    assert_eq!(1, command.request_count);
    assert_eq!(0, command.prompt_tokens);
    assert_eq!(0, command.completion_tokens);
    assert_eq!(0, command.cached_tokens);
    assert_eq!(0, command.total_tokens);
    assert_eq!("0.000000000000", command.customer_charge_amount);
    assert_eq!("0.000000000000", command.upstream_cost_amount);

    let traces = trace_captured.lock().unwrap();
    assert!(traces.is_empty());
}

#[tokio::test]
async fn openai_chat_completions_treats_stream_missing_usage_as_success_for_plugins() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let relay_captured = Arc::new(Mutex::new(Vec::new()));
    let usage_captured = Arc::new(Mutex::new(Vec::new()));
    let trace_captured = Arc::new(Mutex::new(Vec::new()));
    let events = Arc::new(Mutex::new(Vec::new()));
    let stream_relay = Arc::new(RecordingStreamRelay::with_body(
        Arc::clone(&relay_captured),
        "data: {\"id\":\"chatcmpl-stream-missing-usage\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\ndata: [DONE]\n\n",
    ));
    let recorder = Arc::new(RecordingUsageRecorder::with_traces(
        Arc::clone(&usage_captured),
        Arc::clone(&trace_captured),
    ));
    let router =
        sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relays_and_usage_recorder_and_plugins(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            Arc::new(RecordingRelay::new(Arc::new(Mutex::new(Vec::new())))),
            stream_relay,
            recorder,
            vec![Arc::new(RecordingInvocationPlugin::new(Arc::clone(&events)))],
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-chat-stream-missing-usage-plugin")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(body.contains("chatcmpl-stream-missing-usage"), "{body}");
    assert_eq!(1, usage_captured.lock().unwrap().len());
    assert!(trace_captured.lock().unwrap().is_empty());

    let events = events.lock().unwrap();
    assert!(events.contains(&"route_success:openrouter:200".to_owned()));
    assert!(events.contains(&"after_relay:200".to_owned()));
    assert!(!events
        .iter()
        .any(|event| event.starts_with("route_fault:openrouter:")));
}
