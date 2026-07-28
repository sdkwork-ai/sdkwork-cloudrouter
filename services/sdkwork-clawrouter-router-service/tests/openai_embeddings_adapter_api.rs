use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, Request, StatusCode};
use axum::response::IntoResponse;
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_claw_provider_adapter_contract::{
    AdapterEndpointRuntimeState, AdapterInvocationRequest, AdapterInvocationResponse,
    AdapterInvocationShape, AdapterKind, AdapterRouteStatus, AdapterSecret,
};
use sdkwork_claw_provider_adapter_registry::{ProviderAdapterRegistry, ProviderAdapterRouteConfig};
use sdkwork_clawrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, RouteCandidate,
    RoutingCapability, RoutingPolicy, RoutingPolicyScope, RoutingRule, UpstreamAccountGroup,
    UpstreamAccountRoute,
};
use sdkwork_clawrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::infrastructure::provider::ProviderSecretMapResolver;
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_clawrouter_router_service::ports::{EmbeddingsRelay, EmbeddingsRelayRequest};
use serde_json::json;
use tower::ServiceExt;

#[derive(Debug)]
struct RecordingEmbeddingsRelay {
    captured: Arc<Mutex<Vec<EmbeddingsRelayRequest>>>,
}

impl EmbeddingsRelay for RecordingEmbeddingsRelay {
    fn create_embedding<'a>(
        &'a self,
        request: EmbeddingsRelayRequest,
    ) -> sdkwork_clawrouter_router_service::ports::EmbeddingsRelayFuture<'a> {
        self.captured.lock().unwrap().push(request);
        Box::pin(async {
            Ok(
                sdkwork_clawrouter_router_service::ports::EmbeddingsRelayResponse::json(
                    200,
                    json!({
                        "object": "list",
                        "data": [{"object": "embedding", "index": 0, "embedding": [0.1, 0.2, 0.3]}],
                        "usage": {"prompt_tokens": 1, "total_tokens": 1}
                    }),
                ),
            )
        })
    }
}

#[derive(Debug, Clone)]
struct FakeAdapterServer {
    base_url: String,
    calls: Arc<Mutex<Vec<AdapterInvocationRequest>>>,
}

fn provider_secret_resolver(
    secret_ref: &str,
    secret_value: &str,
) -> Arc<ProviderSecretMapResolver> {
    let mut secrets = BTreeMap::new();
    secrets.insert(secret_ref.to_owned(), secret_value.to_owned());
    Arc::new(ProviderSecretMapResolver::from_managed_secrets(secrets))
}

fn assert_gateway_resolved_secret(secret: &AdapterSecret, expected_value: &str) {
    let AdapterSecret::GatewayResolved(payload) = secret else {
        panic!("expected gateway resolved adapter secret, got {secret:?}");
    };
    assert_eq!("bearer", payload["auth"]["type"]);
    assert_eq!(expected_value, payload["auth"]["value"]);
    assert_eq!(serde_json::Value::Null, payload["auth"]["name"]);
    assert!(payload["defaultHeaders"]
        .as_array()
        .expect("defaultHeaders must be an array")
        .is_empty());
    assert!(!serde_json::to_string(secret)
        .unwrap()
        .contains("vault://providers/openrouter/account/embedding"));
}

#[tokio::test]
async fn openai_embeddings_registry_hit_calls_internal_adapter_without_direct_relay() {
    let fake_adapter = spawn_fake_adapter_server().await;
    let direct_calls = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingEmbeddingsRelay {
        captured: Arc::clone(&direct_calls),
    });
    let adapter_relay =
        sdkwork_clawrouter_router_service::infrastructure::provider::AdapterAwareEmbeddingsRelay::new(
            relay,
            Arc::new(ProviderAdapterRegistry::new(vec![adapter_route(
                fake_adapter.base_url.as_str(),
            )])),
            sdkwork_claw_provider_adapter_http::ProviderAdapterHttpClient::for_development("test-token"),
        )
        .with_secret_resolver(provider_secret_resolver(
            "vault://providers/openrouter/account/embedding",
            "sk-openrouter-embedding",
        ));
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_embeddings_router_with_relay(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(adapter_relay),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"text-embedding-3-small","input":"hello"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert!(direct_calls.lock().unwrap().is_empty());
    let adapter_calls = fake_adapter.calls.lock().unwrap();
    assert_eq!(1, adapter_calls.len());
    let adapter_call = &adapter_calls[0];
    assert_eq!("openai.embeddings", adapter_call.invocation.endpoint_key);
    assert_eq!("/v1/embeddings", adapter_call.invocation.standard_path);
    assert_eq!(
        AdapterInvocationShape::SyncJson,
        adapter_call.invocation.shape
    );
    assert_eq!("openrouter", adapter_call.provider.supplier_code);
    assert_eq!(3001, adapter_call.provider.account_id);
    assert_eq!(
        "text-embedding-3-small",
        adapter_call.provider.provider_model
    );
    assert_gateway_resolved_secret(&adapter_call.secret, "sk-openrouter-embedding");
    drop(adapter_calls);
    let payload = response_json(response).await;
    assert_eq!("list", payload["object"]);
}

#[tokio::test]
async fn openai_embeddings_registry_miss_calls_existing_direct_relay() {
    let direct_calls = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingEmbeddingsRelay {
        captured: Arc::clone(&direct_calls),
    });
    let adapter_relay =
        sdkwork_clawrouter_router_service::infrastructure::provider::AdapterAwareEmbeddingsRelay::new(
            relay,
            Arc::new(ProviderAdapterRegistry::default()),
            sdkwork_claw_provider_adapter_http::ProviderAdapterHttpClient::for_development("test-token"),
        );
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_embeddings_router_with_relay(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(adapter_relay),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"text-embedding-3-small","input":"hello"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(1, direct_calls.lock().unwrap().len());
    let payload = response_json(response).await;
    assert_eq!("list", payload["object"]);
}

fn adapter_route(base_url: &str) -> ProviderAdapterRouteConfig {
    ProviderAdapterRouteConfig {
        supplier_code: "openrouter".to_owned(),
        adapter_kind: AdapterKind::InternalHttp,
        adapter_base_url: base_url.to_owned(),
        capability: Some("embeddings".to_owned()),
        endpoint_key: Some("openai.embeddings".to_owned()),
        service_group: None,
        openapi_operation_id: None,
        s3_operation: None,
        iaas_operation: None,
        endpoint_styles: Vec::new(),
        runtime_state: AdapterEndpointRuntimeState::RuntimeAvailable,
        method: "POST".to_owned(),
        invocation_shape: AdapterInvocationShape::SyncJson,
        standard_path_pattern: "/v1/embeddings".to_owned(),
        adapter_path_template: "/providers/{supplier_code}{standard_path}".to_owned(),
        status: AdapterRouteStatus::Enabled,
        priority: 10,
    }
}

async fn spawn_fake_adapter_server() -> FakeAdapterServer {
    let calls = Arc::new(Mutex::new(Vec::new()));
    let app = Router::new()
        .route(
            "/providers/openrouter/v1/embeddings",
            post(capture_adapter_invocation),
        )
        .with_state(Arc::clone(&calls));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    FakeAdapterServer {
        base_url: format!("http://{addr}"),
        calls,
    }
}

async fn capture_adapter_invocation(
    State(calls): State<Arc<Mutex<Vec<AdapterInvocationRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<AdapterInvocationRequest>,
) -> impl IntoResponse {
    assert_eq!(
        Some("Bearer test-token"),
        headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
    );
    calls.lock().unwrap().push(body);
    Json(AdapterInvocationResponse::json(
        200,
        json!({
            "object": "list",
            "data": [{"object": "embedding", "index": 0, "embedding": [0.3, 0.2, 0.1]}],
            "usage": {"prompt_tokens": 1, "total_tokens": 1}
        }),
    ))
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

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
            "text-embedding-3-small",
        )
        .with_upstream_endpoint(
            Some("http://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/embedding"),
        ),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001).with_upstream_endpoint(
            Some("http://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/embedding"),
        ),
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
        .for_upstream_account("openrouter", 3001),
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
