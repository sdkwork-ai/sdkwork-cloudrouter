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
use sdkwork_clawrouter_router_service::ports::{
    ChatCompletionRelay, ChatCompletionRelayRequest, ChatCompletionStreamRelay,
    ChatCompletionStreamRelayResponse,
};
use serde_json::json;
use tower::ServiceExt;

#[derive(Debug)]
struct RecordingRelay {
    captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
}

impl ChatCompletionRelay for RecordingRelay {
    fn create_chat_completion<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> sdkwork_clawrouter_router_service::ports::ChatCompletionRelayFuture<'a> {
        self.captured.lock().unwrap().push(request);
        Box::pin(async {
            Ok(
                sdkwork_clawrouter_router_service::ports::ChatCompletionRelayResponse::json(
                    200,
                    json!({
                        "id": "chatcmpl-direct",
                        "choices": [{"index": 0, "message": {"role": "assistant", "content": "direct"}, "finish_reason": "stop"}],
                        "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}
                    }),
                ),
            )
        })
    }
}

#[derive(Debug)]
struct RecordingStreamRelay {
    captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
}

impl ChatCompletionStreamRelay for RecordingStreamRelay {
    fn create_chat_completion_stream<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> sdkwork_clawrouter_router_service::ports::ChatCompletionStreamRelayFuture<'a> {
        self.captured.lock().unwrap().push(request);
        Box::pin(async {
            Ok(ChatCompletionStreamRelayResponse::new(
                200,
                Some("text/event-stream".to_owned()),
                Body::from(
                    "data: {\"id\":\"chatcmpl-direct-stream\",\"choices\":[{\"delta\":{\"content\":\"direct\"}}]}\n\ndata: [DONE]\n\n",
                ),
            ))
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
        .contains("vault://providers/openrouter/account/main"));
}

#[tokio::test]
async fn openai_chat_registry_hit_calls_internal_adapter_without_direct_relay() {
    let fake_adapter = spawn_fake_adapter_server().await;
    let direct_calls = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay {
        captured: Arc::clone(&direct_calls),
    });
    let adapter_relay =
        sdkwork_clawrouter_router_service::infrastructure::provider::AdapterAwareChatCompletionRelay::new(
            relay,
            Arc::new(ProviderAdapterRegistry::new(vec![adapter_route(
                fake_adapter.base_url.as_str(),
            )])),
            sdkwork_claw_provider_adapter_http::ProviderAdapterHttpClient::for_development("test-token"),
        )
        .with_secret_resolver(provider_secret_resolver(
            "vault://providers/openrouter/account/main",
            "sk-openrouter-main",
        ));
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(adapter_relay),
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
    assert!(direct_calls.lock().unwrap().is_empty());
    {
        let adapter_calls = fake_adapter.calls.lock().unwrap();
        assert_eq!(1, adapter_calls.len());
        let adapter_call = &adapter_calls[0];
        assert_eq!(
            "openai.chat_completions",
            adapter_call.invocation.endpoint_key
        );
        assert_eq!(
            "/v1/chat/completions",
            adapter_call.invocation.standard_path
        );
        assert_eq!(
            AdapterInvocationShape::SyncJson,
            adapter_call.invocation.shape
        );
        assert_eq!("openrouter", adapter_call.provider.supplier_code);
        assert_eq!(3001, adapter_call.provider.account_id);
        assert_eq!("gpt-4o-mini", adapter_call.provider.provider_model);
        assert_gateway_resolved_secret(&adapter_call.secret, "sk-openrouter-main");
    }
    let payload = response_json(response).await;
    assert_eq!("chatcmpl-adapter", payload["id"]);
}

#[tokio::test]
async fn openai_chat_stream_registry_hit_calls_internal_adapter_without_direct_stream_relay() {
    let fake_adapter = spawn_fake_adapter_server().await;
    let direct_chat_calls = Arc::new(Mutex::new(Vec::new()));
    let direct_stream_calls = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay {
        captured: Arc::clone(&direct_chat_calls),
    });
    let stream_relay = Arc::new(RecordingStreamRelay {
        captured: Arc::clone(&direct_stream_calls),
    });
    let adapter_stream_relay =
        sdkwork_clawrouter_router_service::infrastructure::provider::AdapterAwareChatCompletionStreamRelay::new(
            stream_relay,
            Arc::new(ProviderAdapterRegistry::new(vec![adapter_stream_route(
                fake_adapter.base_url.as_str(),
            )])),
            sdkwork_claw_provider_adapter_http::ProviderAdapterHttpClient::for_development("test-token"),
        )
        .with_secret_resolver(provider_secret_resolver(
            "vault://providers/openrouter/account/main",
            "sk-openrouter-main",
        ));
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relays(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        relay,
        Arc::new(adapter_stream_relay),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-standard-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":true,"stream_options":{"include_usage":true}}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert!(direct_chat_calls.lock().unwrap().is_empty());
    assert!(direct_stream_calls.lock().unwrap().is_empty());
    {
        let adapter_calls = fake_adapter.calls.lock().unwrap();
        assert_eq!(1, adapter_calls.len());
        let adapter_call = &adapter_calls[0];
        assert_eq!(
            "openai.chat_completions",
            adapter_call.invocation.endpoint_key
        );
        assert_eq!(
            "/v1/chat/completions",
            adapter_call.invocation.standard_path
        );
        assert_eq!(
            AdapterInvocationShape::SseStream,
            adapter_call.invocation.shape
        );
        assert!(adapter_call.invocation.stream);
        assert_eq!("openrouter", adapter_call.provider.supplier_code);
        assert_eq!(3001, adapter_call.provider.account_id);
        assert_eq!("gpt-4o-mini", adapter_call.provider.provider_model);
        assert_eq!(true, adapter_call.body["stream"]);
        assert_gateway_resolved_secret(&adapter_call.secret, "sk-openrouter-main");
    }
    let body = response_text(response).await;
    assert!(body.contains("chatcmpl-adapter"));
    assert!(body.contains("data: [DONE]"));
}

#[tokio::test]
async fn openai_chat_registry_hit_requires_gateway_secret_resolution() {
    let fake_adapter = spawn_fake_adapter_server().await;
    let direct_calls = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay {
        captured: Arc::clone(&direct_calls),
    });
    let adapter_relay =
        sdkwork_clawrouter_router_service::infrastructure::provider::AdapterAwareChatCompletionRelay::new(
            relay,
            Arc::new(ProviderAdapterRegistry::new(vec![adapter_route(
                fake_adapter.base_url.as_str(),
            )])),
            sdkwork_claw_provider_adapter_http::ProviderAdapterHttpClient::for_development("test-token"),
        );
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(adapter_relay),
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

    assert_eq!(StatusCode::BAD_GATEWAY, response.status());
    assert!(direct_calls.lock().unwrap().is_empty());
    assert!(fake_adapter.calls.lock().unwrap().is_empty());
    let payload = response_json(response).await;
    let error_code = payload["error"]["code"]
        .as_str()
        .expect("OpenAI-compatible error.code must be a string");
    assert_eq!("provider_relay_failed", error_code);
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("provider secret resolver is required"));
}

#[tokio::test]
async fn openai_chat_registry_miss_calls_existing_direct_relay() {
    let direct_calls = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay {
        captured: Arc::clone(&direct_calls),
    });
    let adapter_relay =
        sdkwork_clawrouter_router_service::infrastructure::provider::AdapterAwareChatCompletionRelay::new(
            relay,
            Arc::new(ProviderAdapterRegistry::default()),
            sdkwork_claw_provider_adapter_http::ProviderAdapterHttpClient::for_development("test-token"),
        );
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-standard-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_chat_completions_router_with_relay(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(adapter_relay),
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
    assert_eq!(1, direct_calls.lock().unwrap().len());
    let payload = response_json(response).await;
    assert_eq!("chatcmpl-direct", payload["id"]);
}

fn adapter_route(base_url: &str) -> ProviderAdapterRouteConfig {
    ProviderAdapterRouteConfig {
        supplier_code: "openrouter".to_owned(),
        adapter_kind: AdapterKind::InternalHttp,
        adapter_base_url: base_url.to_owned(),
        capability: Some("chat".to_owned()),
        endpoint_key: Some("openai.chat_completions".to_owned()),
        service_group: None,
        openapi_operation_id: None,
        s3_operation: None,
        iaas_operation: None,
        endpoint_styles: Vec::new(),
        runtime_state: AdapterEndpointRuntimeState::RuntimeAvailable,
        method: "POST".to_owned(),
        invocation_shape: AdapterInvocationShape::SyncJson,
        standard_path_pattern: "/v1/chat/completions".to_owned(),
        adapter_path_template: "/providers/{supplier_code}{standard_path}".to_owned(),
        status: AdapterRouteStatus::Enabled,
        priority: 10,
    }
}

fn adapter_stream_route(base_url: &str) -> ProviderAdapterRouteConfig {
    let mut route = adapter_route(base_url);
    route.invocation_shape = AdapterInvocationShape::SseStream;
    route
}

async fn spawn_fake_adapter_server() -> FakeAdapterServer {
    let calls = Arc::new(Mutex::new(Vec::new()));
    let app = Router::new()
        .route(
            "/providers/openrouter/v1/chat/completions",
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
            "id": "chatcmpl-adapter",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": "adapter"}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}
        }),
    ))
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

async fn response_text(response: axum::response::Response) -> String {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    String::from_utf8(bytes.to_vec()).unwrap()
}

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
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter",
            3001,
            "gpt-4o-mini",
        )
        .with_upstream_endpoint(
            Some("http://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/main"),
        ),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_upstream_endpoint(
                Some("http://provider-proxy.internal/openrouter"),
                Some("vault://providers/openrouter/account/main"),
            )
            .with_account_group_binding(10, 100, 100),
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
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9001,
            10,
            20,
            "standard-group-gpt-4o-mini-policy",
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
            "standard-group-gpt-4o-mini",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_account_groups(vec![RouteCandidate::new(10, 100)]),
    );
    catalog
}
