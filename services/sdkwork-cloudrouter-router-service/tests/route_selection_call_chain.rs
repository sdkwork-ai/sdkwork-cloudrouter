//! Call-chain diagnostics: agent turns → `/v1/chat/completions` → selector.
//!
//! The web framework remaps OpenAI 503 bodies to generic ProblemDetail 50301
//! (`A required dependency is temporarily unavailable`). These tests capture
//! structured tracing and prove the specific selector stage is recoverable
//! from logs even after the agent wraps the inner 503.

use std::io::{self, Write};
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::api::openai_chat_completions_router_with_relay;
use sdkwork_cloudrouter_router_service::application::{
    diagnose_call_chain_from_logs, ApiKeySecretHasher, RouteSelectionFailureStage,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, ProviderRetryPolicy,
    UpstreamAccountGroup, UpstreamAccountGroupBinding, UpstreamAccountRoute,
    UpstreamAccountRoutingStrategy,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_cloudrouter_router_service::ports::{
    ChatCompletionRelay, ChatCompletionRelayRequest, ChatCompletionRelayResponse,
    UpstreamAccountRouteCatalog,
};
use serde_json::{json, Value};
use tower::ServiceExt;
use tracing_subscriber::fmt::MakeWriter;

const API_SECRET: &str = "sk-standard-secret";
const TRACE_ID: &str = "e49b739840a5421698804114d443710a";

struct SharedBuffer(Arc<Mutex<Vec<u8>>>);

impl<'a> MakeWriter<'a> for SharedBuffer {
    type Writer = BufferWriter;

    fn make_writer(&'a self) -> Self::Writer {
        BufferWriter(Arc::clone(&self.0))
    }
}

struct BufferWriter(Arc<Mutex<Vec<u8>>>);

impl Write for BufferWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        self.0.lock().unwrap().extend_from_slice(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

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
                    Output = sdkwork_cloudrouter_router_service::domain::DomainResult<
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
                json!({
                    "id": "chatcmpl-test",
                    "object": "chat.completion",
                    "model": "gpt-4o-mini",
                    "choices": [{
                        "index": 0,
                        "message": {"role": "assistant", "content": "pong"},
                        "finish_reason": "stop"
                    }],
                    "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}
                }),
            ))
        })
    }
}

fn hasher() -> Arc<HmacSha256ApiKeySecretHasher> {
    Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap())
}

fn catalog_with_callable_account(key_hash: String) -> InMemoryPricingCatalog {
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
            "openai/gpt-4o-mini",
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
    catalog.add_upstream_account_group(
        UpstreamAccountGroup::new(
            10,
            "standard-group",
            "standard",
            DecimalValue::parse("1.000000").unwrap(),
            DecimalValue::parse("1.100000").unwrap(),
        )
        .with_routing_strategy(UpstreamAccountRoutingStrategy::Failover),
    );
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash).with_owner(10, 20, 30));
    for meter in [
        BillingMeter::LlmInputToken,
        BillingMeter::LlmOutputToken,
        BillingMeter::LlmCacheReadToken,
    ] {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            meter.clone(),
            Money::usd("0.150000").unwrap(),
        ));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openai/gpt-4o-mini",
                "gpt-4o-mini",
                PriceSide::UpstreamCost,
                meter,
                Money::usd("0.110000").unwrap(),
            )
            .for_upstream_account("openrouter", 3001),
        );
    }
    catalog
}

fn catalog_without_upstream_snapshot(key_hash: String) -> InMemoryPricingCatalog {
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
    catalog.add_upstream_account_group(UpstreamAccountGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash).with_owner(10, 20, 30));
    catalog
}

async fn post_chat_completions(
    catalog: InMemoryPricingCatalog,
    hasher: Arc<HmacSha256ApiKeySecretHasher>,
) -> (StatusCode, Value, Vec<ChatCompletionRelayRequest>, String) {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = openai_chat_completions_router_with_relay(Arc::new(catalog), hasher, relay);
    let buffer = Arc::new(Mutex::new(Vec::new()));
    let subscriber = tracing_subscriber::fmt()
        .with_writer(SharedBuffer(Arc::clone(&buffer)))
        .with_max_level(tracing::Level::WARN)
        .with_ansi(false)
        .finish();
    let _guard = tracing::subscriber::set_default(subscriber);
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", format!("Bearer {API_SECRET}"))
                .header("content-type", "application/json")
                .header("x-trace-id", TRACE_ID)
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    drop(_guard);
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();
    let captured = captured.lock().unwrap().clone();
    let logs = String::from_utf8_lossy(&buffer.lock().unwrap()).into_owned();
    (status, payload, captured, logs)
}

/// Agent turns wrap the inner `/v1/chat/completions` 503 as business 50301.
fn wrap_as_agent_turn_problem(inner_status: StatusCode, inner_body: &Value) -> Value {
    json!({
        "type": "https://docs.sdkwork.com/problems/50301",
        "title": "Service unavailable",
        "status": 503,
        "detail": format!(
            "cloud router turn failed: provider_error: cloud router chat completion failed: http status {}: {}; Cloud Router 账号池网关暂不可用，请稍后重试",
            inner_status.as_u16(),
            inner_body
        ),
        "instance": "POST /app/v3/api/ai/agents/{agentId}/sessions/{sessionId}/turns",
        "code": 50301,
        "traceId": TRACE_ID,
        "operationId": "agents.turns.stream",
        "i18nKey": "errors.result.50301",
        "locale": "zh-CN"
    })
}

#[tokio::test]
async fn call_chain_logs_diagnose_unhealthy_account_in_default_group() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret(API_SECRET).unwrap();
    let mut catalog = catalog_with_callable_account(key_hash);
    let mut route = catalog.shared_upstream_account_routes()[0].clone();
    route.account_health_status = 0;
    catalog.add_upstream_account_route(route);

    let (status, payload, captured, logs) = post_chat_completions(catalog, hasher).await;
    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, status);
    assert!(captured.is_empty());
    assert!(
        logs.contains("call_chain_stage=\"openai_chat\"")
            || logs.contains("call_chain_stage=openai_chat"),
        "openai_chat stage missing from logs: {logs}"
    );
    assert!(
        logs.contains(TRACE_ID) || logs.contains("createChatCompletion"),
        "trace or operation missing from logs: {logs}"
    );
    assert_eq!(
        Some(RouteSelectionFailureStage::AccountNotCallable),
        diagnose_call_chain_from_logs(&logs),
        "expected unhealthy account stage from logs: {logs}"
    );
    assert!(
        logs.contains("reject_reason=\"unhealthy\"") || logs.contains("reject_reason=unhealthy"),
        "rejected account reason missing: {logs}"
    );

    let agent_problem = wrap_as_agent_turn_problem(status, &payload);
    assert_eq!(50301, agent_problem["code"]);
    assert!(agent_problem["detail"]
        .as_str()
        .unwrap()
        .contains("账号池网关暂不可用"));
    assert_eq!(
        Some(RouteSelectionFailureStage::AccountNotCallable),
        diagnose_call_chain_from_logs(&logs),
        "agent 50301 must still be diagnosed from router logs"
    );
}

#[tokio::test]
async fn call_chain_logs_diagnose_missing_credential_when_account_is_in_group() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret(API_SECRET).unwrap();
    let mut catalog = catalog_with_callable_account(key_hash);
    let mut route = catalog.shared_upstream_account_routes()[0].clone();
    route.secret_ref = None;
    route.auth_profile = Default::default();
    catalog.add_upstream_account_route(route);

    let (status, _payload, captured, logs) = post_chat_completions(catalog, hasher).await;
    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, status);
    assert!(captured.is_empty());
    assert_eq!(
        Some(RouteSelectionFailureStage::AccountNotCallable),
        diagnose_call_chain_from_logs(&logs),
        "missing credential must classify as account_not_callable: {logs}"
    );
    assert!(
        logs.contains("missing_credential") || logs.contains("has_credential=false"),
        "credential rejection not logged: {logs}"
    );
}

#[tokio::test]
async fn call_chain_logs_diagnose_api_scope_mismatch_as_no_group_bindings() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret(API_SECRET).unwrap();
    let mut catalog = catalog_with_callable_account(key_hash);
    let mut route = catalog.shared_upstream_account_routes()[0].clone();
    route.account_group_bindings = vec![UpstreamAccountGroupBinding {
        account_group_id: 10,
        priority: 100,
        weight: 100,
        api_scope: vec!["openai.embeddings".to_owned()],
        capabilities: vec![],
        resource_entitlements: None,
        cost_multiplier_override: None,
    }];
    catalog.add_upstream_account_route(route);

    let (status, _payload, captured, logs) = post_chat_completions(catalog, hasher).await;
    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, status);
    assert!(captured.is_empty());
    assert_eq!(
        Some(RouteSelectionFailureStage::NoGroupBindings),
        diagnose_call_chain_from_logs(&logs),
        "api_scope mismatch must classify as no_group_bindings: {logs}"
    );
}

#[tokio::test]
async fn call_chain_logs_diagnose_empty_snapshot() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret(API_SECRET).unwrap();
    let catalog = catalog_without_upstream_snapshot(key_hash);

    let (status, payload, captured, logs) = post_chat_completions(catalog, hasher).await;
    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, status);
    assert_eq!(
        "upstream_route_snapshot_empty",
        payload["error"]["code"].as_str().unwrap()
    );
    assert!(captured.is_empty());
    assert_eq!(
        Some(RouteSelectionFailureStage::SnapshotEmpty),
        diagnose_call_chain_from_logs(&logs),
        "empty snapshot not diagnosed: {logs}"
    );
}

#[tokio::test]
async fn call_chain_does_not_emit_route_selection_failure_when_account_is_callable() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret(API_SECRET).unwrap();
    let catalog = catalog_with_callable_account(key_hash);

    let (status, _payload, captured, logs) = post_chat_completions(catalog, hasher).await;
    assert_eq!(StatusCode::OK, status);
    assert_eq!(1, captured.len());
    assert!(
        diagnose_call_chain_from_logs(&logs).is_none(),
        "success path must not emit a failure stage: {logs}"
    );
}

#[tokio::test]
async fn call_chain_503_response_carries_exact_route_reason_headers() {
    let hasher = hasher();
    let key_hash = hasher.hash_secret(API_SECRET).unwrap();
    let mut catalog = catalog_with_callable_account(key_hash);
    let mut route = catalog.shared_upstream_account_routes()[0].clone();
    route.account_health_status = 0;
    catalog.add_upstream_account_route(route);

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(RecordingRelay::new(Arc::clone(&captured)));
    let router = openai_chat_completions_router_with_relay(Arc::new(catalog), hasher, relay);
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", format!("Bearer {API_SECRET}"))
                .header("content-type", "application/json")
                .header("x-trace-id", TRACE_ID)
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::SERVICE_UNAVAILABLE, response.status());

    let stage = response
        .headers()
        .get("x-sdkwork-route-stage")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_owned();
    let reason = response
        .headers()
        .get("x-sdkwork-route-reason")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_owned();

    assert_eq!("account_not_callable", stage);
    assert!(
        !reason.is_empty(),
        "503 must carry the exact route selection reason for debugging"
    );
    assert!(
        reason.contains("supports") || reason.contains("callable") || reason.contains("account"),
        "reason should describe the rejection: {reason}"
    );
}
