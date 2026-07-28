use std::sync::Arc;
use std::sync::Mutex;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_clawrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, UpstreamAccountGroup, DecimalValue, DomainResult, GatewayApiKey, ModelPrice,
    ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    UpstreamAccountRoute, ProviderRetryPolicy, RouteCandidate, RoutingCapability, RoutingPolicy,
    RoutingPolicyScope, RoutingRule,
};
use sdkwork_clawrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_clawrouter_router_service::ports::{
    ChatCompletionRelay, ChatCompletionRelayRequest, ChatCompletionRelayResponse,
    ChatCompletionStreamRelay, ChatCompletionStreamRelayResponse,
};
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
    catalog.add_provider_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter",
            3001,
            "openai/gpt-4o-mini",
        )
        .with_upstream_endpoint(
            Some("http://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/main"),
        )
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_upstream_endpoint(
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
    catalog.add_upstream_account_group(UpstreamAccountGroup::new(
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
        .for_upstream_account("openrouter", 3001),
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
        .for_upstream_account("openrouter", 3001),
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
    account_id: i64,
) {
    catalog.add_routing_policy(
        RoutingPolicy::new(
            policy_id,
            10,
            20,
            &format!("{rule_code}-policy"),
            RoutingPolicyScope::UpstreamAccountGroup,
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
        .with_candidate_account_groups(vec![RouteCandidate::new(account_id, 100)]),
    );
}

#[derive(Debug)]
struct GatewayRecordingRelay {
    captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
}

impl GatewayRecordingRelay {
    fn new(captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>) -> Self {
        Self { captured }
    }
}

impl ChatCompletionRelay for GatewayRecordingRelay {
    fn create_chat_completion<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<Output = DomainResult<ChatCompletionRelayResponse>> + Send + 'a,
        >,
    > {
        self.captured.lock().unwrap().push(request);
        Box::pin(async {
            Ok(ChatCompletionRelayResponse::json(
                200,
                serde_json::json!({
                    "id": "chatcmpl-gateway",
                    "object": "chat.completion",
                    "model": "gpt-4o-mini",
                    "choices": [
                        {
                            "index": 0,
                            "message": {"role": "assistant", "content": "gateway-pong"},
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
struct GatewayRecordingStreamRelay {
    captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
}

impl GatewayRecordingStreamRelay {
    fn new(captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>) -> Self {
        Self { captured }
    }
}

impl ChatCompletionStreamRelay for GatewayRecordingStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<Output = DomainResult<ChatCompletionStreamRelayResponse>>
                + Send
                + 'a,
        >,
    > {
        self.captured.lock().unwrap().push(request);
        Box::pin(async {
            Ok(ChatCompletionStreamRelayResponse::new(
                200,
                Some("text/event-stream".to_owned()),
                axum::body::Body::from(
                    "data: {\"id\":\"chatcmpl-gateway-stream\",\"choices\":[{\"delta\":{\"content\":\"gateway-pong\"}}]}\n\ndata: {\"id\":\"chatcmpl-gateway-stream\",\"choices\":[],\"usage\":{\"prompt_tokens\":1,\"completion_tokens\":1,\"total_tokens\":2}}\n\ndata: [DONE]\n\n",
                ),
            ))
        })
    }
}

#[tokio::test]
async fn gateway_can_mount_non_stream_chat_completion_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(GatewayRecordingRelay::new(Arc::clone(&captured)));
    let router =
        sdkwork_clawrouter_edge_runtime::router_with_product_catalog_api_key_hasher_and_chat_completion_relay(
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

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::OK,
        status,
        "unexpected response body: {}",
        String::from_utf8_lossy(&body)
    );
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("chatcmpl-gateway", payload["id"]);
    assert_eq!("gateway-pong", payload["choices"][0]["message"]["content"]);
    assert_eq!("openrouter", captured.lock().unwrap()[0].supplier_code);
}

#[tokio::test]
async fn gateway_can_mount_streaming_chat_completion_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(GatewayRecordingStreamRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_edge_runtime::router_with_product_catalog_api_key_hasher_and_chat_completion_streaming_relay(
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
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .map(ToOwned::to_owned);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::OK,
        status,
        "unexpected response body: {}",
        String::from_utf8_lossy(&body)
    );
    assert_eq!(Some("text/event-stream"), content_type.as_deref());
    let body = String::from_utf8(body.to_vec()).unwrap();

    assert!(body.contains("chatcmpl-gateway-stream"));
    assert!(body.contains("data: [DONE]"));
    assert_eq!("openrouter", captured.lock().unwrap()[0].supplier_code);
}
