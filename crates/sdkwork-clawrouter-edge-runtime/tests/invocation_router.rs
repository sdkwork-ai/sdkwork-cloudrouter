use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, Method, Request, StatusCode};
use axum::routing::{any, post};
use axum::Json;
use bytes::Bytes;
use futures_util::StreamExt;
use sdkwork_claw_config::ProviderAdapterConfig;
use sdkwork_claw_test_support::assert_server_generated_request_id;
use sdkwork_clawrouter_router_service::application::{
    ApiKeySecretHasher, BillingQuantitySource, Invocation, InvocationAccount, InvocationBilling,
    InvocationBody, InvocationDispatchResponse, InvocationProviderRequest, InvocationRequest,
    InvocationResource, InvocationSubject,
};
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, UpstreamAccountGroup, DecimalValue, DomainError, DomainResult,
    GatewayAccessPolicy, GatewayApiKey, ModelPrice, ModelUpstreamRoute, ModelVendor,
    ModelVendorDefinition, Money, PriceSide, PricingPlan, UpstreamAccountRoute,
    ProviderRetryPolicy, QuotaPolicy, RouteCandidate, RoutingCapability, RoutingPolicy,
    RoutingPolicyScope, RoutingRule,
};
use sdkwork_clawrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_clawrouter_router_service::ports::{
    GatewayRequestTraceCommand, GatewayUsageRecordCommand, GatewayUsageRecordFuture,
    GatewayUsageRecorder, InvocationDispatcher, InvocationDispatcherFuture, ProviderSecretResolver,
    StickyObjectRouteBinding, StickyObjectRouteLookup, StickyObjectRouteUpsert, StickyRouteStore,
    StickyRouteStoreFuture,
};
use serde_json::json;
use tokio::sync::mpsc;
use tower::ServiceExt;

#[derive(Debug, Default)]
struct CapturingDispatcher {
    calls: Mutex<Vec<CapturedDispatch>>,
}

#[derive(Debug, Clone)]
struct CapturedDispatch {
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    request_path: String,
    supplier_code: String,
    account_id: i64,
    provider_request: Option<InvocationProviderRequest>,
}

impl CapturingDispatcher {
    fn calls(&self) -> Vec<CapturedDispatch> {
        self.calls.lock().unwrap().clone()
    }
}

impl InvocationDispatcher for CapturingDispatcher {
    fn dispatch<'a>(
        &'a self,
        invocation: &'a Invocation,
        account: &'a InvocationAccount,
    ) -> InvocationDispatcherFuture<'a> {
        Box::pin(async move {
            self.calls.lock().unwrap().push(CapturedDispatch {
                tenant_id: invocation.subject.tenant_id,
                organization_id: invocation.subject.organization_id,
                user_id: invocation.subject.user_id,
                request_path: invocation.request.path.clone(),
                supplier_code: account.supplier_code.clone(),
                account_id: account.account_id,
                provider_request: invocation.dispatch.provider_request.clone(),
            });
            if invocation.billing.quantity_source == BillingQuantitySource::AdapterUsageLines {
                return Ok(InvocationDispatchResponse::json(
                    200,
                    json!({
                        "id": "provider-native-invocation-router",
                        "status": "succeeded",
                        "_gateway_usage": {
                            "lines": [
                                {"meter": "api_result", "quantity": "1"}
                            ]
                        }
                    }),
                ));
            }
            let response_body = if invocation.request.path == "/v1/files" {
                json!({
                    "id": "chatcmpl-invocation-router",
                    "object": "file",
                    "filename": "upload.bin",
                    "bytes": 0,
                    "purpose": "assistants"
                })
            } else {
                json!({
                    "id": "chatcmpl-invocation-router",
                    "object": "chat.completion",
                    "choices": [
                        {
                            "index": 0,
                            "message": {"role": "assistant", "content": "pong"},
                            "finish_reason": "stop"
                        }
                    ],
                    "usage": {
                        "prompt_tokens": 3,
                        "completion_tokens": 2,
                        "total_tokens": 5
                    }
                })
            };
            Ok(InvocationDispatchResponse::json(200, response_body))
        })
    }
}

struct DeferredSseDispatcher {
    calls: AtomicUsize,
    receiver: Mutex<Option<mpsc::Receiver<Bytes>>>,
}

impl DeferredSseDispatcher {
    fn new(receiver: mpsc::Receiver<Bytes>) -> Self {
        Self {
            calls: AtomicUsize::new(0),
            receiver: Mutex::new(Some(receiver)),
        }
    }

    fn calls(&self) -> usize {
        self.calls.load(Ordering::SeqCst)
    }
}

impl InvocationDispatcher for DeferredSseDispatcher {
    fn dispatch<'a>(
        &'a self,
        _invocation: &'a Invocation,
        _account: &'a InvocationAccount,
    ) -> InvocationDispatcherFuture<'a> {
        self.calls.fetch_add(1, Ordering::SeqCst);
        let receiver = self
            .receiver
            .lock()
            .unwrap()
            .take()
            .expect("test dispatcher should only be invoked once");
        Box::pin(async move {
            let stream = futures_util::stream::unfold(receiver, |mut receiver| async move {
                receiver
                    .recv()
                    .await
                    .map(|bytes| (Ok::<Bytes, std::io::Error>(bytes), receiver))
            });
            Ok(InvocationDispatchResponse::streaming(
                200,
                Some("text/event-stream".to_owned()),
                Body::from_stream(stream),
            ))
        })
    }
}

#[derive(Debug, Default)]
struct StallingSseDispatcher {
    calls: AtomicUsize,
}

impl StallingSseDispatcher {
    fn calls(&self) -> usize {
        self.calls.load(Ordering::SeqCst)
    }
}

impl InvocationDispatcher for StallingSseDispatcher {
    fn dispatch<'a>(
        &'a self,
        _invocation: &'a Invocation,
        _account: &'a InvocationAccount,
    ) -> InvocationDispatcherFuture<'a> {
        self.calls.fetch_add(1, Ordering::SeqCst);
        Box::pin(async move {
            let stream = futures_util::stream::pending::<Result<Bytes, std::io::Error>>();
            Ok(InvocationDispatchResponse::streaming(
                200,
                Some("text/event-stream".to_owned()),
                Body::from_stream(stream),
            ))
        })
    }
}

#[derive(Debug, Default)]
struct ProviderErrorDispatcher;

impl InvocationDispatcher for ProviderErrorDispatcher {
    fn dispatch<'a>(
        &'a self,
        _invocation: &'a Invocation,
        _account: &'a InvocationAccount,
    ) -> InvocationDispatcherFuture<'a> {
        Box::pin(async move {
            Ok(InvocationDispatchResponse::json(
                400,
                json!({"error": {"message": "bad provider request"}}),
            ))
        })
    }
}

#[derive(Debug)]
struct MapSecretResolver {
    secrets: HashMap<String, String>,
}

impl ProviderSecretResolver for MapSecretResolver {
    fn resolve_secret_value(&self, secret_ref: &str) -> DomainResult<String> {
        self.secrets
            .get(secret_ref)
            .cloned()
            .ok_or_else(|| DomainError::new(format!("secret not found: {secret_ref}")))
    }
}

#[derive(Debug, Default)]
struct RecordingUsageRecorder {
    commands: Mutex<Vec<GatewayUsageRecordCommand>>,
    traces: Mutex<Vec<GatewayRequestTraceCommand>>,
}

impl RecordingUsageRecorder {
    fn commands(&self) -> Vec<GatewayUsageRecordCommand> {
        self.commands.lock().unwrap().clone()
    }

    fn traces(&self) -> Vec<GatewayRequestTraceCommand> {
        self.traces.lock().unwrap().clone()
    }
}

async fn wait_for_usage_commands(
    recorder: &RecordingUsageRecorder,
    expected_count: usize,
) -> Vec<GatewayUsageRecordCommand> {
    tokio::time::timeout(Duration::from_secs(1), async {
        loop {
            let commands = recorder.commands();
            if commands.len() >= expected_count {
                return commands;
            }
            tokio::time::sleep(Duration::from_millis(1)).await;
        }
    })
    .await
    .expect("stream terminal lifecycle should record usage")
}

impl GatewayUsageRecorder for RecordingUsageRecorder {
    fn record_gateway_trace<'a>(
        &'a self,
        command: GatewayRequestTraceCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            self.traces.lock().unwrap().push(command);
            Ok(())
        })
    }

    fn record_gateway_usage<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async move {
            self.commands.lock().unwrap().push(command);
            Ok(())
        })
    }
}

#[derive(Debug, Default)]
struct RecordingStickyRouteStore {
    bindings: Mutex<Vec<StickyObjectRouteBinding>>,
    lookups: Mutex<Vec<StickyObjectRouteLookup>>,
    upserts: Mutex<Vec<StickyObjectRouteUpsert>>,
}

impl RecordingStickyRouteStore {
    fn with_binding(binding: StickyObjectRouteBinding) -> Self {
        Self {
            bindings: Mutex::new(vec![binding]),
            lookups: Mutex::new(Vec::new()),
            upserts: Mutex::new(Vec::new()),
        }
    }

    fn lookups(&self) -> Vec<StickyObjectRouteLookup> {
        self.lookups.lock().unwrap().clone()
    }

    fn upserts(&self) -> Vec<StickyObjectRouteUpsert> {
        self.upserts.lock().unwrap().clone()
    }
}

impl StickyRouteStore for RecordingStickyRouteStore {
    fn find_binding<'a>(
        &'a self,
        query: StickyObjectRouteLookup,
    ) -> StickyRouteStoreFuture<'a, Option<StickyObjectRouteBinding>> {
        Box::pin(async move {
            self.lookups.lock().unwrap().push(query.clone());
            Ok(self
                .bindings
                .lock()
                .unwrap()
                .iter()
                .find(|binding| {
                    binding.tenant_id == query.tenant_id
                        && binding.organization_id == query.organization_id
                        && binding.object_type == query.object_type
                        && binding.object_id == query.object_id
                })
                .cloned())
        })
    }

    fn upsert_binding<'a>(
        &'a self,
        command: StickyObjectRouteUpsert,
    ) -> StickyRouteStoreFuture<'a, ()> {
        Box::pin(async move {
            self.upserts.lock().unwrap().push(command);
            Ok(())
        })
    }
}

fn catalog_with_hashed_api_key(key_hash: &str) -> InMemoryPricingCatalog {
    catalog_with_hashed_api_key_and_base_url(key_hash, "http://provider-proxy.internal/openrouter")
}

fn catalog_with_hashed_api_key_and_base_url(
    key_hash: &str,
    base_url: &str,
) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_vendor(ModelVendorDefinition::new(
        "kling",
        ModelVendor::Custom,
        "Kling",
    ));
    catalog.add_model(AiModel::new(
        "gpt-4o-mini",
        "GPT-4o mini",
        "openai",
        vec!["chat", "tools"],
    ));
    catalog.add_model(
        AiModel::new(
            "management/files",
            "OpenAI Files API",
            "openai",
            vec!["network"],
        )
        .with_catalog_key("openai/management/files"),
    );
    catalog.add_model(
        AiModel::new(
            "text_to_video",
            "Kling text to video API",
            "kling",
            vec!["video"],
        )
        .with_catalog_key("kling.text_to_video"),
    );
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter",
            3001,
            "gpt-4o-mini-provider",
        )
        .with_upstream_endpoint(
            Some(base_url),
            Some("vault://providers/openrouter/account/main"),
        )
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_upstream_endpoint(
                Some(base_url),
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
    add_price_pair(
        &mut catalog,
        BillingMeter::LlmInputToken,
        "0.150000",
        "0.110000",
    );
    add_price_pair(
        &mut catalog,
        BillingMeter::LlmOutputToken,
        "0.600000",
        "0.440000",
    );
    add_price(
        &mut catalog,
        "openai/management/files",
        "openai/management/files",
        BillingMeter::ApiRequest,
        "0.010000",
        "0.004000",
    );
    add_price(
        &mut catalog,
        "kling.text_to_video",
        "text_to_video",
        BillingMeter::ApiResult,
        "0.020000",
        "0.012000",
    );
    add_price(
        &mut catalog,
        "kling.text_to_video",
        "text_to_video",
        BillingMeter::ApiItem,
        "0.020000",
        "0.012000",
    );
    add_price(
        &mut catalog,
        "kling.text_to_video",
        "text_to_video",
        BillingMeter::ApiRequest,
        "0.010000",
        "0.004000",
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
        .with_candidate_account_groups(vec![RouteCandidate::new(3001, 100)]),
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9002,
            10,
            20,
            "standard-group-network-policy",
            RoutingPolicyScope::UpstreamAccountGroup,
            Some(10),
            Some(9201),
        )
        .with_capability(RoutingCapability::Network),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9202,
            10,
            20,
            9201,
            "standard-group-openai-files",
            1,
            r#"{"routeKey":"openai/management/files"}"#,
            "openai/management/files",
        )
        .with_candidate_account_groups(vec![RouteCandidate::new(3001, 100)]),
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9003,
            10,
            20,
            "standard-group-video-policy",
            RoutingPolicyScope::UpstreamAccountGroup,
            Some(10),
            Some(9301),
        )
        .with_capability(RoutingCapability::Video),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9203,
            10,
            20,
            9301,
            "standard-group-kling-text2video",
            2,
            r#"{"routeKey":"kling.text_to_video"}"#,
            "kling.text_to_video",
        )
        .with_candidate_account_groups(vec![RouteCandidate::new(3001, 100)]),
    );
    catalog
}

fn catalog_with_failover_routes_and_hashed_api_key(
    key_hash: &str,
    primary_base_url: &str,
    fallback_base_url: &str,
) -> InMemoryPricingCatalog {
    let mut catalog = catalog_with_hashed_api_key_and_base_url(key_hash, primary_base_url);
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "fallback",
            3002,
            "gpt-4o-mini-fallback",
        )
        .with_upstream_endpoint(
            Some(fallback_base_url),
            Some("vault://providers/fallback/account/main"),
        )
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("fallback", 3002)
            .with_upstream_endpoint(
                Some(fallback_base_url),
                Some("vault://providers/fallback/account/main"),
            )
            .with_timeout_ms(30_000)
            .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.110000").unwrap(),
        )
        .for_upstream_account("fallback", 3002),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmOutputToken,
            Money::usd("0.440000").unwrap(),
        )
        .for_upstream_account("fallback", 3002),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9100,
            10,
            20,
            9101,
            "standard-group-gpt-4o-mini-failover",
            0,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_account_groups(vec![
            RouteCandidate::new(3001, 100),
            RouteCandidate::new(3002, 90),
        ]),
    );
    catalog
}

fn catalog_with_encoded_image_model_and_hashed_api_key(key_hash: &str) -> InMemoryPricingCatalog {
    let mut catalog = catalog_with_hashed_api_key_and_base_url(
        key_hash,
        "http://provider-proxy.internal/openrouter",
    );
    catalog.add_vendor(ModelVendorDefinition::new(
        "openrouter",
        ModelVendor::Custom,
        "OpenRouter",
    ));
    catalog.add_model(
        AiModel::new(
            "gpt-4o-mini+latest",
            "GPT-4o mini latest through OpenRouter",
            "openrouter",
            vec!["image"],
        )
        .with_catalog_key("openrouter/gpt-4o-mini+latest"),
    );
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openrouter/gpt-4o-mini+latest",
            "openrouter/gpt-4o-mini+latest",
            "openrouter",
            3001,
            "openrouter/gpt-4o-mini+latest",
        )
        .with_api_code("openai.images.generations")
        .with_upstream_endpoint(
            Some("http://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/main"),
        ),
    );
    add_price(
        &mut catalog,
        "openrouter/gpt-4o-mini+latest",
        "openrouter/gpt-4o-mini+latest",
        BillingMeter::ImageResult,
        "0.020000",
        "0.012000",
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            9003,
            10,
            20,
            "standard-group-image-policy",
            RoutingPolicyScope::UpstreamAccountGroup,
            Some(10),
            Some(9301),
        )
        .with_capability(RoutingCapability::Image),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9302,
            10,
            20,
            9301,
            "standard-group-openrouter-image",
            1,
            r#"{"catalogKey":"openrouter/gpt-4o-mini+latest"}"#,
            "openrouter/gpt-4o-mini+latest",
        )
        .with_candidate_account_groups(vec![RouteCandidate::new(3001, 100)]),
    );
    catalog
}

fn add_price_pair(
    catalog: &mut InMemoryPricingCatalog,
    meter: BillingMeter,
    official_price: &str,
    upstream_price: &str,
) {
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        meter.clone(),
        Money::usd(official_price).unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            meter,
            Money::usd(upstream_price).unwrap(),
        )
        .for_upstream_account("openrouter", 3001),
    );
}

fn add_price(
    catalog: &mut InMemoryPricingCatalog,
    catalog_key: &str,
    model: &str,
    meter: BillingMeter,
    official_price: &str,
    upstream_price: &str,
) {
    catalog.add_price(ModelPrice::new_for_catalog_key(
        catalog_key,
        model,
        PriceSide::OfficialReference,
        meter.clone(),
        Money::usd(official_price).unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            catalog_key,
            model,
            PriceSide::UpstreamCost,
            meter,
            Money::usd(upstream_price).unwrap(),
        )
        .for_upstream_account("openrouter", 3001),
    );
}

fn hasher() -> Arc<HmacSha256ApiKeySecretHasher> {
    Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap())
}

fn secret_resolver() -> Arc<dyn ProviderSecretResolver + Send + Sync> {
    Arc::new(MapSecretResolver {
        secrets: HashMap::from([
            (
                "vault://providers/openrouter/account/main".to_owned(),
                "sk-provider-secret".to_owned(),
            ),
            (
                "vault://providers/fallback/account/main".to_owned(),
                "sk-fallback-provider-secret".to_owned(),
            ),
        ]),
    })
}

fn provider_adapter_config(adapter_base_url: &str) -> ProviderAdapterConfig {
    ProviderAdapterConfig::from_json(
        format!(
            r#"{{
                "routes": [
                    {{
                        "providerCode": "openrouter",
                        "adapterKind": "internal_http",
                        "adapterBaseUrl": "{adapter_base_url}",
                        "capability": "video_generation",
                        "endpointKey": "text2video",
                        "method": "POST",
                        "standardPathPattern": "/v1/videos/text2video",
                        "adapterPathTemplate": "/providers/{{supplier_code}}{{standard_path}}",
                        "invocationShape": "async_task_start",
                        "status": "enabled",
                        "priority": 10
                    }}
                ]
            }}"#
        ),
        Some("adapter-token".to_owned()),
    )
    .expect("provider adapter config")
}

fn fallback_only_secret_resolver() -> Arc<dyn ProviderSecretResolver + Send + Sync> {
    Arc::new(MapSecretResolver {
        secrets: HashMap::from([(
            "vault://providers/fallback/account/main".to_owned(),
            "sk-fallback-provider-secret".to_owned(),
        )]),
    })
}

#[tokio::test]
async fn invocation_router_dispatches_openai_model_call_through_pipeline() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let router =
        sdkwork_clawrouter_edge_runtime::invocation_router_with_catalog_api_key_hasher_dispatcher_and_secret_resolver(
            Arc::new(catalog_with_hashed_api_key(&key_hash)),
            hasher,
            dispatcher.clone(),
            secret_resolver(),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-invocation-router-chat")
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
    assert_eq!("chatcmpl-invocation-router", payload["id"]);

    let calls = dispatcher.calls();
    assert_eq!(1, calls.len());
    let call = calls.first().unwrap();
    assert_eq!(10, call.tenant_id);
    assert_eq!(20, call.organization_id);
    assert_eq!(30, call.user_id);
    assert_eq!("/v1/chat/completions", call.request_path);
    assert_eq!("openrouter", call.supplier_code);
    assert_eq!(3001, call.account_id);

    let provider_request = call.provider_request.as_ref().expect("provider request");
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter/v1/chat/completions"),
        provider_request.url.as_deref()
    );
    assert_eq!(
        Some("Bearer sk-provider-secret"),
        provider_request
            .headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
    );
    let InvocationBody::Json(provider_body) = &provider_request.body else {
        panic!("expected JSON provider request body");
    };
    assert_eq!(
        Some("gpt-4o-mini-provider"),
        provider_body.get("model").and_then(|value| value.as_str())
    );
}

#[tokio::test]
async fn invocation_router_returns_not_found_for_unknown_openai_prefixed_paths_before_auth() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let router =
        sdkwork_clawrouter_edge_runtime::invocation_router_with_catalog_api_key_hasher_dispatcher_and_secret_resolver(
            Arc::new(catalog_with_hashed_api_key(&key_hash)),
            hasher,
            dispatcher.clone(),
            secret_resolver(),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/not-openai-standard")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-4o-mini"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::NOT_FOUND, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("not_found", payload["error"]["code"]);
    assert!(
        dispatcher.calls().is_empty(),
        "unknown OpenAI-prefixed paths must not enter the invocation pipeline"
    );
}

#[tokio::test]
async fn invocation_router_can_failover_when_primary_secret_is_missing() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let router =
        sdkwork_clawrouter_edge_runtime::invocation_router_with_catalog_api_key_hasher_dispatcher_and_secret_resolver(
            Arc::new(catalog_with_failover_routes_and_hashed_api_key(
                &key_hash,
                "http://provider-proxy.internal/primary",
                "http://provider-proxy.internal/fallback",
            )),
            hasher,
            dispatcher.clone(),
            fallback_only_secret_resolver(),
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
    let calls = dispatcher.calls();
    assert_eq!(1, calls.len());
    assert_eq!("fallback", calls[0].supplier_code);
    let provider_request = calls[0]
        .provider_request
        .as_ref()
        .expect("provider request");
    assert_eq!(
        Some("http://provider-proxy.internal/fallback/v1/chat/completions"),
        provider_request.url.as_deref()
    );
    assert_eq!(
        Some("Bearer sk-fallback-provider-secret"),
        provider_request
            .headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
    );
}

#[tokio::test]
async fn invocation_router_routes_extended_model_resource_and_percent_encodes_query_model() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let router = sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog_with_encoded_image_model_and_hashed_api_key(
            &key_hash,
        )),
        hasher,
        dispatcher.clone(),
        Some(secret_resolver()),
        None,
        None,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/generations?model=openrouter%2Fgpt-4o-mini%2Blatest")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"prompt":"city skyline","n":1}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let calls = dispatcher.calls();
    assert_eq!(1, calls.len());
    assert_eq!("/v1/images/generations", calls[0].request_path);
    let provider_request = calls[0]
        .provider_request
        .as_ref()
        .expect("provider request");
    assert_eq!("/v1/images/generations", provider_request.path);
    assert_eq!(
        Some("model=gpt-4o-mini%2Blatest"),
        provider_request.query.as_deref()
    );
    assert_eq!(
        Some(
            "http://provider-proxy.internal/openrouter/v1/images/generations?model=gpt-4o-mini%2Blatest"
        ),
        provider_request.url.as_deref()
    );
    let InvocationBody::Json(provider_body) = &provider_request.body else {
        panic!("expected JSON provider request body");
    };
    assert_eq!(None, provider_body.get("model"));
}

#[tokio::test]
async fn invocation_router_returns_provider_error_response_without_usage_settlement() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let usage_recorder = Arc::new(RecordingUsageRecorder::default());
    let router = sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog_with_hashed_api_key(&key_hash)),
        hasher,
        Arc::new(ProviderErrorDispatcher),
        Some(secret_resolver()),
        None,
        Some(usage_recorder.clone()),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-provider-400")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("bad provider request", payload["error"]["message"]);
    assert!(usage_recorder.commands().is_empty());
    let traces = usage_recorder.traces();
    assert_eq!(1, traces.len());
    assert_eq!(Some(400), traces[0].http_status);
    assert_eq!(
        Some("invalid_request_error"),
        traces[0].error_type.as_deref()
    );
}

#[tokio::test]
async fn invocation_router_handles_free_models_resource_without_dispatch() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let router =
        sdkwork_clawrouter_edge_runtime::invocation_router_with_catalog_api_key_hasher_dispatcher_and_secret_resolver(
            Arc::new(catalog_with_hashed_api_key(&key_hash)),
            hasher,
            dispatcher.clone(),
            secret_resolver(),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/models")
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
    assert_eq!("list", payload["object"]);
    assert_eq!("gpt-4o-mini", payload["data"][0]["id"]);
    assert!(dispatcher.calls().is_empty());
}

#[tokio::test]
async fn invocation_router_records_metered_usage_after_settlement() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let usage_recorder = Arc::new(RecordingUsageRecorder::default());
    let router = sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog_with_hashed_api_key(&key_hash)),
        hasher,
        dispatcher,
        Some(secret_resolver()),
        None,
        Some(usage_recorder.clone()),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-invocation-router-usage")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let commands = usage_recorder.commands();
    assert_eq!(2, commands.len());
    let request_id = commands[0].request_id.clone();
    assert_server_generated_request_id(&request_id, "req-invocation-router-usage");
    assert!(commands
        .iter()
        .all(|command| command.request_id == request_id));
    assert_eq!("llm_input_token", commands[0].billing_meter_code);
    assert_eq!("3", commands[0].billable_quantity);
    assert_eq!(3, commands[0].prompt_tokens);
    assert_eq!("llm_output_token", commands[1].billing_meter_code);
    assert_eq!("2", commands[1].billable_quantity);
    assert_eq!(2, commands[1].completion_tokens);
    assert!(commands
        .iter()
        .all(|command| command.supplier_code == "openrouter" && command.account_id == 3001));
    assert!(usage_recorder.traces().is_empty());
}

#[tokio::test]
async fn invocation_router_records_trace_for_free_models_resource() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let usage_recorder = Arc::new(RecordingUsageRecorder::default());
    let router = sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog_with_hashed_api_key(&key_hash)),
        hasher,
        dispatcher.clone(),
        Some(secret_resolver()),
        None,
        Some(usage_recorder.clone()),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/models")
                .header("authorization", "Bearer sk-live-secret")
                .header("x-request-id", "req-invocation-router-models-trace")
                .header("user-agent", "sdkwork-routes-test")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    assert!(dispatcher.calls().is_empty());
    assert!(usage_recorder.commands().is_empty());

    let traces = usage_recorder.traces();
    assert_eq!(1, traces.len());
    let trace = traces.first().unwrap();
    assert_server_generated_request_id(&trace.request_id, "req-invocation-router-models-trace");
    assert_eq!("openai/management/models", trace.catalog_key);
    assert_eq!("management/models", trace.requested_model);
    assert_eq!("/v1/models", trace.request_path);
    assert_eq!("GET", trace.http_method);
    assert_eq!(Some(200), trace.http_status);
    assert_eq!(Some("sdkwork-routes-test"), trace.user_agent.as_deref());
}

#[tokio::test]
async fn invocation_router_resolves_lookup_sticky_route_before_dispatch() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let sticky_store = Arc::new(RecordingStickyRouteStore::with_binding(
        StickyObjectRouteBinding {
            tenant_id: 100001,
            organization_id: 0,
            object_type: "file".to_owned(),
            object_id: "file-sticky-1".to_owned(),
            parent_object_type: None,
            parent_object_id: None,
            supplier_code: "openrouter".to_owned(),
            account_id: 3001,
            account_group_id: Some(10),
            vendor_code: Some("openrouter".to_owned()),
            api_code: Some("openai.files".to_owned()),
            catalog_key: Some("openai/management/files".to_owned()),
            provider_model: Some("openai/management/files".to_owned()),
            region_code: Some("global".to_owned()),
            sticky_scope: Some("object".to_owned()),
        },
    ));
    let router = sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog_with_hashed_api_key(&key_hash)),
        hasher,
        dispatcher.clone(),
        Some(secret_resolver()),
        Some(sticky_store.clone()),
        None,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/files/file-sticky-1")
                .header("authorization", "Bearer sk-live-secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let lookups = sticky_store.lookups();
    assert_eq!(1, lookups.len());
    assert_eq!(10, lookups[0].tenant_id);
    assert_eq!(20, lookups[0].organization_id);
    assert_eq!("file", lookups[0].object_type);
    assert_eq!("file-sticky-1", lookups[0].object_id);

    let calls = dispatcher.calls();
    assert_eq!(1, calls.len());
    assert_eq!("openrouter", calls[0].supplier_code);
    assert_eq!(3001, calls[0].account_id);
}

#[tokio::test]
async fn invocation_router_commits_create_then_sticky_route_after_successful_dispatch() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let sticky_store = Arc::new(RecordingStickyRouteStore::default());
    let router = sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog_with_hashed_api_key(&key_hash)),
        hasher,
        dispatcher,
        Some(secret_resolver()),
        Some(sticky_store.clone()),
        None,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/files")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","purpose":"assistants"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let upserts = sticky_store.upserts();
    assert_eq!(1, upserts.len());
    assert_eq!(10, upserts[0].tenant_id);
    assert_eq!(20, upserts[0].organization_id);
    assert_eq!(Some(101), upserts[0].api_key_id);
    assert_eq!(Some(10), upserts[0].account_group_id);
    assert_eq!("file", upserts[0].object_type);
    assert_eq!("chatcmpl-invocation-router", upserts[0].object_id);
    assert_eq!("openrouter", upserts[0].supplier_code);
    assert_eq!(3001, upserts[0].account_id);
    assert_eq!(
        Some("openai/management/files"),
        upserts[0].catalog_key.as_deref()
    );
    assert_eq!(
        Some("openai/management/files"),
        upserts[0].provider_model.as_deref()
    );
    assert_eq!("object", upserts[0].sticky_scope);
}

#[tokio::test]
async fn invocation_router_dispatches_provider_native_request_with_standard_upstream_path() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let router = sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog_with_hashed_api_key(&key_hash)),
        hasher,
        dispatcher.clone(),
        Some(secret_resolver()),
        None,
        None,
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/kling/v1/videos/text2video")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"prompt":"city skyline","_gateway_usage":{"lines":[{"meter":"api_result","quantity":"1"}]}}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let calls = dispatcher.calls();
    assert_eq!(1, calls.len());
    let provider_request = calls[0]
        .provider_request
        .as_ref()
        .expect("provider request");
    assert_eq!("/v1/videos/text2video", provider_request.path);
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter/v1/videos/text2video"),
        provider_request.url.as_deref()
    );
}

#[tokio::test]
async fn invocation_router_provider_native_adapter_uses_standard_chain_and_records_usage() {
    let captured = Arc::new(Mutex::new(Vec::<CapturedUpstreamRequest>::new()));
    let app = axum::Router::new()
        .route(
            "/providers/openrouter/v1/videos/text2video",
            post(
                |State(captured): State<Arc<Mutex<Vec<CapturedUpstreamRequest>>>>,
                 headers: HeaderMap,
                 Json(body): Json<serde_json::Value>| async move {
                    captured.lock().unwrap().push(CapturedUpstreamRequest {
                        authorization: headers
                            .get("authorization")
                            .and_then(|value| value.to_str().ok())
                            .map(str::to_owned),
                        x_api_key: headers
                            .get("x-api-key")
                            .and_then(|value| value.to_str().ok())
                            .map(str::to_owned),
                        api_key: headers
                            .get("api-key")
                            .and_then(|value| value.to_str().ok())
                            .map(str::to_owned),
                        x_client_trace: headers
                            .get("x-client-trace")
                            .and_then(|value| value.to_str().ok())
                            .map(str::to_owned),
                        body,
                    });
                    Json(json!({
                        "statusCode": 202,
                        "headers": {"content-type": "application/json"},
                        "body": {
                            "id": "video-task-1",
                            "status": "queued",
                            "_gateway_usage": {
                                "lines": [
                                    {"meter": "api_result", "quantity": "1"},
                                    {"meter": "api_item", "quantity": "2"}
                                ]
                            }
                        }
                    }))
                },
            ),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let adapter_base_url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let usage_recorder = Arc::new(RecordingUsageRecorder::default());
    let router =
        sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline_and_provider_adapter_config(
            Arc::new(catalog_with_hashed_api_key(&key_hash)),
            hasher,
            Arc::new(sdkwork_clawrouter_edge_runtime::InvocationHttpDispatcher::for_development()),
            Some(secret_resolver()),
            None,
            Some(usage_recorder.clone()),
            Some(provider_adapter_config(&adapter_base_url)),
            None,
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/kling/v1/videos/text2video")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-request-id", "req-provider-native-adapter")
                .header("x-trace-id", "trace-provider-native-adapter")
                .body(Body::from(r#"{"prompt":"city skyline","duration":8}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::ACCEPTED, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("video-task-1", payload["id"]);

    let calls = captured.lock().unwrap().clone();
    assert_eq!(1, calls.len());
    assert_eq!(
        Some("Bearer adapter-token"),
        calls[0].authorization.as_deref()
    );
    let request_id = calls[0]
        .body
        .pointer("/invocation/requestId")
        .and_then(|value| value.as_str())
        .expect("adapter invocation requestId");
    assert_server_generated_request_id(request_id, "req-provider-native-adapter");
    assert_eq!(
        Some("trace-provider-native-adapter"),
        calls[0]
            .body
            .pointer("/invocation/traceId")
            .and_then(|value| value.as_str())
    );
    assert_eq!(
        Some("text2video"),
        calls[0]
            .body
            .pointer("/invocation/endpointKey")
            .and_then(|value| value.as_str())
    );
    assert_eq!(
        Some("/v1/videos/text2video"),
        calls[0]
            .body
            .pointer("/invocation/standardPath")
            .and_then(|value| value.as_str())
    );
    assert_eq!(
        Some("openrouter"),
        calls[0]
            .body
            .pointer("/provider/providerCode")
            .and_then(|value| value.as_str())
    );
    assert_eq!(
        Some(3001),
        calls[0]
            .body
            .pointer("/provider/channelId")
            .and_then(|value| value.as_i64())
    );
    assert_eq!(
        Some("sk-provider-secret"),
        calls[0]
            .body
            .pointer("/secret/value/auth/value")
            .and_then(|value| value.as_str())
    );
    assert_eq!(
        Some("city skyline"),
        calls[0]
            .body
            .pointer("/body/prompt")
            .and_then(|value| value.as_str())
    );

    let commands = usage_recorder.commands();
    assert_eq!(2, commands.len());
    assert_eq!("api_result", commands[0].billing_meter_code);
    assert_eq!("1", commands[0].billable_quantity);
    assert_eq!("api_item", commands[1].billing_meter_code);
    assert_eq!("2", commands[1].billable_quantity);
    assert!(commands.iter().all(|command| {
        command.request_id == request_id
            && command.supplier_code == "openrouter"
            && command.account_id == 3001
            && command.request_path == "/v1/videos/text2video"
            && command.http_status == 202
    }));

    server.abort();
}

#[tokio::test]
async fn invocation_router_fallback_preserves_explicit_provider_native_routes() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let explicit_hits = Arc::new(Mutex::new(Vec::<String>::new()));
    let invocation_router = sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog_with_hashed_api_key(&key_hash)),
        hasher,
        dispatcher.clone(),
        Some(secret_resolver()),
        None,
        None,
    );
    let router =
        axum::Router::new()
            .route(
                "/provider/kling/{*path}",
                any(
                    |State(explicit_hits): State<Arc<Mutex<Vec<String>>>>,
                     request: Request<Body>| async move {
                        explicit_hits
                            .lock()
                            .unwrap()
                            .push(request.uri().path().to_owned());
                        Json(json!({"id": "explicit-provider-native-route"}))
                    },
                ),
            )
            .with_state(Arc::clone(&explicit_hits))
            .merge(invocation_router);

    let provider_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/kling/v1/videos/text2video")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"prompt":"city skyline"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, provider_response.status());
    let provider_body = axum::body::to_bytes(provider_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let provider_payload: serde_json::Value = serde_json::from_slice(&provider_body).unwrap();
    assert_eq!(
        "explicit-provider-native-route",
        provider_payload["id"].as_str().unwrap()
    );
    assert_eq!(
        vec!["/provider/kling/v1/videos/text2video".to_owned()],
        explicit_hits.lock().unwrap().clone()
    );
    assert!(
        dispatcher.calls().is_empty(),
        "explicit provider-native route must not be swallowed by invocation fallback"
    );

    let openai_response = router
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

    assert_eq!(StatusCode::OK, openai_response.status());
    let calls = dispatcher.calls();
    assert_eq!(1, calls.len());
    assert_eq!("/v1/chat/completions", calls[0].request_path);
    assert_eq!(
        vec!["/provider/kling/v1/videos/text2video".to_owned()],
        explicit_hits.lock().unwrap().clone()
    );
}

#[derive(Debug, Default)]
struct UpstreamCapture {
    requests: Mutex<Vec<CapturedUpstreamRequest>>,
}

#[derive(Debug, Clone)]
struct CapturedUpstreamRequest {
    authorization: Option<String>,
    x_api_key: Option<String>,
    api_key: Option<String>,
    x_client_trace: Option<String>,
    body: serde_json::Value,
}

#[tokio::test]
async fn invocation_http_dispatcher_forwards_provider_request_and_returns_normalized_response() {
    let upstream = Arc::new(UpstreamCapture::default());
    let app = axum::Router::new()
        .route(
            "/openrouter/v1/chat/completions",
            post(
                |State(upstream): State<Arc<UpstreamCapture>>,
                 headers: HeaderMap,
                 Json(body): Json<serde_json::Value>| async move {
                    upstream
                        .requests
                        .lock()
                        .unwrap()
                        .push(CapturedUpstreamRequest {
                            authorization: headers
                                .get("authorization")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            x_api_key: headers
                                .get("x-api-key")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            api_key: headers
                                .get("api-key")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            x_client_trace: headers
                                .get("x-client-trace")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            body,
                        });
                    Json(json!({
                        "id": "chatcmpl-http-dispatch",
                        "object": "chat.completion",
                        "choices": [
                            {
                                "index": 0,
                                "message": {"role": "assistant", "content": "pong"},
                                "finish_reason": "stop"
                            }
                        ],
                        "usage": {
                            "prompt_tokens": 4,
                            "completion_tokens": 3,
                            "total_tokens": 7
                        }
                    }))
                },
            ),
        )
        .with_state(Arc::clone(&upstream));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let router =
        sdkwork_clawrouter_edge_runtime::invocation_router_with_catalog_api_key_hasher_dispatcher_and_secret_resolver(
            Arc::new(catalog_with_hashed_api_key_and_base_url(
                &key_hash,
                &format!("{base_url}/openrouter"),
            )),
            hasher,
            Arc::new(sdkwork_clawrouter_edge_runtime::InvocationHttpDispatcher::for_development()),
            secret_resolver(),
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
    assert_eq!("chatcmpl-http-dispatch", payload["id"]);

    let requests = upstream.requests.lock().unwrap().clone();
    assert_eq!(1, requests.len());
    assert_eq!(
        Some("Bearer sk-provider-secret"),
        requests[0].authorization.as_deref()
    );
    assert!(requests[0].x_api_key.is_none());
    assert!(requests[0].api_key.is_none());
    assert_eq!("gpt-4o-mini-provider", requests[0].body["model"]);

    server.abort();
}

#[tokio::test]
async fn invocation_router_rejects_multiple_api_key_credential_sources() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let dispatcher = Arc::new(CapturingDispatcher::default());
    let router =
        sdkwork_clawrouter_edge_runtime::invocation_router_with_catalog_api_key_hasher_dispatcher_and_secret_resolver(
            Arc::new(catalog_with_hashed_api_key(&key_hash)),
            hasher,
            dispatcher.clone(),
            secret_resolver(),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("x-api-key", "sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("invalid_request", payload["error"]["code"]);
    assert_eq!(
        "multiple API key credential sources are not allowed",
        payload["error"]["message"]
    );
    assert!(
        dispatcher.calls().is_empty(),
        "ambiguous credentials must be rejected before dispatch"
    );
}

#[tokio::test]
async fn invocation_http_dispatcher_forwards_streaming_model_call_as_sse_response() {
    let upstream = Arc::new(UpstreamCapture::default());
    let app = axum::Router::new()
        .route(
            "/openrouter/v1/chat/completions",
            post(
                |State(upstream): State<Arc<UpstreamCapture>>,
                 headers: HeaderMap,
                 Json(body): Json<serde_json::Value>| async move {
                    upstream
                        .requests
                        .lock()
                        .unwrap()
                        .push(CapturedUpstreamRequest {
                            authorization: headers
                                .get("authorization")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            x_api_key: headers
                                .get("x-api-key")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            api_key: headers
                                .get("api-key")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            x_client_trace: headers
                                .get("x-client-trace")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            body,
                        });
                    (
                        [(axum::http::header::CONTENT_TYPE, "text/event-stream")],
                        concat!(
                            "data: {\"id\":\"chatcmpl-stream\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\n",
                            "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":4,\"completion_tokens\":3,\"total_tokens\":7}}\n\n",
                            "data: [DONE]\n\n"
                        ),
                    )
                },
            ),
        )
        .with_state(Arc::clone(&upstream));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let usage_recorder = Arc::new(RecordingUsageRecorder::default());
    let router = sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog_with_hashed_api_key_and_base_url(
            &key_hash,
            &format!("{base_url}/openrouter"),
        )),
        hasher,
        Arc::new(sdkwork_clawrouter_edge_runtime::InvocationHttpDispatcher::for_development()),
        Some(secret_resolver()),
        None,
        Some(usage_recorder.clone()),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","stream":true,"messages":[{"role":"user","content":"ping"}]}"#,
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
            .get(axum::http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
    );
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = std::str::from_utf8(&body).unwrap();
    assert!(body_text.contains("chatcmpl-stream"), "{body_text}");
    assert!(body_text.contains("\"usage\""), "{body_text}");

    let requests = upstream.requests.lock().unwrap().clone();
    assert_eq!(1, requests.len());
    assert_eq!(
        Some("Bearer sk-provider-secret"),
        requests[0].authorization.as_deref()
    );
    assert_eq!("gpt-4o-mini-provider", requests[0].body["model"]);
    assert_eq!(true, requests[0].body["stream"]);

    let commands = wait_for_usage_commands(usage_recorder.as_ref(), 2).await;
    assert_eq!(2, commands.len());
    assert!(commands.iter().all(|command| command.streaming));
    assert_eq!("llm_input_token", commands[0].billing_meter_code);
    assert_eq!("4", commands[0].billable_quantity);
    assert_eq!(4, commands[0].prompt_tokens);
    assert_eq!("llm_output_token", commands[1].billing_meter_code);
    assert_eq!("3", commands[1].billable_quantity);
    assert_eq!(3, commands[1].completion_tokens);

    server.abort();
}

#[tokio::test]
async fn invocation_router_streams_without_buffering_and_retains_idempotency_until_eof() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let (sender, receiver) = mpsc::channel(2);
    let dispatcher = Arc::new(DeferredSseDispatcher::new(receiver));
    let usage_recorder = Arc::new(RecordingUsageRecorder::default());
    let router = sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog_with_hashed_api_key(&key_hash)),
        hasher,
        dispatcher.clone(),
        Some(secret_resolver()),
        None,
        Some(usage_recorder.clone()),
    );

    let build_request = || {
        Request::builder()
            .method("POST")
            .uri("/v1/chat/completions")
            .header("authorization", "Bearer sk-live-secret")
            .header("idempotency-key", "stream-lifecycle-key")
            .header("content-type", "application/json")
            .body(Body::from(
                r#"{"model":"gpt-4o-mini","stream":true,"messages":[{"role":"user","content":"ping"}]}"#,
            ))
            .unwrap()
    };

    let response = tokio::time::timeout(
        Duration::from_millis(250),
        router.clone().oneshot(build_request()),
    )
    .await
    .expect("stream headers must not wait for the provider body")
    .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(1, dispatcher.calls());
    assert!(
        usage_recorder.commands().is_empty(),
        "usage must remain pending while the stream is open"
    );

    let duplicate = router.clone().oneshot(build_request()).await.unwrap();
    assert_eq!(StatusCode::CONFLICT, duplicate.status());
    assert_eq!(
        1,
        dispatcher.calls(),
        "a duplicate in-progress stream must not reach the provider"
    );

    sender
        .send(Bytes::from(
            "data: {\"id\":\"chatcmpl-stream\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\n",
        ))
        .await
        .unwrap();
    let mut body = response.into_body().into_data_stream();
    let first = body.next().await.unwrap().unwrap();
    assert!(std::str::from_utf8(&first)
        .unwrap()
        .contains("chatcmpl-stream"));
    assert!(
        usage_recorder.commands().is_empty(),
        "usage must not be committed before the terminal usage event"
    );

    sender
        .send(Bytes::from(
            "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":4,\"completion_tokens\":3,\"total_tokens\":7}}\n\ndata: [DONE]\n\n",
        ))
        .await
        .unwrap();
    drop(sender);
    while let Some(frame) = body.next().await {
        frame.unwrap();
    }

    let commands = wait_for_usage_commands(usage_recorder.as_ref(), 2).await;
    assert_eq!(2, commands.len());
    assert!(commands.iter().all(|command| command.streaming));
}

#[tokio::test]
async fn invocation_router_times_out_an_unpolled_stream_and_releases_idempotency() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key(&key_hash);
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_upstream_endpoint(
                Some("http://provider-proxy.internal/openrouter"),
                Some("vault://providers/openrouter/account/main"),
            )
            .with_timeout_ms(25)
            .with_retry_policy(ProviderRetryPolicy::new(1, vec![429, 503], 0).unwrap()),
    );
    let dispatcher = Arc::new(StallingSseDispatcher::default());
    let router = sdkwork_clawrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog),
        hasher,
        dispatcher.clone(),
        Some(secret_resolver()),
        None,
        None,
    );
    let build_request = || {
        Request::builder()
            .method("POST")
            .uri("/v1/chat/completions")
            .header("authorization", "Bearer sk-live-secret")
            .header("idempotency-key", "unpolled-stream-timeout-key")
            .header("content-type", "application/json")
            .body(Body::from(
                r#"{"model":"gpt-4o-mini","stream":true,"messages":[{"role":"user","content":"ping"}]}"#,
            ))
            .unwrap()
    };

    let first = router.clone().oneshot(build_request()).await.unwrap();
    assert_eq!(StatusCode::OK, first.status());
    assert_eq!(1, dispatcher.calls());

    let second = tokio::time::timeout(Duration::from_secs(1), async {
        loop {
            let response = router.clone().oneshot(build_request()).await.unwrap();
            if response.status() != StatusCode::CONFLICT {
                return response;
            }
            tokio::time::sleep(Duration::from_millis(5)).await;
        }
    })
    .await
    .expect("the unpolled stream must reach its total deadline");
    assert_eq!(StatusCode::OK, second.status());
    assert_eq!(
        2,
        dispatcher.calls(),
        "terminal timeout must release the in-progress idempotency record"
    );

    drop(first);
    drop(second);
}

#[tokio::test]
async fn invocation_http_dispatcher_forwards_provider_header_auth_after_sanitizing_inbound_keys() {
    let upstream = Arc::new(UpstreamCapture::default());
    let app = axum::Router::new()
        .route(
            "/openrouter/v1/chat/completions",
            post(
                |State(upstream): State<Arc<UpstreamCapture>>,
                 headers: HeaderMap,
                 Json(body): Json<serde_json::Value>| async move {
                    upstream
                        .requests
                        .lock()
                        .unwrap()
                        .push(CapturedUpstreamRequest {
                            authorization: headers
                                .get("authorization")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            x_api_key: headers
                                .get("x-api-key")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            api_key: headers
                                .get("api-key")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            x_client_trace: headers
                                .get("x-client-trace")
                                .and_then(|value| value.to_str().ok())
                                .map(str::to_owned),
                            body,
                        });
                    Json(json!({"id": "chatcmpl-http-dispatch"}))
                },
            ),
        )
        .with_state(Arc::clone(&upstream));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions")
            .with_request_id("req-header-auth")
            .with_body(InvocationBody::Json(json!({"model": "gpt-4o-mini"}))),
        InvocationSubject::anonymous_free(10, 20),
        InvocationResource::free_endpoint(
            "openai/model/chat_completions",
            "openai.chat_completions",
            RoutingCapability::Chat,
        ),
        InvocationBilling::free(),
    );
    invocation.request.headers.insert(
        axum::http::header::AUTHORIZATION,
        axum::http::HeaderValue::from_static("Bearer sk-client-gateway"),
    );
    invocation.request.headers.insert(
        axum::http::HeaderName::from_static("x-api-key"),
        axum::http::HeaderValue::from_static("sk-client-gateway"),
    );
    invocation.request.headers.insert(
        axum::http::HeaderName::from_static("x-client-trace"),
        axum::http::HeaderValue::from_static("trace-1"),
    );
    invocation.dispatch.provider_request = Some(InvocationProviderRequest {
        method: Method::POST,
        url: Some(format!("{base_url}/openrouter/v1/chat/completions")),
        path: "/v1/chat/completions".to_owned(),
        query: None,
        headers: {
            let mut headers = HeaderMap::new();
            headers.insert(
                axum::http::HeaderName::from_static("x-api-key"),
                axum::http::HeaderValue::from_static("sk-provider-header-secret"),
            );
            headers.insert(
                axum::http::HeaderName::from_static("x-client-trace"),
                axum::http::HeaderValue::from_static("trace-1"),
            );
            headers
        },
        body: InvocationBody::Json(json!({"model": "gpt-4o-mini-provider"})),
    });
    let account = InvocationAccount {
        supplier_code: "anthropic".to_owned(),
        account_id: 4001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some(base_url),
        secret_ref: None,
        auth_profile: Default::default(),
        timeout_ms: Some(30_000),
        retry_policy: None,
        provider_model: None,
    };

    let response = sdkwork_clawrouter_edge_runtime::InvocationHttpDispatcher::for_development()
        .dispatch(&invocation, &account)
        .await
        .expect("dispatch");

    assert_eq!(200, response.status_code);
    let requests = upstream.requests.lock().unwrap().clone();
    assert_eq!(1, requests.len());
    assert!(requests[0].authorization.is_none());
    assert_eq!(
        Some("sk-provider-header-secret"),
        requests[0].x_api_key.as_deref()
    );
    assert_eq!(Some("trace-1"), requests[0].x_client_trace.as_deref());

    server.abort();
}

#[tokio::test]
async fn invocation_http_dispatcher_enforces_account_timeout() {
    let app = axum::Router::new().route(
        "/slow",
        post(|| async {
            tokio::time::sleep(Duration::from_millis(100)).await;
            Json(json!({"ok": true}))
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/slow").with_request_id("req-timeout"),
        InvocationSubject::anonymous_free(10, 20),
        InvocationResource::free_endpoint("test/slow", "test.slow", RoutingCapability::Network),
        InvocationBilling::free(),
    );
    invocation.dispatch.provider_request = Some(InvocationProviderRequest {
        method: Method::POST,
        url: Some(format!("{base_url}/slow")),
        path: "/slow".to_owned(),
        query: None,
        headers: HeaderMap::new(),
        body: InvocationBody::Json(json!({"ping": true})),
    });
    let account = InvocationAccount {
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some(base_url),
        secret_ref: None,
        auth_profile: Default::default(),
        timeout_ms: Some(10),
        retry_policy: None,
        provider_model: None,
    };

    let error = sdkwork_clawrouter_edge_runtime::InvocationHttpDispatcher::for_development()
        .dispatch(&invocation, &account)
        .await
        .unwrap_err();

    assert_eq!("provider_http_timeout", error.code);
    assert!(error.retryable);
    assert_eq!(None, error.status_code);

    server.abort();
}

#[tokio::test]
async fn invocation_router_blocks_client_ip_outside_access_policy_allowlist() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key(&key_hash);
    catalog.add_access_policy(GatewayAccessPolicy::new(
        700,
        vec!["chat".to_owned()],
        vec!["192.168.1.10".to_owned()],
    ));
    let mut api_key = GatewayApiKey::new(101, 10, "sk-live", &key_hash);
    api_key = api_key.with_owner(10, 20, 30).with_management_metadata(
        "live",
        "sk-live********",
        Some(700),
        None,
        "",
        None,
    );
    catalog.add_api_key(api_key);

    let router =
        sdkwork_clawrouter_edge_runtime::invocation_router_with_catalog_api_key_hasher_dispatcher_and_secret_resolver(
            Arc::new(catalog),
            hasher,
            Arc::new(CapturingDispatcher::default()),
            secret_resolver(),
        );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .header("x-forwarded-for", "8.8.8.8")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::FORBIDDEN, response.status());
}

#[tokio::test]
async fn invocation_router_enforces_api_key_quota_rate_limit() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let mut catalog = catalog_with_hashed_api_key(&key_hash);
    catalog.add_quota_policy(QuotaPolicy {
        id: 900,
        quota_limit: None,
        requests_per_second: Some(1),
        requests_per_day: None,
        burst_limit: None,
    });
    let mut api_key = GatewayApiKey::new(101, 10, "sk-live", &key_hash);
    api_key = api_key.with_owner(10, 20, 30).with_management_metadata(
        "live",
        "sk-live********",
        None,
        Some(900),
        "",
        None,
    );
    catalog.add_api_key(api_key);

    let router =
        sdkwork_clawrouter_edge_runtime::invocation_router_with_catalog_api_key_hasher_dispatcher_and_secret_resolver(
            Arc::new(catalog),
            hasher,
            Arc::new(CapturingDispatcher::default()),
            secret_resolver(),
        );

    let request = || {
        Request::builder()
            .method("POST")
            .uri("/v1/chat/completions")
            .header("authorization", "Bearer sk-live-secret")
            .header("content-type", "application/json")
            .body(Body::from(
                r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
            ))
            .unwrap()
    };

    let first = router.clone().oneshot(request()).await.unwrap();
    assert_eq!(StatusCode::OK, first.status());

    let second = router.oneshot(request()).await.unwrap();
    assert_eq!(StatusCode::TOO_MANY_REQUESTS, second.status());
}
