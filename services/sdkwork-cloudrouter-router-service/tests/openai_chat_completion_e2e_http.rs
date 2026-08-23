//! End-to-end `/v1/chat/completions` tests that exercise the FULL call chain:
//!
//!   POST /v1/chat/completions
//!     → 鉴权 (api key)
//!     → 模型解析 / 能力校验
//!     → 路由账号选择 (account group → account route)
//!     → secret 解析 (ProviderSecretResolver)
//!     → 真实上游 HTTP 调用 (local mock provider serving the routing target API)
//!     → 响应回传
//!
//! 与 `openai_chat_api.rs`（用 `RecordingRelay` 模拟，不真正调用上游）不同，
//! 这里用 `SecretRefOpenAiCompatibleChatCompletionRelay`（Development target policy）
//! 真正打到本地 mock 上游，证明「路由账号能一直调到路由目标的 API」。

use std::collections::HashMap;
use std::num::NonZeroUsize;
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::extract::State;
use axum::http::header::CONTENT_TYPE;
use axum::http::{HeaderMap, Request, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use sdkwork_cloudrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, DomainError, DomainResult, GatewayApiKey, ModelPrice,
    ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    ProviderRetryPolicy, UpstreamAccountGroup, UpstreamAccountRoute, UpstreamAccountRoutingStrategy,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::infrastructure::provider::{
    SecretRefOpenAiCompatibleChatCompletionRelay, SecretRefOpenAiCompatibleChatCompletionStreamRelay,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_cloudrouter_router_service::ports::{
    GatewayUsageRecordCommand, GatewayUsageRecorder, GatewayUsageRecordFuture,
    ProviderSecretResolver,
};
use serde_json::{json, Value};
use tower::ServiceExt;

const API_SECRET: &str = "sk-e2e-gateway-secret";
const UPSTREAM_SECRET: &str = "sk-upstream-routing-target-secret";
const SECRET_REF: &str = "vault://providers/openrouter/account/main";

/// Each test router gets its OWN response memory budget. The secret-ref
/// relays otherwise share a process-global 512 MiB budget where every request
/// reserves `response_max_bytes × 4` = 256 MiB, so parallel test cases
/// saturate it with `provider_response_memory_saturated`. Isolating the
/// budget per router (the same pattern the production per-tenant runtime
/// uses) lets tests run in parallel without global serialization.
const TEST_RESPONSE_MEMORY_BUDGET_BYTES: usize = 256 * 1024 * 1024;

fn test_response_memory_budget() -> sdkwork_cloudrouter_router_service::infrastructure::provider::ProviderResponseMemoryBudget {
    sdkwork_cloudrouter_router_service::infrastructure::provider::ProviderResponseMemoryBudget::new(
        NonZeroUsize::new(TEST_RESPONSE_MEMORY_BUDGET_BYTES)
            .expect("test response memory budget must be nonzero"),
    )
    .expect("test response memory budget must be valid")
}

#[derive(Debug, Default)]
struct CapturedUpstreamRequest {
    authorization: Option<String>,
    body: Value,
}

/// A real secret resolver that maps `SECRET_REF` → `UPSTREAM_SECRET`, mirroring
/// the production vault-backed resolver behavior.
#[derive(Debug, Clone)]
struct MapSecretResolver {
    secrets: HashMap<String, String>,
}

impl ProviderSecretResolver for MapSecretResolver {
    fn resolve_secret_value(&self, secret_ref: &str) -> DomainResult<String> {
        self.secrets
            .get(secret_ref)
            .cloned()
            .ok_or_else(|| DomainError::new(format!("secret ref not found: {secret_ref}")))
    }
}

/// A usage recorder that captures every usage record command so the test can
/// assert billing was settled end-to-end after the upstream call.
#[derive(Debug, Default)]
struct RecordingUsageRecorder {
    records: Mutex<Vec<GatewayUsageRecordCommand>>,
}

impl RecordingUsageRecorder {
    fn new() -> Self {
        Self::default()
    }

    fn records(&self) -> Vec<GatewayUsageRecordCommand> {
        self.records.lock().unwrap().clone()
    }
}

impl GatewayUsageRecorder for RecordingUsageRecorder {
    fn record_gateway_usage<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        self.records.lock().unwrap().push(command);
        Box::pin(async { Ok(()) })
    }
}

fn hasher() -> Arc<HmacSha256ApiKeySecretHasher> {
    Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap())
}

/// Builds an `InMemoryPricingCatalog` whose routing account base_url points at
/// the provided local mock provider address, with full composite pricing.
fn catalog_for_upstream_base_url(
    key_hash: String,
    provider_base_url: &str,
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
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter",
            3001,
            "openai/gpt-4o-mini",
        )
        .with_upstream_endpoint(Some(provider_base_url), Some(SECRET_REF))
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(1, vec![429, 503], 0).unwrap()),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_upstream_endpoint(Some(provider_base_url), Some(SECRET_REF))
            .with_timeout_ms(30_000)
            .with_retry_policy(ProviderRetryPolicy::new(1, vec![429, 503], 0).unwrap())
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
    for (meter, official, upstream) in [
        (BillingMeter::LlmInputToken, "0.150000", "0.110000"),
        (BillingMeter::LlmOutputToken, "0.600000", "0.440000"),
        (BillingMeter::LlmCacheReadToken, "0.075000", "0.055000"),
    ] {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            meter.clone(),
            Money::usd(official).unwrap(),
        ));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openai/gpt-4o-mini",
                "gpt-4o-mini",
                PriceSide::UpstreamCost,
                meter,
                Money::usd(upstream).unwrap(),
            )
            .for_upstream_account("openrouter", 3001),
        );
    }
    catalog
}

/// Builds the full router (both secret-ref relays + a recording usage
/// recorder) in one call, ready to serve real requests end-to-end.
fn build_router_with_usage(
    catalog: Arc<InMemoryPricingCatalog>,
    usage_recorder: Arc<RecordingUsageRecorder>,
) -> axum::Router {
    let resolver = Arc::new(MapSecretResolver {
        secrets: HashMap::from([(SECRET_REF.to_owned(), UPSTREAM_SECRET.to_owned())]),
    });
    let budget = test_response_memory_budget();
    let relay = Arc::new(
        SecretRefOpenAiCompatibleChatCompletionRelay::for_local_development(resolver.clone())
            .with_shared_response_memory_budget(budget.clone()),
    );
    let stream_relay = Arc::new(
        SecretRefOpenAiCompatibleChatCompletionStreamRelay::for_local_development(resolver)
            .with_shared_response_memory_budget(budget),
    );
    sdkwork_cloudrouter_router_service::api::openai_chat_completions_router_with_relays_and_usage_recorder(
        catalog,
        hasher(),
        relay,
        stream_relay,
        usage_recorder,
    )
}

#[tokio::test]
async fn e2e_chat_completion_reaches_routing_target_api_and_relays_response() {
    // 1. Start a real local mock provider that plays the role of the routing
    //    target's upstream API.
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/chat/completions", post(capture_chat_completion))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    // 2. Point the routing account at the local provider.
    let key_hash = hasher().hash_secret(API_SECRET).unwrap();
    let provider_base_url = format!("http://{addr}");
    let catalog = Arc::new(catalog_for_upstream_base_url(key_hash, &provider_base_url));

    let usage_recorder = Arc::new(RecordingUsageRecorder::new());
    let router = build_router_with_usage(catalog, usage_recorder.clone());

    // 3. Send a real request through the whole chain.
    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", format!("Bearer {API_SECRET}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("chatcmpl-e2e-upstream", payload["id"]);

    // 4. The routing target API was actually called: exactly one upstream hit,
    //    carrying the account's resolved secret and the provider model.
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len(), "routing target API must be called exactly once");
    assert_eq!(
        Some(format!("Bearer {UPSTREAM_SECRET}")),
        captured[0].authorization,
        "upstream must receive the resolved account credential"
    );
    assert_eq!("gpt-4o-mini", captured[0].body["model"]);
    assert_eq!("ping", captured[0].body["messages"][0]["content"]);
    assert_eq!(Some(false), captured[0].body["stream"].as_bool());

    // 5. Usage was recorded after the real upstream success.
    let usage = usage_recorder.records();
    assert!(!usage.is_empty(), "usage must be recorded after upstream success");
    assert_eq!(3, usage.len());
    for meter_code in ["llm_input_token", "llm_output_token", "llm_cache_read_token"] {
        assert!(
            usage.iter().any(|r| r.billing_meter_code == meter_code),
            "missing {meter_code} usage record"
        );
    }
}

#[tokio::test]
async fn e2e_chat_completion_stream_reaches_routing_target_api() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/chat/completions", post(capture_chat_stream))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let key_hash = hasher().hash_secret(API_SECRET).unwrap();
    let provider_base_url = format!("http://{addr}");
    let catalog = Arc::new(catalog_for_upstream_base_url(key_hash, &provider_base_url));
    let router = build_router_with_usage(catalog, Arc::new(RecordingUsageRecorder::new()));

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", format!("Bearer {API_SECRET}"))
                .header("content-type", "application/json")
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
    assert!(
        body.contains("chatcmpl-e2e-upstream-stream"),
        "streamed body must be relayed from upstream: {body}"
    );
    assert!(body.contains("data: [DONE]"));

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len(), "routing target API must be called exactly once");
    assert_eq!(
        Some(format!("Bearer {UPSTREAM_SECRET}")),
        captured[0].authorization,
        "upstream stream must receive the resolved account credential"
    );
    assert_eq!("gpt-4o-mini", captured[0].body["model"]);
}

#[tokio::test]
async fn e2e_chat_completion_routing_account_error_is_reported_as_502_not_leaked() {
    // A routing account that cannot be reached (no server on the port) must
    // fail over through the relay and surface a 502/503, never leaking secrets.
    let key_hash = hasher().hash_secret(API_SECRET).unwrap();
    // Grab a port that is likely unused by binding then dropping the listener.
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    drop(listener);

    let catalog = Arc::new(catalog_for_upstream_base_url(key_hash, &format!("http://{addr}")));
    let router = build_router_with_usage(catalog, Arc::new(RecordingUsageRecorder::new()));

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", format!("Bearer {API_SECRET}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(
        response.status().is_server_error(),
        "unreachable routing account must yield a server error, got {}",
        response.status()
    );
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(
        !body.contains(UPSTREAM_SECRET),
        "error response must never leak the upstream account secret"
    );
    assert!(!body.contains(SECRET_REF));
}

async fn capture_chat_completion(
    State(captured): State<Arc<Mutex<Vec<CapturedUpstreamRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> (StatusCode, Json<Value>) {
    captured.lock().unwrap().push(CapturedUpstreamRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::OK,
        Json(json!({
            "id": "chatcmpl-e2e-upstream",
            "object": "chat.completion",
            "model": "gpt-4o-mini",
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": "pong"},
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 3, "completion_tokens": 5, "total_tokens": 8}
        })),
    )
}

async fn capture_chat_stream(
    State(captured): State<Arc<Mutex<Vec<CapturedUpstreamRequest>>>>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> (
    StatusCode,
    [(axum::http::HeaderName, &'static str); 1],
    Body,
) {
    captured.lock().unwrap().push(CapturedUpstreamRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::OK,
        [(CONTENT_TYPE, "text/event-stream")],
        Body::from(
            "data: {\"id\":\"chatcmpl-e2e-upstream-stream\",\"choices\":[{\"delta\":{\"content\":\"pong\"}}]}\n\ndata: [DONE]\n\n",
        ),
    )
}
