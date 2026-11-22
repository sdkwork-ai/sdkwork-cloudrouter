//! Repro/定位：Auth-token 登录通道直接调用 `/v1/chat/completions` 的 503 根因。
//!
//! 不依赖 IAM 数据库：用一个 canned `OpenAiAuthTokenAuthenticator` 模拟
//! `IamAuthTokenAuthenticator` 解析成功后的结果（tenant/org/user + 默认分组
//! `code="default-group"`, `is_default=true`），再把账号种子装进
//! `InMemoryPricingCatalog`，最后用 `openai_chat_completions_router_with_auth_extensions`
//! 走完整 open-api 鉴权→选路→relay 链路，观察到底是成功还是 503，以及 503 的具体阶段。

use std::sync::Arc;
use std::sync::Mutex;

use async_trait::async_trait;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_cloudrouter_router_service::api::{
    openai_chat_completions_router_with_auth_extensions, OpenAiAuthTokenAuthenticator,
    OpenAiAuthTokenError, OpenAiAuthTokenIdentity, OpenAiRuntimeRouteConfig,
};
use sdkwork_cloudrouter_router_service::domain::{
    AccountGroupRouteScope, AiModel, BillingMeter, DecimalValue, DomainResult, ModelPrice,
    ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    ProviderRetryPolicy, UpstreamAccountGroup, UpstreamAccountRoute, UserAccountGroupRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_cloudrouter_router_service::ports::{
    ChatCompletionRelay, ChatCompletionRelayRequest, ChatCompletionRelayResponse,
};
use tower::ServiceExt;

const DEFAULT_GROUP_CODE: &str = "default-group";
const DEFAULT_GROUP_ID: i64 = 2001;
const TENANT_ID: i64 = 100_001;
const ACCOUNT_ID: i64 = 3001;
const SUPPLIER_CODE: &str = "openrouter";

/// Canned auth-token authenticator：模拟 IAM 把 bearer 解析为租户+默认分组。
/// 与 `IamAuthTokenAuthenticator` 的返回值一致（`api_key_id=0`）。
struct CannedAuthTokenAuthenticator;

#[async_trait]
impl OpenAiAuthTokenAuthenticator for CannedAuthTokenAuthenticator {
    async fn authenticate(
        &self,
        _raw_bearer_token: &str,
        _access_token: Option<&str>,
    ) -> Result<OpenAiAuthTokenIdentity, OpenAiAuthTokenError> {
        // Identity only: the router selects the subject's default group for the
        // chat modality afterwards.
        Ok(OpenAiAuthTokenIdentity {
            tenant_id: TENANT_ID,
            organization_id: 0,
            user_id: 30,
        })
    }
}

#[derive(Debug)]
struct GatewayRecordingRelay {
    captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>,
}

impl GatewayRecordingRelay {
    fn new(captured: Arc<Mutex<Vec<ChatCompletionRelayRequest>>>) -> Self {
        Self { captured }
    }
}

impl ChatCompletionRelay for GatewayRecordingRelay {
    fn create_chat_completion<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> std::pin::Pin<
        Box<
            dyn std::future::Future<Output = DomainResult<ChatCompletionRelayResponse>> + Send + 'a,
        >,
    > {
        self.captured.lock().unwrap().push(request);
        Box::pin(async {
            Ok(ChatCompletionRelayResponse::json(
                200,
                serde_json::json!({
                    "id": "chatcmpl-auth-token",
                    "object": "chat.completion",
                    "model": "gpt-4o-mini",
                    "choices": [
                        {
                            "index": 0,
                            "message": {"role": "assistant", "content": "auth-token-pong"},
                            "finish_reason": "stop"
                        }
                    ],
                    "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}
                }),
            ))
        })
    }
}

/// 默认分组（`default-group`, is_default）+ 一个绑定了该分组的账号 + 模型 + 选路策略 + 计价，
/// 完全复刻数据库种子的形态（见 ai_routing_seed）。若这样仍是 503，则必须是选路阶段某个
/// 条件不满足；relay 会在被选中时被调用。
fn catalog_with_default_group_and_account() -> InMemoryPricingCatalog {
    catalog_with_default_group_and_account_for_group_id(DEFAULT_GROUP_ID)
}

/// 完整种子，但默认分组的 `id` 可指定。选路器按 `find_upstream_account_group(group_id)`
/// 解析分组；当库里该租户的默认分组行 id 与鉴权上下文/账号绑定引用的 group_id 不一致
/// （没有一条 id=group_id 的分组行），就会 503 `upstream_route_not_available`。
fn catalog_with_default_group_and_account_for_group_id(
    default_group_id: i64,
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
    // model 级上游路由：指向账号 ACCOUNT_ID，携带兜底 base_url + secret_ref，
    // 以及 openai.chat_completions 协议。
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            SUPPLIER_CODE,
            ACCOUNT_ID,
            "openai/gpt-4o-mini",
        )
        .with_upstream_endpoint(
            Some("https://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/main"),
        )
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    // 账号级上游账号路由：同一账号，绑定默认分组 (DEFAULT_GROUP_ID)。
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new(SUPPLIER_CODE, ACCOUNT_ID)
            .with_account_group_binding(DEFAULT_GROUP_ID, 10, 100)
            .with_upstream_endpoint(
                Some("https://provider-proxy.internal/openrouter"),
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
    // 默认分组：code=default-group, is_default=true（auth-token 鉴权器按此选组）。
    // 关键：`UpstreamAccountGroup::new` 的第一个参数就是分组 `id`，选路器用
    // `find_upstream_account_group(context.group_id)` 解析该行；若分组 id 与
    // 鉴权器/账号绑定使用的 group_id 不一致，会 503 `upstream account group not found`。
    let mut default_group = UpstreamAccountGroup::new(
        default_group_id,
        DEFAULT_GROUP_CODE,
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    );
    default_group.tenant_id = TENANT_ID;
    default_group.organization_id = 0;
    default_group.is_default = true;
    catalog.add_upstream_account_group(default_group);
    // 计价：chat 需要 input/output（以及可能的 cache-read）official 与 upstream 价。
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
            .for_upstream_account(SUPPLIER_CODE, ACCOUNT_ID),
        );
    }
    // 选路策略：绑定默认分组 + chat 能力。
    catalog
}

fn hasher() -> Arc<HmacSha256ApiKeySecretHasher> {
    Arc::new(HmacSha256ApiKeySecretHasher::new("0123456789abcdef0123456789abcdef").unwrap())
}

const BACKUP_GROUP_ID: i64 = 2002;
const BACKUP_SUPPLIER_CODE: &str = "backup";
const BACKUP_ACCOUNT_ID: i64 = 3002;

/// The seeded default pool plus a second pool (`backup`), and optionally a
/// user model rule that names one group. A rule pointing at a non-existent
/// group exercises the account-default fallback.
fn catalog_with_backup_pool_and_user_rule(user_rule_group: Option<i64>) -> InMemoryPricingCatalog {
    let mut catalog = catalog_with_default_group_and_account();
    let mut backup_group = UpstreamAccountGroup::new(
        BACKUP_GROUP_ID,
        "backup-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    );
    backup_group.tenant_id = TENANT_ID;
    backup_group.organization_id = 0;
    backup_group.is_default = false;
    catalog.add_upstream_account_group(backup_group);
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new(BACKUP_SUPPLIER_CODE, BACKUP_ACCOUNT_ID)
            .with_account_group_binding(BACKUP_GROUP_ID, 10, 100)
            .with_upstream_endpoint(
                Some("https://provider-proxy.internal/backup"),
                Some("vault://providers/backup/account/main"),
            )
            .with_timeout_ms(30_000)
            .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            BACKUP_SUPPLIER_CODE,
            BACKUP_ACCOUNT_ID,
            "openai/gpt-4o-mini",
        )
        .with_upstream_endpoint(
            Some("https://provider-proxy.internal/backup"),
            Some("vault://providers/backup/account/main"),
        ),
    );
    for meter in [
        BillingMeter::LlmInputToken,
        BillingMeter::LlmOutputToken,
        BillingMeter::LlmCacheReadToken,
    ] {
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openai/gpt-4o-mini",
                "gpt-4o-mini",
                PriceSide::UpstreamCost,
                meter,
                Money::usd("0.110000").unwrap(),
            )
            .for_upstream_account(BACKUP_SUPPLIER_CODE, BACKUP_ACCOUNT_ID),
        );
    }
    if let Some(group_id) = user_rule_group {
        catalog.add_user_account_group_route(UserAccountGroupRoute {
            tenant_id: TENANT_ID,
            organization_id: 0,
            user_id: 30,
            scope: AccountGroupRouteScope::Model,
            modality: "text".to_owned(),
            vendor_code: "openai".to_owned(),
            model: "gpt-4o-mini".to_owned(),
            account_group_id: group_id,
            account_group_code: if group_id == BACKUP_GROUP_ID {
                "backup-group".to_owned()
            } else {
                "missing-group".to_owned()
            },
            priority: 10,
        });
    }
    catalog
}

async fn invoke_auth_token_chat(
    catalog: InMemoryPricingCatalog,
    group_header: Option<&str>,
) -> (StatusCode, String, Arc<Mutex<Vec<ChatCompletionRelayRequest>>>) {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(GatewayRecordingRelay::new(Arc::clone(&captured)));
    let router = openai_chat_completions_router_with_auth_extensions(
        Arc::new(catalog),
        hasher(),
        Some(relay),
        None,
        None,
        Vec::new(),
        OpenAiRuntimeRouteConfig::default(),
        Some(Arc::new(CannedAuthTokenAuthenticator)),
        sdkwork_web_core::default_open_api_bearer_classifier(),
    );
    let mut request = Request::builder()
        .method("POST")
        .uri("/v1/chat/completions")
        .header("authorization", "Bearer <login-auth-token>")
        .header("Access-Token", "login-access-token")
        .header("content-type", "application/json");
    if let Some(group_header) = group_header {
        request = request.header("x-sdkwork-account-group", group_header);
    }
    let response = router
        .oneshot(
            request
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    (status, String::from_utf8_lossy(&body).into_owned(), captured)
}

#[tokio::test]
async fn user_model_rule_routes_auth_token_traffic_to_the_selected_pool() {
    let (status, body, captured) = invoke_auth_token_chat(
        catalog_with_backup_pool_and_user_rule(Some(BACKUP_GROUP_ID)),
        None,
    )
    .await;
    assert_eq!(StatusCode::OK, status, "expected 200, got {status}: {body}");
    let request = captured
        .lock()
        .unwrap()
        .first()
        .cloned()
        .expect("relay called");
    assert_eq!(BACKUP_SUPPLIER_CODE, request.supplier_code);
}

#[tokio::test]
async fn selector_header_overrides_the_user_rule_for_auth_token_traffic() {
    let (status, body, captured) = invoke_auth_token_chat(
        catalog_with_backup_pool_and_user_rule(Some(DEFAULT_GROUP_ID)),
        Some("backup-group"),
    )
    .await;
    assert_eq!(StatusCode::OK, status, "expected 200, got {status}: {body}");
    let request = captured
        .lock()
        .unwrap()
        .first()
        .cloned()
        .expect("relay called");
    assert_eq!(BACKUP_SUPPLIER_CODE, request.supplier_code);
}

#[tokio::test]
async fn unusable_user_rule_falls_back_to_the_account_default_pool() {
    let (status, body, captured) =
        invoke_auth_token_chat(catalog_with_backup_pool_and_user_rule(Some(999_999)), None)
            .await;
    assert_eq!(StatusCode::OK, status, "expected 200, got {status}: {body}");
    let request = captured
        .lock()
        .unwrap()
        .first()
        .cloned()
        .expect("relay called");
    assert_eq!(SUPPLIER_CODE, request.supplier_code);
}

/// 登录后直接用 auth token 调 `/v1/chat/completions`：
/// 种子里默认分组 + 账号齐全，期望 200 并命中 relay；若返回 503，断言信息会把
/// 失败阶段的 detail 打出来，便于定位。
#[tokio::test]
async fn auth_token_chat_completion_reaches_relay_when_default_group_and_account_are_seeded() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(GatewayRecordingRelay::new(Arc::clone(&captured)));
    let router = openai_chat_completions_router_with_auth_extensions(
        Arc::new(catalog_with_default_group_and_account()),
        hasher(),
        Some(relay),
        None,
        None,
        Vec::new(),
        OpenAiRuntimeRouteConfig::default(),
        Some(Arc::new(CannedAuthTokenAuthenticator)),
        sdkwork_web_core::default_open_api_bearer_classifier(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer <login-auth-token>")
                .header("Access-Token", "login-access-token")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let text = String::from_utf8_lossy(&body);
    assert_eq!(
        StatusCode::OK,
        status,
        "auth-token chat completion failed with HTTP {status}: {text}"
    );
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(
        "auth-token-pong",
        payload["choices"][0]["message"]["content"]
    );
    let request = captured
        .lock()
        .unwrap()
        .first()
        .cloned()
        .expect("relay called");
    assert_eq!(SUPPLIER_CODE, request.supplier_code);
}

/// 复现用户报告的 503：默认分组存在、账号也存在，但账号绑定引用的分组 id 与
/// 目录里默认分组的真实 id 不一致（例如种子的分组 id 落到别的值，或该租户下的
/// 默认分组 id ≠ 绑定里引用的 group_id）。
///
/// 注意：鉴权通道现在只返回身份，分组由目录里的默认分组解析，因此「鉴权上下文
/// 的 group_id 在目录里不存在」已不可能发生；同一数据错位表现为「默认分组存在，
/// 但没有任何账号绑定到它」→ 选路器 503 `upstream_route_not_available`。
#[tokio::test]
async fn auth_token_chat_completion_returns_503_when_default_group_id_mismatches_binding() {
    // 复用完整种子，但把唯一的默认分组行 id 改成与账号绑定不同的值，
    // 以模拟库里分组 id 与绑定引用的 group_id 不一致。
    let catalog = catalog_with_default_group_and_account_for_group_id(DEFAULT_GROUP_ID + 999);

    let captured = Arc::new(Mutex::new(Vec::new()));
    let relay = Arc::new(GatewayRecordingRelay::new(Arc::clone(&captured)));
    let router = openai_chat_completions_router_with_auth_extensions(
        Arc::new(catalog),
        hasher(),
        Some(relay),
        None,
        None,
        Vec::new(),
        OpenAiRuntimeRouteConfig::default(),
        Some(Arc::new(CannedAuthTokenAuthenticator)),
        sdkwork_web_core::default_open_api_bearer_classifier(),
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", "Bearer <login-auth-token>")
                .header("Access-Token", "login-access-token")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let text = String::from_utf8_lossy(&body);
    assert_eq!(
        StatusCode::SERVICE_UNAVAILABLE,
        status,
        "expected 503 for unmatched default-group id, got {status}: {text}"
    );
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("upstream_route_not_available", payload["error"]["code"]);
    assert!(
        text.contains("has no accounts bound for api="),
        "expected the route selector to flag the account-group routing gap, got: {text}"
    );
    assert!(
        captured.lock().unwrap().is_empty(),
        "relay must not be called when route resolution fails"
    );
}
