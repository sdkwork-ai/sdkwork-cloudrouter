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
    ResponsesRelay, ResponsesRelayRequest, ResponsesRelayResponse,
};
use tower::ServiceExt;

fn catalog_with_hashed_api_key(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(
        AiModel::new(
            "gpt-4.1-mini",
            "GPT-4.1 mini",
            "openai",
            vec!["responses", "tools"],
        )
        .with_catalog_key("openai/gpt-4.1-mini"),
    );
    catalog.add_provider_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4.1-mini",
            "gpt-4.1-mini",
            "openrouter",
            3001,
            "openai/gpt-4.1-mini",
        )
        .with_upstream_endpoint(
            Some("http://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/responses"),
        )
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_upstream_endpoint(
                Some("http://provider-proxy.internal/openrouter"),
                Some("vault://providers/openrouter/account/responses"),
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
        "openai/gpt-4.1-mini",
        "gpt-4.1-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("0.150000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4.1-mini",
            "gpt-4.1-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.110000").unwrap(),
        )
        .for_provider("openrouter", 3001),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4.1-mini",
        "gpt-4.1-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmOutputToken,
        Money::usd("0.600000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4.1-mini",
            "gpt-4.1-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmOutputToken,
            Money::usd("0.440000").unwrap(),
        )
        .for_provider("openrouter", 3001),
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9001,
            10,
            20,
            "standard-group-responses-policy",
            RoutingPolicyScope::UpstreamAccountGroup,
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
            "standard-group-gpt-4-1-mini",
            1,
            r#"{"catalogKey":"openai/gpt-4.1-mini"}"#,
            "openai/gpt-4.1-mini",
        )
        .with_candidate_account_groups(vec![RouteCandidate::new(3001, 100)]),
    );
    catalog
}

#[derive(Debug)]
struct GatewayRecordingResponsesRelay {
    captured: Arc<Mutex<Vec<ResponsesRelayRequest>>>,
}

impl GatewayRecordingResponsesRelay {
    fn new(captured: Arc<Mutex<Vec<ResponsesRelayRequest>>>) -> Self {
        Self { captured }
    }
}

impl ResponsesRelay for GatewayRecordingResponsesRelay {
    fn create_response<'a>(
        &'a self,
        request: ResponsesRelayRequest,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = DomainResult<ResponsesRelayResponse>> + Send + 'a>,
    > {
        self.captured.lock().unwrap().push(request);
        Box::pin(async {
            Ok(ResponsesRelayResponse::json(
                200,
                serde_json::json!({
                    "id": "resp-gateway",
                    "object": "response",
                    "model": "gpt-4.1-mini",
                    "output": [
                        {
                            "type": "message",
                            "role": "assistant",
                            "content": [{"type": "output_text", "text": "gateway-pong"}]
                        }
                    ],
                    "usage": {"input_tokens": 1, "output_tokens": 1, "total_tokens": 2}
                }),
            ))
        })
    }
}

#[tokio::test]
async fn gateway_can_mount_non_stream_responses_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(GatewayRecordingResponsesRelay::new(Arc::clone(&captured)));
    let router =
        sdkwork_clawrouter_edge_runtime::router_with_product_catalog_api_key_hasher_and_responses_relay(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            relay,
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/responses")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-4.1-mini","input":"ping"}"#))
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

    assert_eq!("resp-gateway", payload["id"]);
    assert_eq!("gateway-pong", payload["output"][0]["content"][0]["text"]);
    assert_eq!("openrouter", captured.lock().unwrap()[0].supplier_code);
}
