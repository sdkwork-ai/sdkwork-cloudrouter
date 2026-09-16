//! End-to-end digital-human (avatar) and motion-mimicry vendor routing tests
//! through the full gateway invocation pipeline, with REAL HTTP dispatch to
//! local mock upstream providers.
//!
//! Providers covered:
//! - Kling avatar / digital human (`/kling/v1/videos/avatar`)
//! - Kling motion control (`/kling/v1/videos/motion-control`)
//! - Vidu motion sync template (`/vidu/ent/v2/template`)
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
    let body_bytes = axum::body::to_bytes(request.into_body(), 1024 * 1024)
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
            body,
        });
    (
        StatusCode::OK,
        Json(json!({
            "task_id": "avatar-motion-e2e-task",
            "task_status": "submitted",
            "state": "created"
        })),
    )
}

struct AvatarAccountSpec {
    supplier_code: &'static str,
    account_id: i64,
    base_url: String,
    secret_ref: String,
    secret_value: String,
    api_scope: &'static [&'static str],
    capabilities: &'static [&'static str],
}

fn avatar_accounts(kling: &str, vidu: &str) -> Vec<AvatarAccountSpec> {
    vec![
        AvatarAccountSpec {
            supplier_code: "kling",
            account_id: 4201,
            base_url: kling.to_owned(),
            secret_ref: "vault://providers/kling/account/main".to_owned(),
            secret_value: "sk-kling-avatar-secret".to_owned(),
            api_scope: &[
                "kling.avatar",
                "kling.motion_control",
                "kling.text_to_video",
            ],
            capabilities: &["video"],
        },
        AvatarAccountSpec {
            supplier_code: "vidu",
            account_id: 4202,
            base_url: vidu.to_owned(),
            secret_ref: "vault://providers/vidu/account/main".to_owned(),
            secret_value: "sk-vidu-motion-secret".to_owned(),
            api_scope: &["vidu.motion_sync", "vidu.start_end_to_video"],
            capabilities: &["video"],
        },
    ]
}

fn catalog_with_avatar_accounts(
    key_hash: &str,
    accounts: Vec<AvatarAccountSpec>,
) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
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
    catalog.add_model(
        AiModel::new(
            "avatar",
            "Kling avatar digital human",
            "kling",
            vec!["video"],
        )
        .with_catalog_key("kling.avatar"),
    );
    catalog.add_model(
        AiModel::new(
            "motion_control",
            "Kling motion control",
            "kling",
            vec!["video"],
        )
        .with_catalog_key("kling.motion_control"),
    );
    catalog.add_model(
        AiModel::new(
            "motion_sync",
            "Vidu motion sync",
            "vidu",
            vec!["video"],
        )
        .with_catalog_key("vidu.motion_sync"),
    );
    for (catalog_key, model, supplier, account_id) in [
        ("kling.avatar", "avatar", "kling", 4201),
        ("kling.motion_control", "motion_control", "kling", 4201),
        ("vidu.motion_sync", "motion_sync", "vidu", 4202),
    ] {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            catalog_key,
            model,
            PriceSide::OfficialReference,
            BillingMeter::VideoResult,
            Money::usd("0.060000").unwrap(),
        ));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                catalog_key,
                model,
                PriceSide::UpstreamCost,
                BillingMeter::VideoResult,
                Money::usd("0.040000").unwrap(),
            )
            .for_upstream_account(supplier, account_id),
        );
        // Task-start pricing precheck settles on the fixed-request meter.
        catalog.add_price(ModelPrice::new_for_catalog_key(
            catalog_key,
            model,
            PriceSide::OfficialReference,
            BillingMeter::ApiRequest,
            Money::usd("0.060000").unwrap(),
        ));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                catalog_key,
                model,
                PriceSide::UpstreamCost,
                BillingMeter::ApiRequest,
                Money::usd("0.040000").unwrap(),
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
    let body = String::from_utf8(
        axum::body::to_bytes(response.into_body(), 1024 * 1024 * 16)
            .await
            .unwrap()
            .to_vec(),
    )
    .unwrap();
    (status, body)
}

fn collect_secrets(accounts: &[AvatarAccountSpec]) -> Vec<(String, String)> {
    accounts
        .iter()
        .map(|account| (account.secret_ref.clone(), account.secret_value.clone()))
        .collect()
}

#[tokio::test]
async fn avatar_routing_kling_avatar_routes_to_kling_account() {
    let kling = start_mock_upstream("kling").await;
    let vidu = start_mock_upstream("vidu").await;
    let accounts = avatar_accounts(&kling.base_url, &vidu.base_url);
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_avatar_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&avatar_accounts(&kling.base_url, &vidu.base_url)),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/kling/v1/videos/avatar",
        json!({
            "model_name": "kling-ai-avatar-v2",
            "human_image": "https://cdn.example/presenter.jpg",
            "voice_mode": "tts",
            "text": "大家好,欢迎收看本期节目",
            "voice_language": "zh"
        }),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = kling.provider.captured();
    assert_eq!(1, calls.len(), "Kling avatar must hit the Kling account");
    assert_eq!(
        Some("Bearer sk-kling-avatar-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!("/v1/videos/avatar", calls[0].path);
    assert_eq!(
        "https://cdn.example/presenter.jpg",
        calls[0].body["human_image"]
    );
    assert_eq!("tts", calls[0].body["voice_mode"]);
    assert_eq!(0, vidu.provider.calls());
}

#[tokio::test]
async fn motion_routing_kling_motion_control_routes_to_kling_account() {
    let kling = start_mock_upstream("kling").await;
    let vidu = start_mock_upstream("vidu").await;
    let accounts = avatar_accounts(&kling.base_url, &vidu.base_url);
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_avatar_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&avatar_accounts(&kling.base_url, &vidu.base_url)),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/kling/v1/videos/motion-control",
        json!({
            "model_name": "kling-v3",
            "image": "https://cdn.example/character.jpg",
            "video": "https://cdn.example/performance.mp4"
        }),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = kling.provider.captured();
    assert_eq!(
        1,
        calls.len(),
        "Kling motion control must hit the Kling account"
    );
    assert_eq!(
        Some("Bearer sk-kling-avatar-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!("/v1/videos/motion-control", calls[0].path);
    assert_eq!("https://cdn.example/character.jpg", calls[0].body["image"]);
    assert_eq!(
        "https://cdn.example/performance.mp4",
        calls[0].body["video"]
    );
    assert_eq!(0, vidu.provider.calls());
}

#[tokio::test]
async fn motion_routing_vidu_motion_sync_routes_to_vidu_account() {
    let kling = start_mock_upstream("kling").await;
    let vidu = start_mock_upstream("vidu").await;
    let accounts = avatar_accounts(&kling.base_url, &vidu.base_url);
    let hasher = hasher();
    let key_hash = hasher.hash_secret("sk-live-secret").unwrap();
    let catalog = catalog_with_avatar_accounts(&key_hash, accounts);
    let router = build_router(
        catalog,
        collect_secrets(&avatar_accounts(&kling.base_url, &vidu.base_url)),
    )
    .await;

    let (status, body) = send_request(
        router,
        "/vidu/ent/v2/template",
        json!({
            "template": "motion_control_2",
            "images": ["https://cdn.example/person.png"],
            "video_urls": ["https://cdn.example/dance.mp4"]
        }),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "unexpected body: {body}");

    let calls = vidu.provider.captured();
    assert_eq!(1, calls.len(), "Vidu motion sync must hit the Vidu account");
    assert_eq!(
        Some("Bearer sk-vidu-motion-secret".to_owned()),
        calls[0].authorization
    );
    assert_eq!("/ent/v2/template", calls[0].path);
    assert_eq!("motion_control_2", calls[0].body["template"]);
    assert_eq!(
        "https://cdn.example/dance.mp4",
        calls[0].body["video_urls"][0]
    );
    assert_eq!(0, kling.provider.calls());
}
