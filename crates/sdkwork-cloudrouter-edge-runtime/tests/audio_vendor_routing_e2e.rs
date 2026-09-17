//! End-to-end audio vendor routing tests (speech synthesis, sound effects,
//! music generation) through the full gateway invocation pipeline, with REAL
//! HTTP dispatch to local mock upstream providers.
//!
//! Providers covered:
//! - ElevenLabs text-to-speech (`/elevenlabs/v1/text-to-speech/{voice_id}`)
//! - ElevenLabs sound generation (`/elevenlabs/v1/sound-generation`)
//! - Volcengine Ark speech (`/volcengine/api/v3/audio/speech`)
//! - Suno music generation (`/suno/v1/music/generations`)
//! - MiniMax music generation (`/minimax/v1/music_generation`)
//!
//! Each request goes through the REAL production chain:
//!   Bearer API-key auth → account-group pool → routing policy/rule →
//!   account route (base_url + secret_ref) → secret resolution → real upstream
//!   HTTP call → response passthrough.

use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, Method, Request, StatusCode};
use axum::routing::any;
use axum::Json;
use sdkwork_cloudrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, ModelPrice, ModelVendor, ModelVendorDefinition, Money,
    PriceSide, PricingPlan, ProviderRetryPolicy, UpstreamAccountGroup, UpstreamAccountRoute,
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

#[derive(Debug, Clone)]
struct CapturedUpstreamRequest {
    authorization: Option<String>,
    path: String,
    query: Option<String>,
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

async fn start_mock_upstream(marker: &'static str) -> MockUpstreamHandle {
    let provider = Arc::new(MockProvider::default());
    let handle = provider.clone();
    let app = axum::Router::new()
        .fallback(any(media_handler))
        .with_state(handle);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let base_url = format!("http://{addr}");
    let _marker = marker;
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

async fn media_handler(
    State(provider): State<Arc<MockProvider>>,
    headers: HeaderMap,
    request: Request<Body>,
) -> (StatusCode, Json<Value>) {
    let path = request.uri().path().to_owned();
    let query = request.uri().query().map(str::to_owned);
    let body_bytes = axum::body::to_bytes(
        request.into_body(),
        1024 * 1024,
    )
    .await
    .unwrap_or_default();
    let body = serde_json::from_slice::<Value>(&body_bytes).unwrap_or(Value::Null);
    provider.calls.fetch_add(1, Ordering::SeqCst);
    provider
        .captured
        .lock()
        .unwrap()
        .push(CapturedUpstreamRequest {
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            path,
            query,
            body,
        });
    (
        StatusCode::OK,
        Json(json!({
            "id": "tts-e2e-result",
            "object": "speech",
            "status": "succeeded"
        })),
    )
}

struct TtsAccountSpec {
    supplier_code: &'static str,
    account_id: i64,
    base_url: String,
    secret_ref: String,
    secret_value: String,
    api_scope: &'static [&'static str],
    capabilities: &'static [&'static str],
}

fn tts_accounts(
    elevenlabs: &str,
    volcengine: &str,
    suno: &str,
    minimax: &str,
) -> Vec<TtsAccountSpec> {
    vec![
        TtsAccountSpec {
            supplier_code: "elevenlabs",
            account_id: 4101,
            base_url: elevenlabs.to_owned(),
            secret_ref: "vault://providers/elevenlabs/account/main".to_owned(),
            secret_value: "sk-elevenlabs-tts-secret".to_owned(),
            api_scope: &[
                "elevenlabs.text_to_speech",
                "elevenlabs.sound_generation",
            ],
            capabilities: &["audio", "speech", "sfx"],
        },
        TtsAccountSpec {
            supplier_code: "volcengine",
            account_id: 4102,
            base_url: volcengine.to_owned(),
            secret_ref: "vault://providers/volcengine/account/main".to_owned(),
            secret_value: "sk-volcengine-tts-secret".to_owned(),
            api_scope: &["volcengine.speech"],
            capabilities: &["audio", "speech"],
        },
        TtsAccountSpec {
            supplier_code: "suno",
            account_id: 4103,
            base_url: suno.to_owned(),
            secret_ref: "vault://providers/suno/account/main".to_owned(),
            secret_value: "sk-suno-music-secret".to_owned(),
            api_scope: &["suno.music_generation", "suno.music_task_query"],
            capabilities: &["music"],
        },
        TtsAccountSpec {
            supplier_code: "minimax",
            account_id: 4104,
            base_url: minimax.to_owned(),
            secret_ref: "vault://providers/minimax/account/main".to_owned(),
            secret_value: "sk-minimax-music-secret".to_owned(),
            api_scope: &["minimax.music_generation"],
            capabilities: &["music"],
        },
    ]
}

fn catalog_with_tts_accounts(
    key_hash: &str,
    accounts: Vec<TtsAccountSpec>,
) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "elevenlabs",
        ModelVendor::Custom,
        "ElevenLabs",
    ));
    catalog.add_vendor(ModelVendorDefinition::new(
        "volcengine",
        ModelVendor::Custom,
        "Volcengine",
    ));
    catalog.add_vendor(ModelVendorDefinition::new(
        "suno",
        ModelVendor::Custom,
        "Suno",
    ));
    catalog.add_vendor(ModelVendorDefinition::new(
        "minimax",
        ModelVendor::Custom,
        "MiniMax",
    ));
    catalog.add_model(
        AiModel::new(
            "text_to_speech",
            "ElevenLabs text to speech",
            "elevenlabs",
            vec!["audio"],
        )
        .with_catalog_key("elevenlabs.text_to_speech"),
    );
    catalog.add_model(
        AiModel::new(
            "sound_generation",
            "ElevenLabs sound effect generation",
            "elevenlabs",
            vec!["audio"],
        )
        .with_catalog_key("elevenlabs.sound_generation"),
    );
    catalog.add_model(
        AiModel::new(
            "speech",
            "Volcengine Ark speech synthesis",
            "volcengine",
            vec!["audio"],
        )
        .with_catalog_key("volcengine.speech"),
    );
    catalog.add_model(
        AiModel::new(
            "music_generation",
            "Suno music generation",
            "suno",
            vec!["music"],
        )
        .with_catalog_key("suno.music_generation"),
    );
    catalog.add_model(
        AiModel::new(
            "music_generation",
            "MiniMax music generation",
            "minimax",
            vec!["music"],
        )
        .with_catalog_key("minimax.music_generation"),
    );
    for (catalog_key, model, supplier, account_id) in [
        (
            "elevenlabs.text_to_speech",
            "text_to_speech",
            "elevenlabs",
            4101,
        ),
        (
            "elevenlabs.sound_generation",
            "sound_generation",
            "elevenlabs",
            4101,
        ),
        ("volcengine.speech", "speech", "volcengine", 4102),
        ("suno.music_generation", "music_generation", "suno", 4103),
        ("minimax.music_generation", "music_generation", "minimax", 4104),
    ] {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            catalog_key,
            model,
            PriceSide::OfficialReference,
            BillingMeter::ApiRequest,
            Money::usd("0.010000").unwrap(),
        ));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                catalog_key,
                model,
                PriceSide::UpstreamCost,
                BillingMeter::ApiRequest,
                Money::usd("0.004000").unwrap(),
            )
            .for_upstream_account(supplier, account_id),
        );
    }
    for account in &accounts {
        let binding = sdkwork_cloudrouter_router_service::domain::UpstreamAccountGroupBinding::
            new_resource_scoped(10, 10, 100, account.api_scope.iter().copied(), account.capabilities.iter().copied());
        catalog.add_upstream_account_route(
            UpstreamAccountRoute::new(account.supplier_code, account.account_id)
                .with_account_group_bindings(vec![binding])
                .with_upstream_endpoint(Some(&account.base_url), Some(&account.secret_ref))
                .with_timeout_ms(30_000)
                .with_retry_policy(ProviderRetryPolicy::new(1, vec![], 0).unwrap()),
        );
    }
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
    catalog
}

async fn build_router(
    catalog: InMemoryPricingCatalog,
    secrets: Vec<(String, String)>,
) -> axum::Router {
    let dispatcher = sdkwork_cloudrouter_edge_runtime::InvocationHttpDispatcher::
        with_outbound_target_policy_and_response_max_bytes(
            sdkwork_cloudrouter_security::OutboundTargetPolicy::Development,
            std::num::NonZeroUsize::new(1024 * 1024).expect("1 MiB response limit"),
        );
    sdkwork_cloudrouter_edge_runtime::invocation_router_with_full_pipeline(
        Arc::new(catalog),
        hasher(),
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
    let body = String::from_utf8(axum::body::to_bytes(response.into_body(), 1024 * 1024 * 16)
        .await
        .unwrap()
        .to_vec())
    .unwrap();
    (status, body)
}

fn collect_secrets(accounts: &[TtsAccountSpec]) -> Vec<(String, String)> {
    accounts
        .iter()
        .map(|account| (account.secret_ref.clone(), account.secret_value.clone()))
        .collect()
}

#[tokio::test]
async fn tts_routing_elevenlabs_text_to_speech_routes_to_elevenlabs_account() {
    let elevenlabs = start_mock_upstream("elevenlabs").await;
    let volcengine = start_mock_upstream("volcengine").await;
    let accounts = tts_accounts(
        &elevenlabs.base_url,
        &volcengine.base_url,
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_tts_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&tts_accounts(
            &elevenlabs.base_url,
            &volcengine.base_url,
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/elevenlabs/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
        json!({
            "model_id": "eleven_multilingual_v2",
            "text": "hello world",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
        }),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = elevenlabs.provider.captured();
    assert_eq!(
        1,
        calls.len(),
        "ElevenLabs TTS must hit the ElevenLabs account"
    );
    assert_eq!(
        Some("Bearer sk-elevenlabs-tts-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!(
        "/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
        calls[0].path,
        "vendor path after the provider prefix must be forwarded verbatim"
    );
    assert_eq!("hello world", calls[0].body["text"]);
    assert_eq!(0, volcengine.provider.calls());
}

#[tokio::test]
async fn sfx_routing_elevenlabs_sound_generation_routes_to_elevenlabs_account() {
    let elevenlabs = start_mock_upstream("elevenlabs").await;
    let volcengine = start_mock_upstream("volcengine").await;
    let unused = "http://127.0.0.1:9".to_owned();
    let accounts = tts_accounts(
        &elevenlabs.base_url,
        &volcengine.base_url,
        &unused,
        &unused,
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_tts_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&tts_accounts(
            &elevenlabs.base_url,
            &volcengine.base_url,
            &unused,
            &unused,
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/elevenlabs/v1/sound-generation?output_format=wav_48000",
        json!({
            "model_id": "eleven_text_to_sound_v2",
            "text": "cinematic whoosh transition",
            "duration_seconds": 5,
            "prompt_influence": 0.65,
            "loop": true
        }),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = elevenlabs.provider.captured();
    assert_eq!(
        1,
        calls.len(),
        "ElevenLabs sound generation must hit the ElevenLabs account"
    );
    assert_eq!(
        Some("Bearer sk-elevenlabs-tts-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!(
        "/v1/sound-generation",
        calls[0].path,
        "vendor path after the provider prefix must be forwarded verbatim"
    );
    assert_eq!(
        Some("output_format=wav_48000".to_owned()),
        calls[0].query,
        "query parameters carry the requested audio format and must survive the relay"
    );
    assert_eq!(
        "cinematic whoosh transition",
        calls[0].body["text"],
        "the SFX prompt must reach the vendor unchanged"
    );
    assert_eq!(0.65, calls[0].body["prompt_influence"]);
    assert_eq!(0, volcengine.provider.calls());
}

#[tokio::test]
async fn tts_routing_volcengine_speech_routes_to_volcengine_account() {
    let elevenlabs = start_mock_upstream("elevenlabs").await;
    let volcengine = start_mock_upstream("volcengine").await;
    let accounts = tts_accounts(
        &elevenlabs.base_url,
        &volcengine.base_url,
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_tts_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&tts_accounts(
            &elevenlabs.base_url,
            &volcengine.base_url,
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/volcengine/api/v3/audio/speech",
        json!({"model": "doubao-tts", "input": "你好世界", "voice": "zh_female_cancan_mars"}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = volcengine.provider.captured();
    assert_eq!(
        1,
        calls.len(),
        "Volcengine speech must hit the Volcengine account"
    );
    assert_eq!(
        Some("Bearer sk-volcengine-tts-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!("/api/v3/audio/speech", calls[0].path);
    assert_eq!("你好世界", calls[0].body["input"]);
    assert_eq!(0, elevenlabs.provider.calls());
}

#[tokio::test]
async fn music_routing_suno_music_generation_routes_to_suno_account() {
    let suno = start_mock_upstream("suno").await;
    let minimax = start_mock_upstream("minimax").await;
    let accounts = tts_accounts(
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
        &suno.base_url,
        &minimax.base_url,
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_tts_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&tts_accounts(
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
            &suno.base_url,
            &minimax.base_url,
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/suno/v1/music/generations",
        json!({"prompt": "upbeat synthwave", "tags": "synth,dance", "title": "Neon Drive"}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = suno.provider.captured();
    assert_eq!(1, calls.len(), "Suno music must hit the Suno account");
    assert_eq!(
        Some("Bearer sk-suno-music-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!("/v1/music/generations", calls[0].path);
    assert_eq!("Neon Drive", calls[0].body["title"]);
    assert_eq!(0, minimax.provider.calls());
}

#[tokio::test]
async fn music_routing_minimax_music_generation_routes_to_minimax_account() {
    let suno = start_mock_upstream("suno").await;
    let minimax = start_mock_upstream("minimax").await;
    let accounts = tts_accounts(
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
        &suno.base_url,
        &minimax.base_url,
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_tts_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&tts_accounts(
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
            &suno.base_url,
            &minimax.base_url,
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/minimax/v1/music_generation",
        json!({
            "model": "music-3.0",
            "prompt": "melancholic piano",
            "lyrics": "[Verse]\nmoonlight",
            "output_format": "url",
            "audio_setting": {"sample_rate": 44100, "format": "mp3"}
        }),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = minimax.provider.captured();
    assert_eq!(1, calls.len(), "MiniMax music must hit the MiniMax account");
    assert_eq!(
        Some("Bearer sk-minimax-music-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!("/v1/music_generation", calls[0].path);
    assert_eq!("music-3.0", calls[0].body["model"]);
    assert_eq!(44100, calls[0].body["audio_setting"]["sample_rate"]);
    assert_eq!(0, suno.provider.calls());
}

