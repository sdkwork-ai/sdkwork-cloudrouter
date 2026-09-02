//! End-to-end tests covering the FULL chat-completion chain with the real
//! account login flow, the default account group's account pool, admin CRUD
//! for group-bound upstream accounts (create / enable / disable / delete),
//! real-time routing effect, and complete routing to the routing target API.
//!
//! The chain under test:
//!
//!   POST /v1/chat/completions  (real dual-token app-session login)
//!     → 鉴权 (real verify_app_session_token)
//!     → 默认账号分组账号池 (default account group + account pool)
//!     → 路由账号选择 (account group → account route)
//!     → secret 解析 (ProviderSecretResolver)
//!     → 真实上游 HTTP (local mock provider per account)
//!     → 响应回传
//!
//! Admin CRUD is exercised on a shared mutable catalog wrapped in
//! `RwLock`, mirroring the production chain: admin write →
//! `AiRoutingCacheInvalidatingAdminUpstreamStore` invalidates the routing
//! cache → the refresh worker reloads the snapshot → the next request sees
//! the new account pool immediately ("实时生效").

use std::collections::HashMap;
use std::num::NonZeroUsize;
use std::sync::{Arc, Mutex, RwLock};

use async_trait::async_trait;
use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, Method, Request, StatusCode};
use axum::response::IntoResponse;
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};
use tower::ServiceExt;

use sdkwork_cloudrouter_config::AppSessionConfig;
use sdkwork_cloudrouter_http::verify_app_session_token;
use sdkwork_cloudrouter_router_service::api::{
    openai_chat_completions_router_with_auth_extensions, OpenAiAuthTokenAuthenticator,
    OpenAiRuntimeFailureStrategy, OpenAiRuntimeRouteConfig,
};
use sdkwork_cloudrouter_router_service::application::AuthenticatedApiKeyContext;
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, DomainError, DomainResult, GatewayApiKey, ModelPrice,
    ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    ProviderAuthProfile, ProviderRetryPolicy, UpstreamAccountFallbackMode, UpstreamAccountGroup,
    UpstreamAccountRoute, UpstreamAccountRoutingStrategy,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::infrastructure::provider::{
    SecretRefOpenAiCompatibleChatCompletionRelay,
    SecretRefOpenAiCompatibleChatCompletionStreamRelay,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_cloudrouter_router_service::ports::{
    AccountGroupModelAccess, GatewayUsageRecordCommand, GatewayUsageRecordFuture,
    GatewayUsageRecorder, PricingCatalog, PricingDefaultRegionProvider, ProviderSecretResolver,
    SupplierModelAccess, UpstreamAccountRouteCatalog,
};
use sdkwork_cloudrouter_test_support::{
    app_session_config, app_session_dual_token_headers, default_trusted_request_subject,
    API_KEY_PEPPER,
};
use sdkwork_web_core::default_open_api_bearer_classifier;

// ---------------------------------------------------------------------------
// Fixture constants — group id must agree across UpstreamAccountGroup.id,
// UpstreamAccountRoute bindings, and the AuthenticatedApiKeyContext.
// ---------------------------------------------------------------------------

const DEFAULT_GROUP_ID: i64 = 2001;
const DEFAULT_GROUP_CODE: &str = "default-group";
const TENANT_ID: i64 = 100_001;
const SUPPLIER_CODE: &str = "openrouter";
const CATALOG_KEY: &str = "openai/gpt-4o";
const MODEL: &str = "gpt-4o";

const TEST_NOW_UNIX_SECONDS: i64 = 1_800_000_001;

// Account pool: two seeded accounts + one admin-created account.
const ACCOUNT_A: i64 = 3001;
const ACCOUNT_B: i64 = 3002;
const ACCOUNT_C: i64 = 3003;

/// Each test router gets its OWN response memory budget. The secret-ref
/// relays otherwise share a process-global 512 MiB budget where every request
/// reserves `response_max_bytes × 4` = 256 MiB, so parallel test cases
/// saturate it with `provider_response_memory_saturated`. Isolating the
/// budget per router (the same pattern the production per-tenant runtime
/// uses) lets tests run in parallel without global serialization.
const TEST_RESPONSE_MEMORY_BUDGET_BYTES: usize = 256 * 1024 * 1024;

fn test_response_memory_budget(
) -> sdkwork_cloudrouter_router_service::infrastructure::provider::ProviderResponseMemoryBudget {
    sdkwork_cloudrouter_router_service::infrastructure::provider::ProviderResponseMemoryBudget::new(
        NonZeroUsize::new(TEST_RESPONSE_MEMORY_BUDGET_BYTES)
            .expect("test response memory budget must be nonzero"),
    )
    .expect("test response memory budget must be valid")
}

// ---------------------------------------------------------------------------
// Real login authenticator (real token verification)
// ---------------------------------------------------------------------------

struct RealTestAuthTokenAuthenticator {
    config: AppSessionConfig,
    now_unix_seconds: i64,
}

fn openai_auth_error(
    status: StatusCode,
    code: &str,
    message: &str,
) -> Box<axum::response::Response> {
    let body = serde_json::json!({
        "error": {
            "message": message,
            "type": "invalid_request_error",
            "param": null,
            "code": code,
        }
    });
    Box::new((status, axum::Json(body)).into_response())
}

#[async_trait]
impl OpenAiAuthTokenAuthenticator for RealTestAuthTokenAuthenticator {
    async fn authenticate(
        &self,
        raw_bearer_token: &str,
        access_token: Option<&str>,
    ) -> Result<
        AuthenticatedApiKeyContext,
        sdkwork_cloudrouter_router_service::api::OpenAiAuthTokenError,
    > {
        // Real HMAC-SHA256 signature + time-window verification.
        let bearer_subject =
            match verify_app_session_token(&self.config, raw_bearer_token, self.now_unix_seconds) {
                Ok(subject) => subject,
                Err(error) => {
                    return Err(openai_auth_error(
                        StatusCode::UNAUTHORIZED,
                        "invalid_auth_token",
                        &format!("bearer token verification failed: {error}"),
                    ));
                }
            };

        // Access token must match the bearer subject.
        if let Some(access) = access_token
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            match verify_app_session_token(&self.config, access, self.now_unix_seconds) {
                Ok(access_subject) => {
                    if bearer_subject.tenant_id != access_subject.tenant_id
                        || bearer_subject.organization_id != access_subject.organization_id
                        || bearer_subject.user_id != access_subject.user_id
                    {
                        return Err(openai_auth_error(
                            StatusCode::UNAUTHORIZED,
                            "subject_mismatch",
                            "bearer and access token subjects do not match",
                        ));
                    }
                }
                Err(error) => {
                    return Err(openai_auth_error(
                        StatusCode::UNAUTHORIZED,
                        "invalid_auth_token",
                        &format!("access token verification failed: {error}"),
                    ));
                }
            }
        }

        // Map the verified subject to the tenant's default account group.
        Ok(AuthenticatedApiKeyContext {
            api_key_id: 0,
            tenant_id: bearer_subject.tenant_id,
            organization_id: bearer_subject.organization_id,
            user_id: bearer_subject.user_id,
            api_key_name_snapshot: "auth-token-session".to_owned(),
            group_id: DEFAULT_GROUP_ID,
            group_code: DEFAULT_GROUP_CODE.to_owned(),
            pricing_plan_code: "standard".to_owned(),
        })
    }
}

// ---------------------------------------------------------------------------
// Shared mutable catalog (models the admin store → snapshot reload loop)
// ---------------------------------------------------------------------------

/// A `PricingCatalog` + `UpstreamAccountRouteCatalog` backed by an
/// `RwLock<InMemoryPricingCatalog>`. Admin CRUD mutates the inner catalog, and
/// the router reads through the same shared instance, so changes take effect
/// on the very next request — mirroring production cache invalidation +
/// snapshot reload.
#[derive(Debug, Clone)]
struct SharedPricingCatalog {
    inner: Arc<RwLock<InMemoryPricingCatalog>>,
    deleted_account_ids: Arc<RwLock<Vec<i64>>>,
}

impl SharedPricingCatalog {
    fn new(catalog: InMemoryPricingCatalog) -> Self {
        Self {
            inner: Arc::new(RwLock::new(catalog)),
            deleted_account_ids: Arc::new(RwLock::new(Vec::new())),
        }
    }

    fn read(&self) -> std::sync::RwLockReadGuard<'_, InMemoryPricingCatalog> {
        self.inner.read().unwrap()
    }

    fn write(&self) -> std::sync::RwLockWriteGuard<'_, InMemoryPricingCatalog> {
        self.inner.write().unwrap()
    }

    fn is_deleted(&self, account_id: i64) -> bool {
        self.deleted_account_ids
            .read()
            .unwrap()
            .contains(&account_id)
    }

    // -- Admin CRUD (mirrors SaveAdminUpstreamAccountCommand / store methods) --

    /// Creates a group-bound upstream account and its model route/prices,
    /// effective immediately on the next routing request.
    fn admin_create_account(
        &self,
        supplier_code: &str,
        account_id: i64,
        group_id: i64,
        base_url: &str,
        secret_ref: &str,
        binding_priority: i32,
    ) {
        {
            let mut catalog = self.write();
            catalog.add_upstream_account_route(
                UpstreamAccountRoute::new(supplier_code, account_id)
                    .with_account_group_binding(group_id, binding_priority, 100)
                    .with_upstream_endpoint(Some(base_url), Some(secret_ref))
                    .with_auth_profile(ProviderAuthProfile::bearer())
                    .with_timeout_ms(30_000)
                    .with_retry_policy(ProviderRetryPolicy::new(1, vec![429, 503], 0).unwrap()),
            );
            catalog.add_model_upstream_route(
                ModelUpstreamRoute::new_for_catalog_key(
                    CATALOG_KEY,
                    MODEL,
                    supplier_code,
                    account_id,
                    CATALOG_KEY,
                )
                .with_upstream_endpoint(Some(base_url), Some(secret_ref))
                .with_timeout_ms(30_000)
                .with_retry_policy(ProviderRetryPolicy::new(1, vec![429, 503], 0).unwrap()),
            );
            for (meter, official, upstream) in [
                (BillingMeter::LlmInputToken, "0.150000", "0.110000"),
                (BillingMeter::LlmOutputToken, "0.600000", "0.440000"),
                (BillingMeter::LlmCacheReadToken, "0.075000", "0.055000"),
            ] {
                catalog.add_price(
                    ModelPrice::new_for_catalog_key(
                        CATALOG_KEY,
                        MODEL,
                        PriceSide::UpstreamCost,
                        meter,
                        Money::usd(upstream).unwrap(),
                    )
                    .for_upstream_account(supplier_code, account_id),
                );
                let _ = official;
            }
        }
        self.deleted_account_ids
            .write()
            .unwrap()
            .retain(|id| *id != account_id);
    }

    /// Disables a group-bound account by clearing its health statuses, so the
    /// router immediately excludes it from the account pool (fails over).
    fn admin_disable_account(&self, account_id: i64) {
        self.admin_set_account_enabled(account_id, false);
    }

    /// Enables a previously disabled account so the router routes to it again.
    fn admin_enable_account(&self, account_id: i64) {
        self.admin_set_account_enabled(account_id, true);
    }

    fn admin_set_account_enabled(&self, account_id: i64, enabled: bool) {
        let health = if enabled { 1 } else { 0 };
        let mut catalog = self.write();
        let routes = catalog.list_upstream_account_routes();
        for route in routes {
            if route.account_id == account_id {
                let mut updated = route.clone();
                updated.account_health_status = health;
                updated.credential_health_status = health;
                updated.endpoint_health_status = health;
                catalog.add_upstream_account_route(updated);
            }
        }
    }

    /// Deletes a group-bound account: removed from the shared account routes
    /// immediately (both account routes and model routes are filtered out).
    fn admin_delete_account(&self, account_id: i64) {
        self.deleted_account_ids.write().unwrap().push(account_id);
    }

    /// Lists the accounts currently bound to the given account group (admin
    /// read path).
    fn admin_list_group_accounts(&self, group_id: i64) -> Vec<UpstreamAccountRoute> {
        self.read()
            .list_upstream_account_routes()
            .into_iter()
            .filter(|route| {
                !self.is_deleted(route.account_id)
                    && route
                        .account_group_bindings
                        .iter()
                        .any(|binding| binding.account_group_id == group_id)
            })
            .collect()
    }
}

impl PricingCatalog for SharedPricingCatalog {
    fn visit_models(&self, vendor_code: Option<&str>, visitor: &mut dyn FnMut(&AiModel) -> bool) {
        self.read().visit_models(vendor_code, visitor);
    }
    fn list_model_upstream_routes(&self, model: &str) -> Vec<ModelUpstreamRoute> {
        self.read()
            .list_model_upstream_routes(model)
            .into_iter()
            .filter(|route| !self.is_deleted(route.account_id))
            .collect()
    }
    fn list_upstream_account_routes(&self) -> Vec<UpstreamAccountRoute> {
        self.read()
            .list_upstream_account_routes()
            .into_iter()
            .filter(|route| !self.is_deleted(route.account_id))
            .collect()
    }
    fn list_model_mappings(
        &self,
    ) -> Vec<sdkwork_cloudrouter_router_service::domain::ModelMappingRule> {
        self.read().list_model_mappings()
    }
    fn list_api_keys(&self) -> Vec<GatewayApiKey> {
        self.read().list_api_keys()
    }
    fn list_upstream_account_groups(&self) -> Vec<UpstreamAccountGroup> {
        self.read().list_upstream_account_groups()
    }
    fn list_model_prices(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
    ) -> Vec<ModelPrice> {
        self.read()
            .list_model_prices(model, price_side, billing_meter)
    }
    fn list_model_prices_for_side(&self, model: &str, price_side: PriceSide) -> Vec<ModelPrice> {
        self.read().list_model_prices_for_side(model, price_side)
    }
    fn find_api_key(&self, api_key_id: i64) -> Option<GatewayApiKey> {
        self.read().find_api_key(api_key_id)
    }
    fn find_api_key_by_hash(&self, key_hash: &str) -> Option<GatewayApiKey> {
        self.read().find_api_key_by_hash(key_hash)
    }
    fn find_upstream_account_group(&self, account_group_id: i64) -> Option<UpstreamAccountGroup> {
        self.read().find_upstream_account_group(account_group_id)
    }
    fn find_access_policy(
        &self,
        policy_id: i64,
    ) -> Option<sdkwork_cloudrouter_router_service::domain::GatewayAccessPolicy> {
        self.read().find_access_policy(policy_id)
    }
    fn find_quota_policy(
        &self,
        policy_id: i64,
    ) -> Option<sdkwork_cloudrouter_router_service::domain::QuotaPolicy> {
        self.read().find_quota_policy(policy_id)
    }
    fn list_gateway_risk_rules(
        &self,
    ) -> Vec<sdkwork_cloudrouter_router_service::domain::GatewayRiskRule> {
        self.read().list_gateway_risk_rules()
    }
    fn find_latest_upstream_account_group_metric_snapshot(
        &self,
        account_group_id: i64,
    ) -> Option<sdkwork_cloudrouter_router_service::domain::UpstreamAccountGroupMetricSnapshot>
    {
        self.read()
            .find_latest_upstream_account_group_metric_snapshot(account_group_id)
    }
    fn find_pricing_plan(&self, plan_code: &str) -> Option<PricingPlan> {
        self.read().find_pricing_plan(plan_code)
    }
    fn find_model(&self, model: &str) -> Option<AiModel> {
        self.read().find_model(model)
    }
    fn find_vendor(&self, vendor_code: &str) -> Option<ModelVendorDefinition> {
        self.read().find_vendor(vendor_code)
    }
    fn resolve_model_mapping(
        &self,
        source_model: &str,
        context: &sdkwork_cloudrouter_router_service::domain::ResolveModelMappingContext,
    ) -> Option<sdkwork_cloudrouter_router_service::domain::ModelMappingRule> {
        self.read().resolve_model_mapping(source_model, context)
    }
    fn find_model_upstream_route(
        &self,
        model: &str,
        supplier_code: &str,
    ) -> Option<ModelUpstreamRoute> {
        self.read()
            .find_model_upstream_route(model, supplier_code)
            .filter(|route| !self.is_deleted(route.account_id))
    }
    fn find_model_price(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        supplier_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.read().find_model_price(
            model,
            price_side,
            billing_meter,
            supplier_code,
            pricing_plan_code,
        )
    }
}

impl UpstreamAccountRouteCatalog for SharedPricingCatalog {
    fn shared_upstream_account_routes(&self) -> Arc<[UpstreamAccountRoute]> {
        self.read()
            .shared_upstream_account_routes()
            .iter()
            .filter(|route| !self.is_deleted(route.account_id))
            .cloned()
            .collect::<Vec<_>>()
            .into()
    }

    fn account_group_model_access(&self, group_id: i64) -> Option<AccountGroupModelAccess> {
        self.read().account_group_model_access(group_id)
    }

    fn supplier_model_access(&self, supplier_code: &str) -> Option<SupplierModelAccess> {
        self.read().supplier_model_access(supplier_code)
    }

    fn supplier_default_base_url(&self, supplier_code: &str) -> Option<String> {
        self.read().supplier_default_base_url(supplier_code)
    }
}

impl PricingDefaultRegionProvider for SharedPricingCatalog {
    fn default_billing_region(
        &self,
        tenant_id: i64,
        organization_id: i64,
        catalog_key: &str,
    ) -> Option<String> {
        self.read()
            .default_billing_region(tenant_id, organization_id, catalog_key)
    }
}

// ---------------------------------------------------------------------------
// Secret resolver + usage recorder
// ---------------------------------------------------------------------------

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
    Arc::new(HmacSha256ApiKeySecretHasher::new(API_KEY_PEPPER).unwrap())
}

// ---------------------------------------------------------------------------
// Mock upstream provider (one per account) capturing every request
// ---------------------------------------------------------------------------

#[derive(Debug, Default, Clone)]
struct MockProvider {
    captured: Arc<Mutex<Vec<CapturedUpstreamRequest>>>,
    marker: &'static str,
}

#[derive(Debug, Clone)]
struct CapturedUpstreamRequest {
    authorization: Option<String>,
    body: Value,
}

async fn start_mock_provider(marker: &'static str) -> (MockProvider, String) {
    let provider = MockProvider {
        captured: Arc::new(Mutex::new(Vec::new())),
        marker,
    };
    let state = Arc::new(provider.clone());
    let app = Router::new()
        .route("/v1/chat/completions", post(mock_chat_handler))
        .with_state(state);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let base_url = format!("http://{addr}");
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    // Wait until the server is actually accepting connections so the first
    // routing request cannot race the server startup.
    for _ in 0..100 {
        if tokio::net::TcpStream::connect(addr).await.is_ok() {
            return (provider, base_url);
        }
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    }
    panic!("mock provider failed to start accepting connections");
}

async fn mock_chat_handler(
    State(provider): State<Arc<MockProvider>>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> (StatusCode, Json<Value>) {
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
            "id": format!("chatcmpl-e2e-{}", provider.marker),
            "object": "chat.completion",
            "model": "gpt-4o",
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": "pong"},
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 3, "completion_tokens": 5, "total_tokens": 8}
        })),
    )
}

// ---------------------------------------------------------------------------
// Test catalog seed
// ---------------------------------------------------------------------------

fn seed_catalog(provider_a: &str, provider_b: &str) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(AiModel::new(
        MODEL,
        "GPT-4o",
        "openai",
        vec!["chat", "completion"],
    ));

    // Seeded account pool: A (priority 10) is primary, B (priority 20) is
    // failover, both bound to the default group.
    for (account_id, base_url, priority) in
        [(ACCOUNT_A, provider_a, 10), (ACCOUNT_B, provider_b, 20)]
    {
        catalog.add_upstream_account_route(
            UpstreamAccountRoute::new(SUPPLIER_CODE, account_id)
                .with_account_group_binding(DEFAULT_GROUP_ID, priority, 100)
                .with_upstream_endpoint(Some(base_url), Some(account_secret_ref(account_id)))
                .with_auth_profile(ProviderAuthProfile::bearer())
                .with_timeout_ms(30_000)
                .with_retry_policy(ProviderRetryPolicy::new(1, vec![429, 503], 0).unwrap()),
        );
        catalog.add_model_upstream_route(
            ModelUpstreamRoute::new_for_catalog_key(
                CATALOG_KEY,
                MODEL,
                SUPPLIER_CODE,
                account_id,
                CATALOG_KEY,
            )
            .with_upstream_endpoint(Some(base_url), Some(account_secret_ref(account_id)))
            .with_timeout_ms(30_000)
            .with_retry_policy(ProviderRetryPolicy::new(1, vec![429, 503], 0).unwrap()),
        );
        for (meter, official, upstream) in [
            (BillingMeter::LlmInputToken, "0.150000", "0.110000"),
            (BillingMeter::LlmOutputToken, "0.600000", "0.440000"),
            (BillingMeter::LlmCacheReadToken, "0.075000", "0.055000"),
        ] {
            catalog.add_price(ModelPrice::new_for_catalog_key(
                CATALOG_KEY,
                MODEL,
                PriceSide::OfficialReference,
                meter.clone(),
                Money::usd(official).unwrap(),
            ));
            catalog.add_price(
                ModelPrice::new_for_catalog_key(
                    CATALOG_KEY,
                    MODEL,
                    PriceSide::UpstreamCost,
                    meter,
                    Money::usd(upstream).unwrap(),
                )
                .for_upstream_account(SUPPLIER_CODE, account_id),
            );
        }
    }

    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.200000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));

    let mut default_group = UpstreamAccountGroup::new(
        DEFAULT_GROUP_ID,
        DEFAULT_GROUP_CODE,
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    );
    default_group.tenant_id = TENANT_ID;
    default_group.organization_id = 0;
    default_group.is_default = true;
    default_group.routing_strategy = UpstreamAccountRoutingStrategy::Failover;
    default_group.fallback_mode = UpstreamAccountFallbackMode::Sequential;
    catalog.add_upstream_account_group(default_group);

    // Routing policy + rule scoped to the default group.

    // A dummy api key so `find_api_key(0)` is absent (auth-token channel).
    catalog.add_api_key(
        GatewayApiKey::new(101, DEFAULT_GROUP_ID, "sk-live", "dummy").with_owner(TENANT_ID, 20, 30),
    );

    catalog
}

fn account_secret_ref(account_id: i64) -> String {
    format!("vault://providers/openrouter/account/{account_id}")
}

fn account_secret_value(account_id: i64) -> String {
    format!("sk-account-{account_id}-secret")
}

fn build_router(
    catalog: Arc<SharedPricingCatalog>,
    usage_recorder: Arc<RecordingUsageRecorder>,
) -> axum::Router {
    let secrets = [ACCOUNT_A, ACCOUNT_B, ACCOUNT_C]
        .into_iter()
        .map(|id| (account_secret_ref(id), account_secret_value(id)))
        .collect::<HashMap<_, _>>();
    let resolver = Arc::new(MapSecretResolver { secrets });
    let budget = test_response_memory_budget();
    let relay = Arc::new(
        SecretRefOpenAiCompatibleChatCompletionRelay::for_local_development(resolver.clone())
            .with_shared_response_memory_budget(budget.clone()),
    );
    let stream_relay = Arc::new(
        SecretRefOpenAiCompatibleChatCompletionStreamRelay::for_local_development(resolver)
            .with_shared_response_memory_budget(budget),
    );
    let authenticator: Arc<dyn OpenAiAuthTokenAuthenticator> =
        Arc::new(RealTestAuthTokenAuthenticator {
            config: app_session_config().expect("app session config must initialize"),
            now_unix_seconds: TEST_NOW_UNIX_SECONDS,
        });
    let runtime_config = OpenAiRuntimeRouteConfig::new(
        ProviderRetryPolicy::default(),
        OpenAiRuntimeFailureStrategy::FailClosed,
    );
    openai_chat_completions_router_with_auth_extensions(
        catalog,
        hasher(),
        Some(relay),
        Some(stream_relay),
        Some(usage_recorder),
        Vec::new(),
        runtime_config,
        Some(authenticator),
        default_open_api_bearer_classifier(),
    )
}

async fn send_chat_request(
    router: axum::Router,
    bearer: &str,
    access_token: &str,
    stream: bool,
) -> (StatusCode, String) {
    let builder = Request::builder()
        .method(Method::POST)
        .uri("/v1/chat/completions")
        .header("content-type", "application/json")
        .header("authorization", format!("Bearer {bearer}"))
        .header("Access-Token", access_token);
    let body = json!({
        "model": MODEL,
        "messages": [{"role": "user", "content": "ping"}],
        "stream": stream,
    });
    let response = router
        .oneshot(builder.body(Body::from(body.to_string())).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    (status, String::from_utf8(bytes.to_vec()).unwrap())
}

fn sign_dual_token() -> (String, String) {
    let subject = default_trusted_request_subject();
    let issued_at = 1_800_000_000_i64;
    let expires_at = issued_at + 300;
    let (bearer, access) =
        app_session_dual_token_headers(subject, issued_at, expires_at).expect("sign tokens");
    (
        bearer.trim_start_matches("Bearer ").trim().to_owned(),
        access,
    )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// The complete chain with a REAL login: dual-token app-session login →
/// default account group account pool → account selection → secret resolution
/// → real upstream API (mock provider A, primary priority 10) → response.
#[tokio::test]
async fn real_login_routes_through_default_group_pool_to_routing_target() {
    let (provider_a, base_a) = start_mock_provider("account-a").await;
    let (provider_b, base_b) = start_mock_provider("account-b").await;

    let shared = Arc::new(SharedPricingCatalog::new(seed_catalog(&base_a, &base_b)));
    let usage = Arc::new(RecordingUsageRecorder::new());
    let router = build_router(shared, usage.clone());

    let (bearer, access) = sign_dual_token();
    let (status, body) = send_chat_request(router, &bearer, &access, false).await;

    assert_eq!(StatusCode::OK, status, "unexpected response body: {body}");
    let payload: Value = serde_json::from_str(&body).unwrap();
    assert_eq!("chatcmpl-e2e-account-a", payload["id"]);

    let captured_a = provider_a.captured.lock().unwrap();
    let captured_b = provider_b.captured.lock().unwrap();
    assert_eq!(
        1,
        captured_a.len(),
        "primary account A must be called exactly once"
    );
    assert_eq!(0, captured_b.len(), "failover account B must NOT be called");
    assert_eq!(
        Some(format!("Bearer {}", account_secret_value(ACCOUNT_A))),
        captured_a[0].authorization,
        "routing target must receive the resolved account credential"
    );
    assert_eq!(MODEL, captured_a[0].body["model"]);
    assert_eq!(Some(false), captured_a[0].body["stream"].as_bool());

    let usage = usage.records();
    assert!(
        !usage.is_empty(),
        "usage must be recorded after real upstream success"
    );
}

/// Admin creates a new group-bound account → the very next routing request
/// routes to it (real-time effect).
#[tokio::test]
async fn admin_create_account_takes_effect_in_real_time() {
    let (_provider_a, base_a) = start_mock_provider("account-a").await;
    let (_provider_b, base_b) = start_mock_provider("account-b").await;
    let (provider_c, base_c) = start_mock_provider("account-c").await;

    let shared = Arc::new(SharedPricingCatalog::new(seed_catalog(&base_a, &base_b)));
    let router = build_router(shared.clone(), Arc::new(RecordingUsageRecorder::new()));

    let (bearer, access) = sign_dual_token();

    // Baseline: routes to account A (priority 10 primary).
    let (status, body) = send_chat_request(router.clone(), &bearer, &access, false).await;
    assert_eq!(StatusCode::OK, status, "unexpected response body: {body}");
    assert!(body.contains("chatcmpl-e2e-account-a"));

    // Admin creates account C with a HIGHER priority (5 < 10) bound to the
    // default group.
    shared.admin_create_account(
        SUPPLIER_CODE,
        ACCOUNT_C,
        DEFAULT_GROUP_ID,
        &base_c,
        &account_secret_ref(ACCOUNT_C),
        5,
    );

    // Next request must route to the newly created account C (real-time).
    let (status, body) = send_chat_request(router.clone(), &bearer, &access, false).await;
    assert_eq!(StatusCode::OK, status);
    assert!(
        body.contains("chatcmpl-e2e-account-c"),
        "newly created account must be routable immediately: {body}"
    );

    let captured_c = provider_c.captured.lock().unwrap();
    assert_eq!(1, captured_c.len());
    assert_eq!(
        Some(format!("Bearer {}", account_secret_value(ACCOUNT_C))),
        captured_c[0].authorization
    );
}

/// Admin disables the primary account → the router immediately fails over to
/// the remaining account in the pool (real-time effect).
#[tokio::test]
async fn admin_disable_account_fails_over_in_real_time() {
    let (provider_a, base_a) = start_mock_provider("account-a").await;
    let (provider_b, base_b) = start_mock_provider("account-b").await;

    let shared = Arc::new(SharedPricingCatalog::new(seed_catalog(&base_a, &base_b)));
    let router = build_router(shared.clone(), Arc::new(RecordingUsageRecorder::new()));
    let (bearer, access) = sign_dual_token();

    // Baseline: routes to A.
    let (status, _) = send_chat_request(router.clone(), &bearer, &access, false).await;
    assert_eq!(StatusCode::OK, status);

    // Admin disables the primary account A.
    shared.admin_disable_account(ACCOUNT_A);

    // Next request fails over to B immediately.
    let (status, body) = send_chat_request(router.clone(), &bearer, &access, false).await;
    assert_eq!(StatusCode::OK, status);
    assert!(
        body.contains("chatcmpl-e2e-account-b"),
        "disabled account must be skipped and routing fails over to B: {body}"
    );

    let captured_a = provider_a.captured.lock().unwrap();
    let captured_b = provider_b.captured.lock().unwrap();
    assert_eq!(
        1,
        captured_a.len(),
        "account A must NOT be called after disable"
    );
    assert_eq!(1, captured_b.len(), "account B must take over");
}

/// Admin re-enables a disabled account → routing restores it (real-time).
#[tokio::test]
async fn admin_enable_account_restores_routing_in_real_time() {
    let (provider_a, base_a) = start_mock_provider("account-a").await;
    let (_provider_b, base_b) = start_mock_provider("account-b").await;

    let shared = Arc::new(SharedPricingCatalog::new(seed_catalog(&base_a, &base_b)));
    let router = build_router(shared.clone(), Arc::new(RecordingUsageRecorder::new()));
    let (bearer, access) = sign_dual_token();

    shared.admin_disable_account(ACCOUNT_A);
    let (status, body) = send_chat_request(router.clone(), &bearer, &access, false).await;
    assert!(status.is_success(), "unexpected response body: {body}");
    assert!(body.contains("chatcmpl-e2e-account-b"));

    // Admin re-enables A → it becomes primary again (priority 10 < 20).
    shared.admin_enable_account(ACCOUNT_A);
    let (status, body) = send_chat_request(router.clone(), &bearer, &access, false).await;
    assert_eq!(StatusCode::OK, status);
    assert!(
        body.contains("chatcmpl-e2e-account-a"),
        "re-enabled account must route again: {body}"
    );

    let captured_a = provider_a.captured.lock().unwrap();
    assert_eq!(1, captured_a.len());
}

/// Admin deletes an account → it leaves the pool immediately; the router
/// continues to route to the remaining accounts.
#[tokio::test]
async fn admin_delete_account_removes_it_from_pool_in_real_time() {
    let (_provider_a, base_a) = start_mock_provider("account-a").await;
    let (provider_b, base_b) = start_mock_provider("account-b").await;

    let shared = Arc::new(SharedPricingCatalog::new(seed_catalog(&base_a, &base_b)));
    let router = build_router(shared.clone(), Arc::new(RecordingUsageRecorder::new()));
    let (bearer, access) = sign_dual_token();

    // Admin deletes account B (failover member).
    shared.admin_delete_account(ACCOUNT_B);

    // List (admin read path): B is gone, A remains.
    let group_accounts = shared.admin_list_group_accounts(DEFAULT_GROUP_ID);
    assert!(
        group_accounts
            .iter()
            .all(|route| route.account_id != ACCOUNT_B),
        "deleted account must be absent from group account list"
    );
    assert!(group_accounts
        .iter()
        .any(|route| route.account_id == ACCOUNT_A));

    // Routing still works via A.
    let (status, body) = send_chat_request(router.clone(), &bearer, &access, false).await;
    assert_eq!(StatusCode::OK, status);
    assert!(body.contains("chatcmpl-e2e-account-a"));

    let captured_b = provider_b.captured.lock().unwrap();
    assert_eq!(0, captured_b.len(), "deleted account must never be called");
}

/// Routing account errors: when every account in the pool is disabled, the
/// request fails with a clear server error and never leaks secrets.
#[tokio::test]
async fn all_accounts_disabled_yields_server_error_without_secret_leak() {
    let (provider_a, base_a) = start_mock_provider("account-a").await;
    let (provider_b, base_b) = start_mock_provider("account-b").await;

    let shared = Arc::new(SharedPricingCatalog::new(seed_catalog(&base_a, &base_b)));
    let router = build_router(shared.clone(), Arc::new(RecordingUsageRecorder::new()));
    let (bearer, access) = sign_dual_token();

    shared.admin_disable_account(ACCOUNT_A);
    shared.admin_disable_account(ACCOUNT_B);

    let (status, body) = send_chat_request(router.clone(), &bearer, &access, false).await;
    assert!(
        status.is_server_error(),
        "all accounts disabled must yield a server error, got {status}"
    );
    assert!(
        !body.contains(account_secret_value(ACCOUNT_A).as_str())
            && !body.contains(account_secret_value(ACCOUNT_B).as_str())
            && !body.contains(account_secret_ref(ACCOUNT_A).as_str()),
        "error response must never leak upstream secrets or secret refs"
    );

    let captured_a = provider_a.captured.lock().unwrap();
    let captured_b = provider_b.captured.lock().unwrap();
    assert_eq!(0, captured_a.len());
    assert_eq!(0, captured_b.len());
}
