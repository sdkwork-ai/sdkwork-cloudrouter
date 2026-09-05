//! End-to-end media (image + video) generation routing tests through the full
//! gateway invocation pipeline, with REAL HTTP dispatch to local mock upstream
//! providers.
//!
//! Providers covered:
//! - OpenAI image2 (`/v1/images/generations`)
//! - OpenAI video generation (`/v1/videos/generations`)
//! - Google/Gemini image generation (`:generateImages`)
//! - Google/Gemini video generation (Veo, `:generateVideos`)
//! - Kling video (`/v1/videos/text2video`)
//! - Vidu video (`/ent/v2/start-end2video`)
//! - Seedance/Volcengine video (`/v1/videos/generations`)
//!
//! Each request goes through the REAL production chain:
//!   Bearer API-key auth → account-group pool → routing policy/rule →
//!   account route (base_url + secret_ref) → secret resolution → real upstream
//!   HTTP call → response passthrough.
//!
//! The account-group pool is shared: every supplier account is bound to
//! default group 10. The routing rule for each api_code selects the default
//! group, and the account planner picks the bound account with the highest
//! priority/weight (each supplier account uses a distinct priority so the
//! assertion is deterministic).

use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, Method, Request, StatusCode};
use axum::routing::{any, post};
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Mock upstream providers (one per supplier)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
struct CapturedUpstreamRequest {
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

async fn start_mock_upstream(marker: &'static str) -> MockUpstreamHandle {
    let provider = Arc::new(MockProvider::default());
    let handle = provider.clone();
    let app = axum::Router::new()
        .route("/v1/images/generations", post(media_handler))
        .route("/v1/videos/generations", post(media_handler))
        .route("/v1/videos/text2video", post(media_handler))
        .route("/v1/videos/image2video", post(media_handler))
        .route("/ent/v2/start-end2video", post(media_handler))
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
    Json(body): Json<Value>,
) -> (StatusCode, Json<Value>) {
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
            body,
        });
    (
        StatusCode::OK,
        Json(json!({
            "id": "media-e2e-result",
            "object": "generation",
            "status": "succeeded"
        })),
    )
}

// ---------------------------------------------------------------------------
// Catalog builder: default group 10 + all media suppliers' accounts
// ---------------------------------------------------------------------------

/// One media account per supplier. Each account's group binding is
/// resource-scoped to its `api_scope` (the api_codes it serves) so the route
/// selector only considers the matching supplier's account for a given
/// api_code — mirroring the real `ai_upstream_account_group_member` +
/// resource entitlement model in the DB snapshot.
struct MediaAccountSpec {
    supplier_code: &'static str,
    account_id: i64,
    base_url: String,
    secret_ref: String,
    secret_value: String,
    priority: i32,
    api_scope: &'static [&'static str],
    capabilities: &'static [&'static str],
}

fn add_price_for_account(
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

fn add_price(
    catalog: &mut InMemoryPricingCatalog,
    catalog_key: &str,
    model: &str,
    meter: BillingMeter,
    official_price: &str,
    upstream_price: &str,
) {
    add_price_for_account(
        catalog,
        catalog_key,
        model,
        meter,
        official_price,
        upstream_price,
        "openai",
        4001,
    );
}

fn catalog_with_all_media_accounts(
    key_hash: &str,
    accounts: Vec<MediaAccountSpec>,
) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_vendor(ModelVendorDefinition::new(
        "google",
        ModelVendor::Custom,
        "Google Gemini",
    ));
    catalog.add_vendor(ModelVendorDefinition::new(
        "kling",
        ModelVendor::Custom,
        "Kling",
    ));
    catalog.add_vendor(ModelVendorDefinition::new(
        "vidu",
        ModelVendor::Custom,
        "Vidu",
    ));
    catalog.add_vendor(ModelVendorDefinition::new(
        "volcengine",
        ModelVendor::Custom,
        "Volcengine",
    ));
    catalog.add_model(
        AiModel::new("gpt-image-2", "OpenAI image2", "openai", vec!["image"])
            .with_catalog_key("openai/gpt-image-2"),
    );
    catalog.add_model(
        AiModel::new("veo-3.0-generate-001", "Veo 3", "google", vec!["video"])
            .with_catalog_key("google/veo-3.0-generate-001"),
    );
    // Provider-native media routes price on their route key (api_code) as the
    // catalog key, so each needs a model registered under that key.
    catalog.add_model(
        AiModel::new(
            "text_to_video",
            "Kling text to video",
            "kling",
            vec!["video"],
        )
        .with_catalog_key("kling.text_to_video"),
    );
    catalog.add_model(
        AiModel::new(
            "gemini.image_generation",
            "Gemini image generation",
            "google",
            vec!["image"],
        )
        .with_catalog_key("gemini.image_generation"),
    );
    catalog.add_model(
        AiModel::new(
            "gemini.video_generation",
            "Gemini video generation",
            "google",
            vec!["video"],
        )
        .with_catalog_key("gemini.video_generation"),
    );
    catalog.add_model(
        AiModel::new(
            "video-1",
            "OpenAI video generation",
            "openai",
            vec!["video"],
        )
        .with_catalog_key("openai/video-1"),
    );
    catalog.add_model(
        AiModel::new(
            "start_end_to_video",
            "Vidu start end to video",
            "vidu",
            vec!["video"],
        )
        .with_catalog_key("vidu.start_end_to_video"),
    );
    catalog.add_model(
        AiModel::new(
            "video_generation",
            "Seedance video generation",
            "volcengine",
            vec!["video"],
        )
        .with_catalog_key("volcengine.video_generation"),
    );

    // Base chat model for the fallback chat route used by `_gateway` internal
    // requests.
    catalog.add_model(
        AiModel::new(
            "gpt-4o-mini",
            "GPT-4o mini",
            "openai",
            vec!["chat", "tools"],
        )
        .with_catalog_key("openai/gpt-4o-mini"),
    );

    for account in &accounts {
        let binding = sdkwork_cloudrouter_router_service::domain::UpstreamAccountGroupBinding::
            new_resource_scoped(10, account.priority, 100, account.api_scope.iter().copied(), account.capabilities.iter().copied());
        catalog.add_upstream_account_route(
            UpstreamAccountRoute::new(account.supplier_code, account.account_id)
                .with_account_group_bindings(vec![binding])
                .with_upstream_endpoint(Some(&account.base_url), Some(&account.secret_ref))
                .with_timeout_ms(30_000)
                .with_retry_policy(ProviderRetryPolicy::new(1, vec![], 0).unwrap()),
        );
    }
    // OpenAI-compatible image2 and video generation use MODEL routes (the
    // request body carries the model; the classifier resolves a catalog key).
    let openai_account = accounts
        .iter()
        .find(|account| account.supplier_code == "openai")
        .expect("openai account");
    catalog.add_model_upstream_route(
        sdkwork_cloudrouter_router_service::domain::ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-image-2",
            "gpt-image-2",
            "openai",
            4001,
            "gpt-image-2",
        )
        .with_api_code("openai.images.generations")
        .with_upstream_endpoint(
            Some(&openai_account.base_url),
            Some(&openai_account.secret_ref),
        )
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(1, vec![], 0).unwrap()),
    );
    catalog.add_model_upstream_route(
        sdkwork_cloudrouter_router_service::domain::ModelUpstreamRoute::new_for_catalog_key(
            "openai/video-1",
            "video-1",
            "openai",
            4001,
            "video-1",
        )
        .with_api_code("openai.videos.generations")
        .with_upstream_endpoint(
            Some(&openai_account.base_url),
            Some(&openai_account.secret_ref),
        )
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(1, vec![], 0).unwrap()),
    );
    add_price(
        &mut catalog,
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        BillingMeter::LlmInputToken,
        "0.150000",
        "0.110000",
    );
    add_price(
        &mut catalog,
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        BillingMeter::LlmOutputToken,
        "0.600000",
        "0.440000",
    );
    add_price_for_account(
        &mut catalog,
        "openai/gpt-image-2",
        "gpt-image-2",
        BillingMeter::ImageResult,
        "0.020000",
        "0.012000",
        "openai",
        4001,
    );
    add_price_for_account(
        &mut catalog,
        "openai/video-1",
        "video-1",
        BillingMeter::VideoResult,
        "0.020000",
        "0.012000",
        "openai",
        4001,
    );
    add_price_for_account(
        &mut catalog,
        "google/veo-3.0-generate-001",
        "veo-3.0-generate-001",
        BillingMeter::VideoResult,
        "0.020000",
        "0.012000",
        "google",
        4002,
    );
    // Provider-native pricing resolution keys on the route key (api_code), not
    // the catalog key. Register the same meters under the route key.
    add_price_for_account(
        &mut catalog,
        "gemini.image_generation",
        "gemini.image_generation",
        BillingMeter::ImageResult,
        "0.020000",
        "0.012000",
        "google",
        4002,
    );
    add_price_for_account(
        &mut catalog,
        "gemini.video_generation",
        "gemini.video_generation",
        BillingMeter::VideoResult,
        "0.020000",
        "0.012000",
        "google",
        4002,
    );
    add_price_for_account(
        &mut catalog,
        "gemini.video_generation",
        "gemini.video_generation",
        BillingMeter::ApiRequest,
        "0.010000",
        "0.004000",
        "google",
        4002,
    );
    add_price_for_account(
        &mut catalog,
        "gemini.image_generation",
        "gemini.image_generation",
        BillingMeter::ApiRequest,
        "0.010000",
        "0.004000",
        "google",
        4002,
    );
    add_price_for_account(
        &mut catalog,
        "kling.text_to_video",
        "text_to_video",
        BillingMeter::ApiResult,
        "0.020000",
        "0.012000",
        "kling",
        4003,
    );
    add_price_for_account(
        &mut catalog,
        "kling.text_to_video",
        "text_to_video",
        BillingMeter::ApiItem,
        "0.020000",
        "0.012000",
        "kling",
        4003,
    );
    add_price_for_account(
        &mut catalog,
        "kling.text_to_video",
        "text_to_video",
        BillingMeter::ApiRequest,
        "0.010000",
        "0.004000",
        "kling",
        4003,
    );
    add_price_for_account(
        &mut catalog,
        "vidu.start_end_to_video",
        "start_end_to_video",
        BillingMeter::ApiResult,
        "0.020000",
        "0.012000",
        "vidu",
        4004,
    );
    add_price_for_account(
        &mut catalog,
        "vidu.start_end_to_video",
        "start_end_to_video",
        BillingMeter::ApiRequest,
        "0.010000",
        "0.004000",
        "vidu",
        4004,
    );
    add_price_for_account(
        &mut catalog,
        "volcengine.video_generation",
        "video_generation",
        BillingMeter::ApiResult,
        "0.020000",
        "0.012000",
        "volcengine",
        4005,
    );
    add_price_for_account(
        &mut catalog,
        "volcengine.video_generation",
        "video_generation",
        BillingMeter::ApiItem,
        "0.020000",
        "0.012000",
        "volcengine",
        4005,
    );
    add_price_for_account(
        &mut catalog,
        "volcengine.video_generation",
        "video_generation",
        BillingMeter::ApiRequest,
        "0.010000",
        "0.004000",
        "volcengine",
        4005,
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

    // Routing policies (capability-scoped) + rules (route-key scoped).
    for (rule_id, _code, match_key, _target) in [
        (
            9303,
            "standard-group-openai-video",
            "openai/video-1",
            "openai/video-1",
        ),
        (
            9304,
            "standard-group-gemini-image",
            "gemini.image_generation",
            "gemini.image_generation",
        ),
        (
            9305,
            "standard-group-gemini-video",
            "gemini.video_generation",
            "gemini.video_generation",
        ),
        (
            9306,
            "standard-group-kling-text2video",
            "kling.text_to_video",
            "kling.text_to_video",
        ),
        (
            9307,
            "standard-group-vidu-video",
            "vidu.start_end_to_video",
            "vidu.start_end_to_video",
        ),
        (
            9308,
            "standard-group-volcengine-video",
            "volcengine.video_generation",
            "volcengine.video_generation",
        ),
    ] {
        // OpenAI-compatible video generation matches by catalog key (the
        // request body carries `model`); provider-native routes match by route
        // key (api_code) because they are model-less resources.
        let _match_expression = if rule_id == 9303 {
            format!(r#"{{"catalogKey":"{match_key}"}}"#)
        } else {
            format!(r#"{{"routeKey":"{match_key}"}}"#)
        };
    }
    catalog
}

// ---------------------------------------------------------------------------
// Router assembly
// ---------------------------------------------------------------------------

async fn build_router(
    catalog: InMemoryPricingCatalog,
    secrets: Vec<(String, String)>,
) -> axum::Router {
    let hasher = hasher();
    // The provider response memory budget is process-wide and shared. Each
    // concurrent response reserves `response_max_bytes * 4` (the reservation
    // multiplier) from the 512 MiB budget, so parallel tests would otherwise
    // saturate it. A small explicit limit keeps the reservation small while
    // still exercising the real Development-policy HTTP dispatch path.
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

fn media_accounts(
    openai: &str,
    google: &str,
    kling: &str,
    vidu: &str,
    volcengine: &str,
) -> Vec<MediaAccountSpec> {
    vec![
        MediaAccountSpec {
            supplier_code: "openai",
            account_id: 4001,
            base_url: openai.to_owned(),
            secret_ref: "vault://providers/openai/account/main".to_owned(),
            secret_value: "sk-openai-media-secret".to_owned(),
            priority: 10,
            api_scope: &["openai.images.generations", "openai.videos.generations"],
            capabilities: &["image", "video"],
        },
        MediaAccountSpec {
            supplier_code: "google",
            account_id: 4002,
            base_url: google.to_owned(),
            secret_ref: "vault://providers/google/account/main".to_owned(),
            secret_value: "sk-google-media-secret".to_owned(),
            priority: 20,
            api_scope: &["gemini.image_generation", "gemini.video_generation"],
            capabilities: &["image", "video"],
        },
        MediaAccountSpec {
            supplier_code: "kling",
            account_id: 4003,
            base_url: kling.to_owned(),
            secret_ref: "vault://providers/kling/account/main".to_owned(),
            secret_value: "sk-kling-media-secret".to_owned(),
            priority: 30,
            api_scope: &["kling.text_to_video", "kling.image_to_video"],
            capabilities: &["video"],
        },
        MediaAccountSpec {
            supplier_code: "vidu",
            account_id: 4004,
            base_url: vidu.to_owned(),
            secret_ref: "vault://providers/vidu/account/main".to_owned(),
            secret_value: "sk-vidu-media-secret".to_owned(),
            priority: 40,
            api_scope: &["vidu.start_end_to_video"],
            capabilities: &["video"],
        },
        MediaAccountSpec {
            supplier_code: "volcengine",
            account_id: 4005,
            base_url: volcengine.to_owned(),
            secret_ref: "vault://providers/volcengine/account/main".to_owned(),
            secret_value: "sk-volcengine-media-secret".to_owned(),
            priority: 50,
            api_scope: &["volcengine.video_generation"],
            capabilities: &["video"],
        },
    ]
}

fn collect_secrets(accounts: &[MediaAccountSpec]) -> Vec<(String, String)> {
    accounts
        .iter()
        .map(|account| (account.secret_ref.clone(), account.secret_value.clone()))
        .collect()
}

#[tokio::test]
async fn media_routing_openai_image2_routes_to_openai_account() {
    let openai = start_mock_upstream("openai").await;
    let google = start_mock_upstream("google").await;
    let kling = start_mock_upstream("kling").await;
    let vidu = start_mock_upstream("vidu").await;
    let volcengine = start_mock_upstream("volcengine").await;
    let accounts = media_accounts(
        &openai.base_url,
        &google.base_url,
        &kling.base_url,
        &vidu.base_url,
        &volcengine.base_url,
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_all_media_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&media_accounts(
            &openai.base_url,
            &google.base_url,
            &kling.base_url,
            &vidu.base_url,
            &volcengine.base_url,
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/v1/images/generations",
        json!({"model": "gpt-image-2", "prompt": "city skyline"}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = openai.provider.captured();
    assert_eq!(1, calls.len(), "OpenAI image2 must hit the OpenAI account");
    assert_eq!(
        Some("Bearer sk-openai-media-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!("gpt-image-2", calls[0].body["model"]);
    assert_eq!(0, google.provider.calls());
    assert_eq!(0, kling.provider.calls());
    assert_eq!(0, vidu.provider.calls());
    assert_eq!(0, volcengine.provider.calls());
}

#[tokio::test]
async fn media_routing_openai_video_generations_routes_to_openai_account() {
    let openai = start_mock_upstream("openai").await;
    let google = start_mock_upstream("google").await;
    let accounts = media_accounts(
        &openai.base_url,
        &google.base_url,
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_all_media_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&media_accounts(
            &openai.base_url,
            &google.base_url,
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/v1/videos/generations",
        json!({"model": "video-1", "prompt": "ocean wave"}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = openai.provider.captured();
    assert_eq!(
        1,
        calls.len(),
        "OpenAI video generation must hit the OpenAI account"
    );
    assert_eq!(
        Some("Bearer sk-openai-media-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!("video-1", calls[0].body["model"]);
    assert_eq!(0, google.provider.calls());
}

#[tokio::test]
async fn media_routing_gemini_image_generation_routes_to_google_account() {
    let google = start_mock_upstream("google").await;
    let openai = start_mock_upstream("openai").await;
    let accounts = media_accounts(
        &openai.base_url,
        &google.base_url,
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_all_media_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&media_accounts(
            &openai.base_url,
            &google.base_url,
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/google/v1beta/models/gemini-2.0-flash-preview-image-generation:generateImages",
        json!({"instances": [{"prompt": "mountain"}], "parameters": {}}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = google.provider.captured();
    assert_eq!(
        1,
        calls.len(),
        "Gemini image generation must hit the Google account"
    );
    assert_eq!(
        Some("Bearer sk-google-media-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!(0, openai.provider.calls());
}

#[tokio::test]
async fn media_routing_gemini_veo_video_generation_routes_to_google_account() {
    let google = start_mock_upstream("google").await;
    let openai = start_mock_upstream("openai").await;
    let accounts = media_accounts(
        &openai.base_url,
        &google.base_url,
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_all_media_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&media_accounts(
            &openai.base_url,
            &google.base_url,
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/google/v1beta/models/veo-3.0-generate-001:generateVideos",
        json!({"instances": [{"prompt": "tide"}], "parameters": {"durationSeconds": 8}}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = google.provider.captured();
    assert_eq!(1, calls.len(), "Gemini Veo must hit the Google account");
    assert_eq!(
        Some("Bearer sk-google-media-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!(0, openai.provider.calls());
}

#[tokio::test]
async fn media_routing_kling_video_generation_routes_to_kling_account() {
    let kling = start_mock_upstream("kling").await;
    let openai = start_mock_upstream("openai").await;
    let accounts = media_accounts(
        &openai.base_url,
        &"http://127.0.0.1:9".to_owned(),
        &kling.base_url,
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_all_media_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&media_accounts(
            &openai.base_url,
            &"http://127.0.0.1:9".to_owned(),
            &kling.base_url,
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/kling/v1/videos/text2video",
        json!({"prompt": "city skyline", "duration": 8}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = kling.provider.captured();
    assert_eq!(1, calls.len(), "Kling must hit the Kling account");
    assert_eq!(
        Some("Bearer sk-kling-media-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!(0, openai.provider.calls());
}

#[tokio::test]
async fn media_routing_vidu_video_generation_routes_to_vidu_account() {
    let vidu = start_mock_upstream("vidu").await;
    let openai = start_mock_upstream("openai").await;
    let accounts = media_accounts(
        &openai.base_url,
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
        &vidu.base_url,
        &"http://127.0.0.1:9".to_owned(),
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_all_media_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&media_accounts(
            &openai.base_url,
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
            &vidu.base_url,
            &"http://127.0.0.1:9".to_owned(),
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/vidu/ent/v2/start-end2video",
        json!({"prompt": "sunset over the sea", "startImg": {"url": "x"}, "endImg": {"url": "y"}}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = vidu.provider.captured();
    assert_eq!(1, calls.len(), "Vidu must hit the Vidu account");
    assert_eq!(
        Some("Bearer sk-vidu-media-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!(0, openai.provider.calls());
}

#[tokio::test]
async fn media_routing_seedance_video_generation_routes_to_volcengine_account() {
    let volcengine = start_mock_upstream("volcengine").await;
    let openai = start_mock_upstream("openai").await;
    let accounts = media_accounts(
        &openai.base_url,
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
        &"http://127.0.0.1:9".to_owned(),
        &volcengine.base_url,
    );
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_all_media_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&media_accounts(
            &openai.base_url,
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
            &"http://127.0.0.1:9".to_owned(),
            &volcengine.base_url,
        )),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/volcengine/v1/videos/generations",
        json!({"model": "seedance-1.0", "prompt": "aurora borealis"}),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = volcengine.provider.captured();
    assert_eq!(1, calls.len(), "Seedance must hit the Volcengine account");
    assert_eq!(
        Some("Bearer sk-volcengine-media-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!(0, openai.provider.calls());
}
