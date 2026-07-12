use std::sync::Arc;
use std::sync::Mutex;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_claw_test_support::assert_server_generated_request_id;
use sdkwork_clawrouter_router_service::api::{
    OpenAiInvocationContext, OpenAiInvocationPlugin, OpenAiInvocationPluginFuture,
    OpenAiInvocationRelayOutcome, OpenAiProviderRoute,
};
use sdkwork_clawrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, ChannelGroup, DecimalValue, DomainResult, GatewayApiKey, ModelPrice,
    ModelProviderRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    ProviderAuthProfile, ProviderChannelRoute, ProviderRetryPolicy, RouteCandidate,
    RoutingCapability, RoutingPolicy, RoutingPolicyScope, RoutingRule,
};
use sdkwork_clawrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_clawrouter_router_service::ports::{
    EmbeddingsRelay, EmbeddingsRelayRequest, EmbeddingsRelayResponse, GatewayUsageRecordCommand,
    GatewayUsageRecorder,
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
        ModelProviderRoute::new_for_catalog_key(
            "openai/text-embedding-3-small",
            "text-embedding-3-small",
            "openrouter",
            3001,
            "text-embedding-3-small",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/embedding"),
        )
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3001)
            .with_provider_endpoint(
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
    catalog.add_channel_group(ChannelGroup::new(
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
            "standard-group-text-embedding-3-small",
            1,
            r#"{"catalogKey":"openai/text-embedding-3-small"}"#,
            "openai/text-embedding-3-small",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)]),
    );
    catalog
}

fn catalog_with_hashed_api_key_missing_billing_subject(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = catalog_with_hashed_api_key(key_hash.clone());
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash));
    catalog
}

fn catalog_with_embeddings_fallback_route(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = catalog_with_hashed_api_key(key_hash);
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/text-embedding-3-small",
            "text-embedding-3-small",
            "openrouter-fallback",
            3002,
            "text-embedding-3-small-fallback",
        )
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/embedding-fallback"),
        )
        .with_timeout_ms(20_000)
        .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-fallback", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-fallback"),
                Some("vault://providers/openrouter/account/embedding-fallback"),
            )
            .with_timeout_ms(20_000)
            .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/text-embedding-3-small",
            "text-embedding-3-small",
            PriceSide::UpstreamCost,
            BillingMeter::EmbeddingInputToken,
            Money::usd("0.012000").unwrap(),
        )
        .for_provider("openrouter-fallback", 3002),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9100,
            10,
            20,
            9101,
            "standard-group-text-embedding-3-small-failover",
            0,
            r#"{"catalogKey":"openai/text-embedding-3-small"}"#,
            "openai/text-embedding-3-small",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)])
        .with_fallback_chain(vec![RouteCandidate::new(3002, 50)]),
    );
    catalog
}

#[tokio::test]
async fn openai_embeddings_authenticates_validates_price_and_returns_honest_not_implemented() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_embeddings_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"text-embedding-3-small","input":"hello"}"#,
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
        "embedding_relay_not_configured",
        payload["error"]["code"].as_str().unwrap()
    );
    assert_eq!("server_error", payload["error"]["type"]);
    assert!(!body.contains("sk-live-secret"));
}

#[tokio::test]
async fn openai_embeddings_rejects_api_key_without_billing_subject_before_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingEmbeddingsRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_embeddings_router_with_relay(
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
                .uri("/v1/embeddings")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"text-embedding-3-small","input":"hello"}"#,
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
async fn openai_embeddings_rejects_unknown_model_after_authentication() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_embeddings_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"missing-embedding","input":"hello"}"#,
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

#[derive(Debug)]
struct RecordingEmbeddingsRelay {
    captured: Arc<std::sync::Mutex<Vec<EmbeddingsRelayRequest>>>,
}

impl RecordingEmbeddingsRelay {
    fn new(captured: Arc<std::sync::Mutex<Vec<EmbeddingsRelayRequest>>>) -> Self {
        Self { captured }
    }
}

impl EmbeddingsRelay for RecordingEmbeddingsRelay {
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
                    "model": "text-embedding-3-small",
                    "data": [
                        {
                            "object": "embedding",
                            "index": 0,
                            "embedding": [0.1, 0.2, 0.3]
                        }
                    ],
                    "usage": {"prompt_tokens": 1, "total_tokens": 1}
                }),
            ))
        })
    }
}

#[derive(Debug)]
struct RetryableStatusPrimaryEmbeddingsRelay {
    captured: Arc<std::sync::Mutex<Vec<EmbeddingsRelayRequest>>>,
    failing_provider_code: &'static str,
}

impl RetryableStatusPrimaryEmbeddingsRelay {
    fn new(
        captured: Arc<std::sync::Mutex<Vec<EmbeddingsRelayRequest>>>,
        failing_provider_code: &'static str,
    ) -> Self {
        Self {
            captured,
            failing_provider_code,
        }
    }
}

impl EmbeddingsRelay for RetryableStatusPrimaryEmbeddingsRelay {
    fn create_embedding<'a>(
        &'a self,
        request: EmbeddingsRelayRequest,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = DomainResult<EmbeddingsRelayResponse>> + Send + 'a>,
    > {
        let provider_code = request.provider_code.clone();
        self.captured.lock().unwrap().push(request);
        Box::pin(async move {
            if provider_code == self.failing_provider_code {
                return Ok(EmbeddingsRelayResponse::json(
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
            Ok(EmbeddingsRelayResponse::json(
                200,
                serde_json::json!({
                    "object": "list",
                    "model": "text-embedding-3-small-fallback",
                    "data": [
                        {
                            "object": "embedding",
                            "index": 0,
                            "embedding": [0.1, 0.2, 0.3]
                        }
                    ],
                    "usage": {"prompt_tokens": 1, "total_tokens": 1}
                }),
            ))
        })
    }
}

#[derive(Debug)]
struct MissingUsageEmbeddingsRelay;

impl EmbeddingsRelay for MissingUsageEmbeddingsRelay {
    fn create_embedding<'a>(
        &'a self,
        _request: EmbeddingsRelayRequest,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = DomainResult<EmbeddingsRelayResponse>> + Send + 'a>,
    > {
        Box::pin(async {
            Ok(EmbeddingsRelayResponse::json(
                200,
                serde_json::json!({
                    "object": "list",
                    "model": "text-embedding-3-small",
                    "data": [
                        {
                            "object": "embedding",
                            "index": 0,
                            "embedding": [0.1, 0.2, 0.3]
                        }
                    ]
                }),
            ))
        })
    }
}

#[derive(Debug)]
struct RecordingUsageRecorder {
    captured: Arc<std::sync::Mutex<Vec<GatewayUsageRecordCommand>>>,
}

impl RecordingUsageRecorder {
    fn new(captured: Arc<std::sync::Mutex<Vec<GatewayUsageRecordCommand>>>) -> Self {
        Self { captured }
    }
}

impl GatewayUsageRecorder for RecordingUsageRecorder {
    fn record_gateway_usage<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = DomainResult<()>> + Send + 'a>> {
        self.captured.lock().unwrap().push(command);
        Box::pin(async { Ok(()) })
    }
}

#[derive(Debug)]
struct RecordingEmbeddingsInvocationPlugin {
    events: Arc<std::sync::Mutex<Vec<String>>>,
}

impl RecordingEmbeddingsInvocationPlugin {
    fn new(events: Arc<std::sync::Mutex<Vec<String>>>) -> Self {
        Self { events }
    }
}

impl OpenAiInvocationPlugin for RecordingEmbeddingsInvocationPlugin {
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
        route.provider_base_url = Some("http://plugin-account-pool.internal/embeddings".to_owned());
        route.provider_secret_ref =
            Some("vault://providers/openrouter/account/embeddings-plugin".to_owned());
        route.provider_auth_profile = ProviderAuthProfile::header("x-api-key");
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
}

#[tokio::test]
async fn openai_embeddings_invocation_plugins_cannot_override_account_before_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(std::sync::Mutex::new(Vec::new()));
    let events = Arc::new(std::sync::Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::openai_embeddings_router_with_relay_and_plugins(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            Arc::new(RecordingEmbeddingsRelay::new(Arc::clone(&captured))),
            vec![Arc::new(RecordingEmbeddingsInvocationPlugin::new(
                Arc::clone(&events),
            ))],
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"text-embedding-3-small","input":["hello"],"encoding_format":"float"}"#,
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
    assert_eq!(
        vec![
            "before_route_selection:text-embedding-3-small",
            "after_route_selection:openrouter:3001",
            "before_relay:http://provider-proxy.internal/openrouter",
        ],
        *events.lock().unwrap()
    );

    let captured = captured.lock().unwrap();
    assert!(captured.is_empty());
}

#[tokio::test]
async fn openai_embeddings_relays_request_after_auth_model_and_price_validation() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(std::sync::Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingEmbeddingsRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_embeddings_router_with_relay(
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
                    r#"{"model":"text-embedding-3-small","input":["hello"],"encoding_format":"float"}"#,
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

    assert_eq!("list", payload["object"]);
    assert_eq!(0.2, payload["data"][0]["embedding"][1]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(101, captured[0].api_key_id);
    assert_eq!(10, captured[0].tenant_id);
    assert_eq!(20, captured[0].organization_id);
    assert_eq!(30, captured[0].user_id);
    assert_eq!(10, captured[0].group_id);
    assert_eq!("standard-group", captured[0].group_code);
    assert_eq!("standard", captured[0].pricing_plan_code);
    assert_eq!("text-embedding-3-small", captured[0].model);
    assert_eq!("openrouter", captured[0].provider_code);
    assert_eq!("text-embedding-3-small", captured[0].provider_model);
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        captured[0].provider_base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter/account/embedding"),
        captured[0].provider_secret_ref.as_deref()
    );
    assert_eq!(Some(30_000), captured[0].provider_timeout_ms);
    assert_eq!(
        Some(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
        captured[0].provider_retry_policy
    );
    assert_eq!(
        "hello",
        captured[0].request_body["input"].as_array().unwrap()[0]
    );
}

#[tokio::test]
async fn openai_embeddings_failover_uses_single_attempt_per_candidate_channel() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(std::sync::Mutex::new(Vec::new()));
    let router = sdkwork_clawrouter_router_service::api::openai_embeddings_router_with_relay(
        Arc::new(catalog_with_embeddings_fallback_route(key_hash)),
        hasher,
        Arc::new(RetryableStatusPrimaryEmbeddingsRelay::new(
            Arc::clone(&captured),
            "openrouter",
        )),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"text-embedding-3-small","input":["hello"],"encoding_format":"float"}"#,
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
    assert_eq!("text-embedding-3-small-fallback", payload["model"]);

    let captured = captured.lock().unwrap();
    assert_eq!(2, captured.len());
    assert_eq!("openrouter", captured[0].provider_code);
    assert_eq!(3001, captured[0].provider_channel_id);
    assert_eq!(
        Some(ProviderRetryPolicy::new(1, Vec::new(), 0).unwrap()),
        captured[0].provider_retry_policy
    );
    assert_eq!("openrouter-fallback", captured[1].provider_code);
    assert_eq!(3002, captured[1].provider_channel_id);
    assert_eq!(
        Some(ProviderRetryPolicy::new(1, Vec::new(), 0).unwrap()),
        captured[1].provider_retry_policy
    );
}

#[tokio::test]
async fn openai_embeddings_records_usage_after_provider_success() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let relay_captured = Arc::new(std::sync::Mutex::new(Vec::new()));
    let usage_captured = Arc::new(std::sync::Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingEmbeddingsRelay::new(Arc::clone(&relay_captured)));
    let recorder = Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_embeddings_router_with_relay_and_usage_recorder(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        relay,
        recorder,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-embeddings-usage-1")
                .header("x-trace-id", "trace-embeddings-usage-1")
                .body(Body::from(
                    r#"{"model":"text-embedding-3-small","input":["hello"],"encoding_format":"float"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());

    let captured = usage_captured.lock().unwrap();
    assert_eq!(1, captured.len());
    let command = &captured[0];
    assert_server_generated_request_id(&command.request_id, "req-embeddings-usage-1");
    assert_eq!(
        Some("trace-embeddings-usage-1"),
        command.trace_id.as_deref()
    );
    assert_eq!("openai/text-embedding-3-small", command.catalog_key);
    assert_eq!("text-embedding-3-small", command.requested_model);
    assert_eq!(
        "openai/text-embedding-3-small",
        command.requested_model_catalog_key
    );
    assert_eq!("openrouter", command.provider_code);
    assert_eq!(3001, command.channel_id);
    assert_eq!("text-embedding-3-small", command.provider_model);
    assert_eq!("text-embedding-3-small", command.provider_native_model);
    assert_eq!("/v1/embeddings", command.request_path);
    assert_eq!("POST", command.http_method);
    assert_eq!(200, command.http_status);
    assert!(!command.streaming);
    assert_eq!(1, command.prompt_tokens);
    assert_eq!(0, command.completion_tokens);
    assert_eq!(0, command.cached_tokens);
    assert_eq!(1, command.total_tokens);
    assert_eq!(6, command.modality);
    assert_eq!(1, command.usage_type);
    assert_eq!("embedding_input_token", command.billing_meter_code);
    assert_eq!("0.026400", command.base_input_unit_price);
    assert_eq!("0.000000", command.base_output_unit_price);
    assert_eq!("0.000000", command.cache_read_unit_price);
    assert_eq!("0.000000026400", command.customer_charge_amount);
    assert_eq!("0.000000010000", command.upstream_cost_amount);
    assert_eq!("USD", command.currency);
    assert_eq!("standard", command.pricing_plan_code);
}

#[tokio::test]
async fn openai_embeddings_rejects_usage_recording_when_success_response_omits_usage() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let usage_captured = Arc::new(std::sync::Mutex::new(Vec::new()));
    let recorder = Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_embeddings_router_with_relay_and_usage_recorder(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(MissingUsageEmbeddingsRelay),
        recorder,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"text-embedding-3-small","input":["hello"],"encoding_format":"float"}"#,
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
async fn openai_embeddings_rejects_chat_only_model_before_fake_success() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key(key_hash);
    catalog.add_model(AiModel::new(
        "gpt-4o-mini",
        "GPT-4o mini",
        "openai",
        vec!["chat"],
    ));
    catalog.add_provider_route(ModelProviderRoute::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        "openrouter",
        3002,
        "gpt-4o-mini",
    ));
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::EmbeddingInputToken,
            Money::usd("0.020000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini"),
    );
    let router =
        sdkwork_clawrouter_router_service::api::openai_embeddings_router(Arc::new(catalog), hasher);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/embeddings")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-4o-mini","input":"hello"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        "model_capability_not_supported",
        payload["error"]["code"].as_str().unwrap()
    );
}
