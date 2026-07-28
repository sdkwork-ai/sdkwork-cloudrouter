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
    EmbeddingsRelay, EmbeddingsRelayRequest, EmbeddingsRelayResponse,
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
            "text-embedding-3-small",
            "Text Embedding 3 Small",
            "openai",
            vec!["embedding"],
        )
        .with_catalog_key("openai/text-embedding-3-small"),
    );
    catalog.add_provider_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/text-embedding-3-small",
            "text-embedding-3-small",
            "openrouter",
            3001,
            "openai/text-embedding-3-small",
        )
        .with_upstream_endpoint(
            Some("http://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/embedding"),
        )
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_upstream_endpoint(
                Some("http://provider-proxy.internal/openrouter"),
                Some("vault://providers/openrouter/account/embedding"),
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
        "openai/text-embedding-3-small",
        "text-embedding-3-small",
        PriceSide::OfficialReference,
        BillingMeter::EmbeddingInputToken,
        Money::usd("0.020000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/text-embedding-3-small",
            "text-embedding-3-small",
            PriceSide::UpstreamCost,
            BillingMeter::EmbeddingInputToken,
            Money::usd("0.010000").unwrap(),
        )
        .for_provider("openrouter", 3001),
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9001,
            10,
            20,
            "standard-group-embedding-policy",
            RoutingPolicyScope::UpstreamAccountGroup,
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
            "standard-group-text-embedding-3-small",
            1,
            r#"{"catalogKey":"openai/text-embedding-3-small"}"#,
            "openai/text-embedding-3-small",
        )
        .with_candidate_account_groups(vec![RouteCandidate::new(3001, 100)]),
    );
    catalog
}

#[derive(Debug)]
struct GatewayRecordingEmbeddingsRelay {
    captured: Arc<Mutex<Vec<EmbeddingsRelayRequest>>>,
}

impl GatewayRecordingEmbeddingsRelay {
    fn new(captured: Arc<Mutex<Vec<EmbeddingsRelayRequest>>>) -> Self {
        Self { captured }
    }
}

impl EmbeddingsRelay for GatewayRecordingEmbeddingsRelay {
    fn create_embedding<'a>(
        &'a self,
        request: EmbeddingsRelayRequest,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = DomainResult<EmbeddingsRelayResponse>> + Send + 'a>,
    > {
        self.captured.lock().unwrap().push(request);
        Box::pin(async {
            Ok(EmbeddingsRelayResponse::json(
                200,
                serde_json::json!({
                    "object": "list",
                    "model": "openai/text-embedding-3-small",
                    "data": [
                        {"object": "embedding", "index": 0, "embedding": [0.1, 0.2, 0.3]}
                    ],
                    "usage": {"prompt_tokens": 1, "total_tokens": 1}
                }),
            ))
        })
    }
}

#[tokio::test]
async fn gateway_can_mount_non_stream_embeddings_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(GatewayRecordingEmbeddingsRelay::new(Arc::clone(&captured)));
    let router =
        sdkwork_clawrouter_edge_runtime::router_with_product_catalog_api_key_hasher_and_embeddings_relay(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            relay,
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"text-embedding-3-small","input":["ping"]}"#,
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

    assert_eq!("list", payload["object"]);
    assert_eq!(0.3, payload["data"][0]["embedding"][2]);
    assert_eq!("openrouter", captured.lock().unwrap()[0].supplier_code);
}
