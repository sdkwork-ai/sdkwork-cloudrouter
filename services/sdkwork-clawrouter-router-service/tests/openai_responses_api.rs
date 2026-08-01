use std::sync::Arc;
use std::sync::Mutex;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_claw_test_support::assert_server_generated_request_id;
use sdkwork_clawrouter_router_service::api::{
    OpenAiInvocationContext, OpenAiInvocationPlugin, OpenAiInvocationPluginFuture,
    OpenAiInvocationRelayOutcome, OpenAiUpstreamRoute,
};
use sdkwork_clawrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, DomainResult, GatewayApiKey, ModelPrice,
    ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    ProviderAuthProfile, ProviderRetryPolicy, RouteCandidate, RoutingCapability, RoutingPolicy,
    RoutingPolicyScope, RoutingRule, UpstreamAccountGroup, UpstreamAccountRoute,
};
use sdkwork_clawrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_clawrouter_router_service::ports::{
    GatewayUsageRecordCommand, GatewayUsageRecorder, ResponsesRelay, ResponsesRelayRequest,
    ResponsesRelayResponse,
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
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4.1-mini",
            "gpt-4.1-mini",
            "openrouter",
            3001,
            "gpt-4.1-mini",
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
            .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap())
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
        .for_upstream_account("openrouter", 3001),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4.1-mini",
        "gpt-4.1-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmCacheReadToken,
        Money::usd("0.075000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4.1-mini",
            "gpt-4.1-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmCacheReadToken,
            Money::usd("0.055000").unwrap(),
        )
        .for_upstream_account("openrouter", 3001),
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
        .for_upstream_account("openrouter", 3001),
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
        .with_candidate_account_groups(vec![RouteCandidate::new(10, 100)]),
    );
    catalog
}

fn catalog_with_hashed_api_key_missing_billing_subject(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = catalog_with_hashed_api_key(key_hash.clone());
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash));
    catalog
}

fn catalog_with_responses_fallback_route(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = catalog_with_hashed_api_key(key_hash);
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4.1-mini",
            "gpt-4.1-mini",
            "openrouter-fallback",
            3002,
            "gpt-4.1-mini-fallback",
        )
        .with_upstream_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter/account/responses-fallback"),
        )
        .with_timeout_ms(20_000)
        .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter-fallback", 3002)
            .with_upstream_endpoint(
                Some("http://provider-proxy.internal/openrouter-fallback"),
                Some("vault://providers/openrouter/account/responses-fallback"),
            )
            .with_timeout_ms(20_000)
            .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap())
            .with_account_group_binding(10, 200, 100),
    );
    for (meter, unit_price) in [
        (BillingMeter::LlmInputToken, "0.120000"),
        (BillingMeter::LlmOutputToken, "0.480000"),
        (BillingMeter::LlmCacheReadToken, "0.060000"),
    ] {
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openai/gpt-4.1-mini",
                "gpt-4.1-mini",
                PriceSide::UpstreamCost,
                meter,
                Money::usd(unit_price).unwrap(),
            )
            .for_upstream_account("openrouter-fallback", 3002),
        );
    }
    catalog.add_routing_rule(
        RoutingRule::new(
            9100,
            10,
            20,
            9101,
            "standard-group-gpt-4-1-mini-sticky-fail-closed",
            0,
            r#"{"catalogKey":"openai/gpt-4.1-mini"}"#,
            "openai/gpt-4.1-mini",
        )
        .with_candidate_account_groups(vec![RouteCandidate::new(10, 100)]),
    );
    catalog
}

#[tokio::test]
async fn openai_responses_authenticates_validates_price_and_returns_honest_not_implemented() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_responses_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/responses")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-4.1-mini","input":"hello"}"#))
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
        "responses_relay_not_configured",
        payload["error"]["code"].as_str().unwrap()
    );
    assert_eq!("server_error", payload["error"]["type"]);
    assert!(!body.contains("sk-live-secret"));
}

#[tokio::test]
async fn openai_responses_rejects_api_key_without_billing_subject_before_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingResponsesRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_responses_router_with_relay(
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
                .uri("/v1/responses")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-4.1-mini","input":"hello"}"#))
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
async fn openai_responses_rejects_unknown_model_after_authentication() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_responses_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/responses")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"missing-responses","input":"hello"}"#,
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
struct RecordingResponsesRelay {
    captured: Arc<Mutex<Vec<ResponsesRelayRequest>>>,
}

impl RecordingResponsesRelay {
    fn new(captured: Arc<Mutex<Vec<ResponsesRelayRequest>>>) -> Self {
        Self { captured }
    }
}

impl ResponsesRelay for RecordingResponsesRelay {
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
                    "id": "resp-test",
                    "object": "response",
                    "model": "gpt-4.1-mini",
                    "output": [
                        {
                            "type": "message",
                            "role": "assistant",
                            "content": [{"type": "output_text", "text": "pong"}]
                        }
                    ],
                    "usage": {"input_tokens": 1, "output_tokens": 1, "total_tokens": 2}
                }),
            ))
        })
    }
}

#[derive(Debug)]
struct RetryableStatusPrimaryResponsesRelay {
    captured: Arc<Mutex<Vec<ResponsesRelayRequest>>>,
    failing_supplier_code: &'static str,
}

impl RetryableStatusPrimaryResponsesRelay {
    fn new(
        captured: Arc<Mutex<Vec<ResponsesRelayRequest>>>,
        failing_supplier_code: &'static str,
    ) -> Self {
        Self {
            captured,
            failing_supplier_code,
        }
    }
}

impl ResponsesRelay for RetryableStatusPrimaryResponsesRelay {
    fn create_response<'a>(
        &'a self,
        request: ResponsesRelayRequest,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = DomainResult<ResponsesRelayResponse>> + Send + 'a>,
    > {
        let supplier_code = request.supplier_code.clone();
        self.captured.lock().unwrap().push(request);
        Box::pin(async move {
            if supplier_code == self.failing_supplier_code {
                return Ok(ResponsesRelayResponse::json(
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
            Ok(ResponsesRelayResponse::json(
                200,
                serde_json::json!({
                    "id": "resp-fallback",
                    "object": "response",
                    "model": "gpt-4.1-mini-fallback",
                    "output": [
                        {
                            "type": "message",
                            "role": "assistant",
                            "content": [{"type": "output_text", "text": "pong"}]
                        }
                    ],
                    "usage": {"input_tokens": 1, "output_tokens": 1, "total_tokens": 2}
                }),
            ))
        })
    }
}

#[derive(Debug)]
struct MissingUsageResponsesRelay;

impl ResponsesRelay for MissingUsageResponsesRelay {
    fn create_response<'a>(
        &'a self,
        _request: ResponsesRelayRequest,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = DomainResult<ResponsesRelayResponse>> + Send + 'a>,
    > {
        Box::pin(async {
            Ok(ResponsesRelayResponse::json(
                200,
                serde_json::json!({
                    "id": "resp-missing-usage",
                    "object": "response",
                    "model": "gpt-4.1-mini",
                    "output": [
                        {
                            "type": "message",
                            "role": "assistant",
                            "content": [{"type": "output_text", "text": "pong"}]
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
}

impl RecordingUsageRecorder {
    fn new(captured: Arc<Mutex<Vec<GatewayUsageRecordCommand>>>) -> Self {
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
struct RecordingResponsesInvocationPlugin {
    events: Arc<Mutex<Vec<String>>>,
}

impl RecordingResponsesInvocationPlugin {
    fn new(events: Arc<Mutex<Vec<String>>>) -> Self {
        Self { events }
    }
}

impl OpenAiInvocationPlugin for RecordingResponsesInvocationPlugin {
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
        route: &'a mut OpenAiUpstreamRoute,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events.lock().unwrap().push(format!(
            "after_route_selection:{}:{}",
            route.supplier_code, route.account_id
        ));
        Box::pin(async { Ok(()) })
    }

    fn before_relay<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        route: &'a mut OpenAiUpstreamRoute,
    ) -> OpenAiInvocationPluginFuture<'a> {
        self.events.lock().unwrap().push(format!(
            "before_relay:{}",
            route.provider_base_url.as_deref().unwrap_or_default()
        ));
        route.provider_base_url =
            Some("http://plugin-upstream-account-group.internal/responses".to_owned());
        route.provider_secret_ref =
            Some("vault://providers/openrouter/account/responses-plugin".to_owned());
        route.provider_auth_profile = ProviderAuthProfile::header("x-api-key");
        Box::pin(async { Ok(()) })
    }

    fn after_relay<'a>(
        &'a self,
        _context: &'a OpenAiInvocationContext,
        _route: &'a OpenAiUpstreamRoute,
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
async fn openai_responses_invocation_plugins_cannot_override_account_before_relay() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let events = Arc::new(Mutex::new(Vec::new()));
    let router =
        sdkwork_clawrouter_router_service::api::openai_responses_router_with_relay_and_plugins(
            Arc::new(catalog_with_hashed_api_key(key_hash)),
            hasher,
            Arc::new(RecordingResponsesRelay::new(Arc::clone(&captured))),
            vec![Arc::new(RecordingResponsesInvocationPlugin::new(
                Arc::clone(&events),
            ))],
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/responses")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-4.1-mini","input":"hello"}"#))
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
        "upstream_route_mutation_not_allowed",
        payload["error"]["code"]
    );
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("plugin mutated the selected upstream route"));
    assert_eq!(
        vec![
            "before_route_selection:gpt-4.1-mini",
            "after_route_selection:openrouter:3001",
            "before_relay:http://provider-proxy.internal/openrouter",
        ],
        *events.lock().unwrap()
    );

    let captured = captured.lock().unwrap();
    assert!(captured.is_empty());
}

#[tokio::test]
async fn openai_responses_relays_non_stream_request_after_auth_model_and_price_validation() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingResponsesRelay::new(Arc::clone(&captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_responses_router_with_relay(
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
                .body(Body::from(r#"{"model":"gpt-4.1-mini","input":"hello"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("resp-test", payload["id"]);
    assert_eq!("pong", payload["output"][0]["content"][0]["text"]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(101, captured[0].api_key_id);
    assert_eq!(10, captured[0].tenant_id);
    assert_eq!(20, captured[0].organization_id);
    assert_eq!(30, captured[0].user_id);
    assert_eq!(10, captured[0].group_id);
    assert_eq!("standard-group", captured[0].group_code);
    assert_eq!("standard", captured[0].pricing_plan_code);
    assert_eq!("gpt-4.1-mini", captured[0].model);
    assert_eq!("openrouter", captured[0].supplier_code);
    assert_eq!("gpt-4.1-mini", captured[0].provider_model);
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter"),
        captured[0].provider_base_url.as_deref()
    );
    assert_eq!(
        Some("vault://providers/openrouter/account/responses"),
        captured[0].provider_secret_ref.as_deref()
    );
    assert_eq!(Some(30_000), captured[0].provider_timeout_ms);
    assert_eq!(
        Some(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
        captured[0].provider_retry_policy
    );
    assert_eq!("hello", captured[0].request_body["input"]);
}

#[tokio::test]
async fn openai_responses_create_fails_closed_after_retryable_provider_status() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let router = sdkwork_clawrouter_router_service::api::openai_responses_router_with_relay(
        Arc::new(catalog_with_responses_fallback_route(key_hash)),
        hasher,
        Arc::new(RetryableStatusPrimaryResponsesRelay::new(
            Arc::clone(&captured),
            "openrouter",
        )),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/responses")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-4.1-mini","input":"hello"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("overloaded", payload["error"]["code"].as_str().unwrap());

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("openrouter", captured[0].supplier_code);
    assert_eq!(3001, captured[0].provider_account_id);
    assert_eq!(
        Some(ProviderRetryPolicy::new(1, Vec::new(), 0).unwrap()),
        captured[0].provider_retry_policy
    );
}

#[tokio::test]
async fn openai_responses_records_usage_after_provider_success() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let relay_captured = Arc::new(Mutex::new(Vec::new()));
    let usage_captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingResponsesRelay::new(Arc::clone(&relay_captured)));
    let recorder = Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_responses_router_with_relay_and_usage_recorder(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        relay,
        recorder,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/responses")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-responses-usage-1")
                .header("x-trace-id", "trace-responses-usage-1")
                .body(Body::from(r#"{"model":"gpt-4.1-mini","input":"hello"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());

    let captured = usage_captured.lock().unwrap();
    assert_eq!(1, captured.len());
    let command = &captured[0];
    assert_server_generated_request_id(&command.request_id, "req-responses-usage-1");
    assert_eq!(Some("trace-responses-usage-1"), command.trace_id.as_deref());
    assert_eq!("openai/gpt-4.1-mini", command.catalog_key);
    assert_eq!("gpt-4.1-mini", command.requested_model);
    assert_eq!("openai/gpt-4.1-mini", command.requested_model_catalog_key);
    assert_eq!("openrouter", command.supplier_code);
    assert_eq!(3001, command.account_id);
    assert_eq!("gpt-4.1-mini", command.provider_model);
    assert_eq!("gpt-4.1-mini", command.provider_native_model);
    assert_eq!("/v1/responses", command.request_path);
    assert_eq!("POST", command.http_method);
    assert_eq!(200, command.http_status);
    assert!(!command.streaming);
    assert_eq!(1, command.prompt_tokens);
    assert_eq!(1, command.completion_tokens);
    assert_eq!(0, command.cached_tokens);
    assert_eq!(2, command.total_tokens);
    assert_eq!(1, command.modality);
    assert_eq!(1, command.usage_type);
    assert_eq!("llm_input_token", command.billing_meter_code);
    assert_eq!("0.180000", command.base_input_unit_price);
    assert_eq!("0.720000", command.base_output_unit_price);
    assert_eq!("0.090000", command.cache_read_unit_price);
    assert_eq!("1.100000", command.rate_multiplier);
    assert_eq!("1.200000", command.reference_multiplier);
    assert_eq!("0.000000990000", command.customer_charge_amount);
    assert_eq!("0.000000550000", command.upstream_cost_amount);
    assert_eq!("USD", command.currency);
    assert_eq!("standard", command.pricing_plan_code);
}

#[tokio::test]
async fn openai_responses_rejects_usage_recording_when_success_response_omits_usage() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let usage_captured = Arc::new(Mutex::new(Vec::new()));
    let recorder = Arc::new(RecordingUsageRecorder::new(Arc::clone(&usage_captured)));
    let router = sdkwork_clawrouter_router_service::api::openai_responses_router_with_relay_and_usage_recorder(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Arc::new(MissingUsageResponsesRelay),
        recorder,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/responses")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-4.1-mini","input":"hello"}"#))
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
async fn openai_responses_rejects_chat_only_model_before_fake_success() {
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
    catalog.add_model_upstream_route(ModelUpstreamRoute::new_for_catalog_key(
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
            BillingMeter::LlmInputToken,
            Money::usd("0.150000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini"),
    );
    let router =
        sdkwork_clawrouter_router_service::api::openai_responses_router(Arc::new(catalog), hasher);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/responses")
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

#[tokio::test]
async fn openai_responses_rejects_streaming_before_fake_chunks() {
    let hasher =
        Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap());
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router = sdkwork_clawrouter_router_service::api::openai_responses_router(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/responses")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4.1-mini","input":"hello","stream":true}"#,
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
        "streaming_relay_not_configured",
        payload["error"]["code"].as_str().unwrap()
    );
}
