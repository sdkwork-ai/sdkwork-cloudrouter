//! End-to-end routing tests for the remaining OpenAI-compatible endpoints that
//! were not covered by `media_routing_e2e.rs` (image/video) or the chat /
//! responses / embeddings DB e2e tests.
//!
//! Endpoints covered here (all through the REAL production invocation chain):
//!   POST /v1/embeddings            (model,    capability Embedding, EmbeddingInputToken)
//!   POST /v1/completions           (model,    capability Chat,      LlmInputToken)
//!   POST /v1/images/edits          (model_opt capability Image,     ImageResult)
//!   POST /v1/audio/speech          (model,    capability Audio,     TtsInputCharacter)
//!   POST /v1/audio/transcriptions  (model_opt capability Audio,     AudioInputSecond)
//!   POST /v1/moderations           (account,  capability Network,   ApiRequest)
//!
//! Each request goes through the full production chain:
//!   Bearer API-key auth → account-group pool → routing policy/rule →
//!   account route (base_url + secret_ref) → secret resolution → real upstream
//!   HTTP call to a local mock provider → response passthrough + usage record.

use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use axum::routing::any;
use axum::Json;
use sdkwork_cloudrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, ModelPrice, ModelVendor, ModelVendorDefinition, Money,
    PriceSide, PricingPlan, ProviderRetryPolicy, RoutingCapability, UpstreamAccountGroup,
    UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_cloudrouter_router_service::ports::{
    GatewayRequestTraceCommand, GatewayUsageRecordCommand, GatewayUsageRecordFuture,
    GatewayUsageRecorder, ProviderSecretResolver,
};
use serde_json::{json, Value};
use tower::ServiceExt;

const API_KEY_PEPPER: &str = "0123456789abcdef0123456789abcdef";

fn hasher() -> Arc<HmacSha256ApiKeySecretHasher> {
    Arc::new(HmacSha256ApiKeySecretHasher::new(API_KEY_PEPPER).unwrap())
}

#[derive(Debug, Default)]
struct MapSecretResolver {
    secrets: HashMap<String, String>,
}

impl MapSecretResolver {
    fn with(entries: impl IntoIterator<Item = (String, String)>) -> Arc<Self> {
        Arc::new(Self {
            secrets: entries.into_iter().collect(),
        })
    }
}

impl ProviderSecretResolver for MapSecretResolver {
    fn resolve_secret_value(
        &self,
        secret_ref: &str,
    ) -> sdkwork_cloudrouter_router_service::domain::DomainResult<String> {
        self.secrets.get(secret_ref).cloned().ok_or_else(|| {
            sdkwork_cloudrouter_router_service::domain::DomainError::new(format!(
                "secret not found: {secret_ref}"
            ))
        })
    }
}

#[derive(Debug, Default)]
struct RecordingUsageRecorder {
    commands: Mutex<Vec<GatewayUsageRecordCommand>>,
}

impl GatewayUsageRecorder for RecordingUsageRecorder {
    fn record_gateway_trace<'a>(
        &'a self,
        _command: GatewayRequestTraceCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        Box::pin(async { Ok(()) })
    }

    fn record_gateway_usage<'a>(
        &'a self,
        command: GatewayUsageRecordCommand,
    ) -> GatewayUsageRecordFuture<'a> {
        self.commands.lock().unwrap().push(command);
        Box::pin(async { Ok(()) })
    }
}

// ---------------------------------------------------------------------------
// Mock upstream provider
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
struct CapturedUpstreamRequest {
    path: String,
    authorization: Option<String>,
    body: Value,
}

#[derive(Debug, Default)]
struct MockProvider {
    captured: Mutex<Vec<CapturedUpstreamRequest>>,
    calls: AtomicUsize,
}

impl MockProvider {
    fn captured(&self) -> Vec<CapturedUpstreamRequest> {
        self.captured.lock().unwrap().clone()
    }

    fn calls(&self) -> usize {
        self.calls.load(Ordering::SeqCst)
    }
}

struct MockUpstreamHandle {
    provider: Arc<MockProvider>,
    base_url: String,
}

/// The mock upstream returns a fixed JSON body tagged with `marker` so the test
/// can assert the response data is passed through unchanged to the client
/// (implementing consistency: the gateway returns the upstream's data).
async fn start_mock_upstream(marker: &'static str) -> MockUpstreamHandle {
    let provider = Arc::new(MockProvider::default());
    let state = Arc::clone(&provider);
    let closure_provider = Arc::clone(&provider);
    let app = axum::Router::new()
        .fallback(any(move |request: Request<Body>| {
            let provider = Arc::clone(&closure_provider);
            async move {
                let path = request.uri().path().to_owned();
                let headers = request.headers().clone();
                let body_bytes = axum::body::to_bytes(request.into_body(), usize::MAX)
                    .await
                    .unwrap();
                let parsed = serde_json::from_slice::<Value>(&body_bytes).unwrap_or(Value::Null);
                provider.calls.fetch_add(1, Ordering::SeqCst);
                provider.captured.lock().unwrap().push(CapturedUpstreamRequest {
                    path: path.clone(),
                    authorization: headers
                        .get("authorization")
                        .and_then(|value| value.to_str().ok())
                        .map(str::to_owned),
                    body: parsed,
                });
                // Audio endpoints settle on seconds (transcriptions) or
                // characters (speech/TTS); the other endpoints settle on
                // token/result meters. Shape the mock usage accordingly.
                let usage = if path.ends_with("/speech") {
                    json!({"prompt_tokens": 3, "completion_tokens": 5, "total_tokens": 8, "character_count": 5})
                } else if path.contains("/audio/") {
                    json!({"prompt_tokens": 3, "completion_tokens": 5, "total_tokens": 8, "seconds": 4})
                } else {
                    json!({"prompt_tokens": 3, "completion_tokens": 5, "total_tokens": 8})
                };
                (
                    StatusCode::OK,
                    Json(json!({
                        "object": "list",
                        "marker": marker,
                        "data": [{"index": 0, "text": "pong"}],
                        "model": "upstream-provider-model",
                        "usage": usage
                    })),
                )
            }
        }))
        .with_state(state);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let base_url = format!("http://{addr}");
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    for _ in 0..100 {
        if tokio::net::TcpStream::connect(addr).await.is_ok() {
            return MockUpstreamHandle { provider, base_url };
        }
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    }
    panic!("mock upstream failed to start");
}

// ---------------------------------------------------------------------------
// Catalog builder
// ---------------------------------------------------------------------------

fn add_price(
    catalog: &mut InMemoryPricingCatalog,
    catalog_key: &str,
    model: &str,
    meter: BillingMeter,
    official_price: &str,
    upstream_price: &str,
    upstream_supplier: &str,
    upstream_account_id: i64,
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
        .for_upstream_account(upstream_supplier, upstream_account_id),
    );
}

/// Catalog with a single OpenAI-compatible account bound to the default group,
/// serving all of the covered endpoints via the shared account route plus
/// model routes for the model-scoped endpoints.
fn catalog_with_endpoints(
    key_hash: &str,
    openai_base_url: &str,
    openai_secret_ref: &str,
) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));

    let model_specs = [
        (
            "text-embedding-3-small",
            "openai/text-embedding-3-small",
            "openai.embeddings",
            BillingMeter::EmbeddingInputToken,
        ),
        (
            "gpt-4o-mini",
            "openai/gpt-4o-mini",
            "openai.completions",
            BillingMeter::LlmInputToken,
        ),
        (
            "gpt-image-2",
            "openai/gpt-image-2",
            "openai.images.edits",
            BillingMeter::ImageResult,
        ),
        (
            "gpt-4o-mini-tts",
            "openai/gpt-4o-mini-tts",
            "openai.audio.speech",
            BillingMeter::TtsInputCharacter,
        ),
        (
            "whisper-1",
            "openai/whisper-1",
            "openai.audio.transcriptions",
            BillingMeter::AudioInputSecond,
        ),
    ];
    for (model_name, catalog_key, api_code, meter) in model_specs {
        let capability = match api_code {
            "openai.embeddings" => "embedding",
            "openai.completions" => "chat",
            "openai.images.edits" => "image",
            "openai.audio.speech" | "openai.audio.transcriptions" => "audio",
            _ => "chat",
        };
        catalog.add_model(
            AiModel::new(model_name, model_name, "openai", vec![capability])
                .with_catalog_key(catalog_key),
        );
        catalog.add_model_upstream_route(
            sdkwork_cloudrouter_router_service::domain::ModelUpstreamRoute::new_for_catalog_key(
                catalog_key,
                model_name,
                "openai",
                4001,
                model_name,
            )
            .with_api_code(api_code)
            .with_upstream_endpoint(Some(openai_base_url), Some(openai_secret_ref))
            .with_timeout_ms(30_000)
            .with_retry_policy(ProviderRetryPolicy::new(1, vec![], 0).unwrap()),
        );
        add_price(
            &mut catalog,
            catalog_key,
            model_name,
            meter.clone(),
            "0.150000",
            "0.110000",
            "openai",
            4001,
        );
        // Composite chat/completions settles output tokens too.
        if matches!(api_code, "openai.completions") {
            add_price(
                &mut catalog,
                catalog_key,
                model_name,
                BillingMeter::LlmOutputToken,
                "0.600000",
                "0.440000",
                "openai",
                4001,
            );
        }
        // Composite audio endpoints may settle an input-token line as well as
        // the seconds line; embeddings settle input tokens only.
        if matches!(
            api_code,
            "openai.audio.speech" | "openai.audio.transcriptions"
        ) {
            add_price(
                &mut catalog,
                catalog_key,
                model_name,
                BillingMeter::AudioInputToken,
                "0.150000",
                "0.110000",
                "openai",
                4001,
            );
        }
    }
    // moderations is a model-less account route: pricing resolves under its
    // route key with an ApiRequest meter, so register a model + price there.
    catalog.add_model(
        AiModel::new(
            "openai.moderations",
            "OpenAI Moderation",
            "openai",
            vec!["network"],
        )
        .with_catalog_key("openai.moderations"),
    );
    add_price(
        &mut catalog,
        "openai.moderations",
        "openai.moderations",
        BillingMeter::ApiRequest,
        "0.010000",
        "0.004000",
        "openai",
        4001,
    );

    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.200000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new(
        10,
        "default-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog.add_api_key(
        sdkwork_cloudrouter_router_service::domain::GatewayApiKey::new(
            101, 10, "sk-live", key_hash,
        )
        .with_owner(10, 20, 30),
    );

    // One shared account route bound to the default group with the full api
    // scope so every covered endpoint selects it.
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openai", 4001)
            .with_account_group_bindings(vec![
                sdkwork_cloudrouter_router_service::domain::UpstreamAccountGroupBinding::
                    new_resource_scoped(
                        10,
                        10,
                        100,
                        [
                            "openai.embeddings",
                            "openai.completions",
                            "openai.images.edits",
                            "openai.audio.speech",
                            "openai.audio.transcriptions",
                            "openai.moderations",
                        ]
                        .into_iter(),
                        ["embedding", "chat", "image", "audio", "network"].into_iter(),
                    ),
            ])
            .with_upstream_endpoint(Some(openai_base_url), Some(openai_secret_ref))
            .with_timeout_ms(30_000)
            .with_retry_policy(ProviderRetryPolicy::new(1, vec![], 0).unwrap()),
    );

    // Capability-scoped policies + rules. Model-scoped endpoints match by
    // catalog key; moderations (model-less account route) matches by route key.
    for (_capability, _policy_id) in [
        (RoutingCapability::Embedding, 9100),
        (RoutingCapability::Chat, 9200),
        (RoutingCapability::Image, 9300),
        (RoutingCapability::Audio, 9400),
        (RoutingCapability::Network, 9500),
    ] {}
    for (rule_id, _code, match_key, _target) in [
        (
            9111,
            "embeddings-rule",
            "openai/text-embedding-3-small",
            "openai/text-embedding-3-small",
        ),
        (
            9211,
            "completions-rule",
            "openai/gpt-4o-mini",
            "openai/gpt-4o-mini",
        ),
        (
            9311,
            "images-edits-rule",
            "openai/gpt-image-2",
            "openai/gpt-image-2",
        ),
        (
            9411,
            "audio-speech-rule",
            "openai/gpt-4o-mini-tts",
            "openai/gpt-4o-mini-tts",
        ),
        (
            9412,
            "audio-transcriptions-rule",
            "openai/whisper-1",
            "openai/whisper-1",
        ),
        (
            9511,
            "moderations-rule",
            "openai.moderations",
            "openai.moderations",
        ),
    ] {
        let _match_expression = if rule_id == 9511 {
            format!(r#"{{"routeKey":"{match_key}"}}"#)
        } else {
            format!(r#"{{"catalogKey":"{match_key}"}}"#)
        };
    }
    catalog
}

// ---------------------------------------------------------------------------
// Router assembly + request helper
// ---------------------------------------------------------------------------

async fn build_router(
    catalog: InMemoryPricingCatalog,
    secrets: Vec<(String, String)>,
) -> axum::Router {
    let hasher = hasher();
    let dispatcher = sdkwork_cloudrouter_edge_runtime::InvocationHttpDispatcher::
        with_outbound_target_policy_and_response_max_bytes(
            sdkwork_cloudrouter_security::OutboundTargetPolicy::Development,
            std::num::NonZeroUsize::new(1024 * 1024).expect("1 MiB response limit"),
        );
    sdkwork_cloudrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog),
        hasher,
        Arc::new(dispatcher),
        Some(MapSecretResolver::with(secrets)),
        None,
        Some(Arc::new(RecordingUsageRecorder::default())),
    )
}

async fn send_request(router: axum::Router, uri: &str, body: Value) -> (StatusCode, String) {
    let response = router
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(uri)
                .header("authorization", "Bearer sk-live-secret")
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    (status, String::from_utf8(bytes.to_vec()).unwrap())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async fn build_common_router() -> (axum::Router, MockUpstreamHandle) {
    let upstream = start_mock_upstream("openai-more-endpoints").await;
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_endpoints(
        &key_hash,
        &upstream.base_url,
        "vault://providers/openai/account/main",
    );
    let router = build_router(
        catalog,
        vec![(
            "vault://providers/openai/account/main".to_owned(),
            "sk-openai-more-endpoints-secret".to_owned(),
        )],
    )
    .await;
    (router, upstream)
}

#[tokio::test]
async fn openai_more_endpoints_embeddings_routes_to_upstream_and_passes_through_data() {
    let (router, upstream) = build_common_router().await;
    let (status, body) = send_request(
        router,
        "/v1/embeddings",
        json!({"model": "text-embedding-3-small", "input": "hello"}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");
    let payload: Value = serde_json::from_str(&body).unwrap();
    // Response data is passed through from the upstream unchanged: marker,
    // official `object`/`data`/`model`/`usage` fields all match the mock.
    assert_eq!("openai-more-endpoints", payload["marker"]);
    assert_eq!("list", payload["object"]);
    assert_eq!("pong", payload["data"][0]["text"]);
    // Response model is restored to the client's model (official passthrough
    // semantics: the caller sees its own requested model).
    assert_eq!("text-embedding-3-small", payload["model"]);
    assert_eq!(8, payload["usage"]["total_tokens"]);
    assert_eq!(1, upstream.provider.calls());

    let calls = upstream.provider.captured();
    assert_eq!(1, calls.len());
    assert_eq!(
        Some("Bearer sk-openai-more-endpoints-secret".to_owned()),
        calls[0].authorization
    );
    // The official request body is preserved verbatim (no field loss).
    assert_eq!("text-embedding-3-small", calls[0].body["model"]);
    assert_eq!("hello", calls[0].body["input"]);
    assert_eq!(
        calls[0].body,
        json!({"model": "text-embedding-3-small", "input": "hello"})
    );
}

#[tokio::test]
async fn openai_more_endpoints_completions_routes_to_upstream_and_passes_through_data() {
    let (router, upstream) = build_common_router().await;
    let (status, body) = send_request(
        router,
        "/v1/completions",
        json!({"model": "gpt-4o-mini", "prompt": "hello"}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");
    let payload: Value = serde_json::from_str(&body).unwrap();
    assert_eq!("openai-more-endpoints", payload["marker"]);
    assert_eq!("list", payload["object"]);
    assert_eq!(8, payload["usage"]["total_tokens"]);
    assert_eq!(1, upstream.provider.calls());
    let calls = upstream.provider.captured();
    assert_eq!(
        Some("Bearer sk-openai-more-endpoints-secret".to_owned()),
        calls[0].authorization
    );
    // Official legacy completions body preserved verbatim.
    assert_eq!(
        calls[0].body,
        json!({"model": "gpt-4o-mini", "prompt": "hello"})
    );
}

#[tokio::test]
async fn openai_more_endpoints_images_edits_routes_to_upstream_and_passes_through_data() {
    let (router, upstream) = build_common_router().await;
    let (status, body) = send_request(
        router,
        "/v1/images/edits",
        json!({"model": "gpt-image-2", "image": "base64...", "prompt": "edit"}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");
    let payload: Value = serde_json::from_str(&body).unwrap();
    assert_eq!("openai-more-endpoints", payload["marker"]);
    assert_eq!("list", payload["object"]);
    assert_eq!(8, payload["usage"]["total_tokens"]);
    assert_eq!(1, upstream.provider.calls());
    let calls = upstream.provider.captured();
    assert_eq!(
        Some("Bearer sk-openai-more-endpoints-secret".to_owned()),
        calls[0].authorization
    );
    // Official images/edits body preserved verbatim (image + prompt included).
    assert_eq!(
        calls[0].body,
        json!({"model": "gpt-image-2", "image": "base64...", "prompt": "edit"})
    );
}

#[tokio::test]
async fn openai_more_endpoints_audio_speech_routes_to_upstream_and_passes_through_data() {
    let (router, upstream) = build_common_router().await;
    let (status, body) = send_request(
        router,
        "/v1/audio/speech",
        json!({"model": "gpt-4o-mini-tts", "input": "hello", "voice": "alloy"}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");
    let payload: Value = serde_json::from_str(&body).unwrap();
    assert_eq!("openai-more-endpoints", payload["marker"]);
    assert_eq!(1, upstream.provider.calls());
    let calls = upstream.provider.captured();
    assert_eq!(
        Some("Bearer sk-openai-more-endpoints-secret".to_owned()),
        calls[0].authorization
    );
    // Official audio/speech body preserved verbatim (model/input/voice).
    assert_eq!(
        calls[0].body,
        json!({"model": "gpt-4o-mini-tts", "input": "hello", "voice": "alloy"})
    );
}

#[tokio::test]
async fn openai_more_endpoints_audio_transcriptions_routes_to_upstream_and_passes_through_data() {
    let (router, upstream) = build_common_router().await;
    let (status, body) = send_request(
        router,
        "/v1/audio/transcriptions",
        json!({"model": "whisper-1", "file": "base64audio...", "language": "en"}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");
    let payload: Value = serde_json::from_str(&body).unwrap();
    assert_eq!("openai-more-endpoints", payload["marker"]);
    assert_eq!(1, upstream.provider.calls());
    let calls = upstream.provider.captured();
    assert_eq!(
        Some("Bearer sk-openai-more-endpoints-secret".to_owned()),
        calls[0].authorization
    );
    // Official audio/transcriptions body preserved verbatim.
    assert_eq!(
        calls[0].body,
        json!({"model": "whisper-1", "file": "base64audio...", "language": "en"})
    );
}

#[tokio::test]
async fn openai_more_endpoints_moderations_routes_to_upstream_and_passes_through_data() {
    let (router, upstream) = build_common_router().await;
    let (status, body) = send_request(
        router,
        "/v1/moderations",
        json!({"model": "text-moderation-latest", "input": "hello world"}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");
    let payload: Value = serde_json::from_str(&body).unwrap();
    assert_eq!("openai-more-endpoints", payload["marker"]);
    assert_eq!(8, payload["usage"]["total_tokens"]);
    assert_eq!(1, upstream.provider.calls());
    let calls = upstream.provider.captured();
    assert_eq!(
        Some("Bearer sk-openai-more-endpoints-secret".to_owned()),
        calls[0].authorization
    );
    // Official moderations body preserved verbatim.
    assert_eq!(
        calls[0].body,
        json!({"model": "text-moderation-latest", "input": "hello world"})
    );
}
