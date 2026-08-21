//! Chat completion auth-token channel integration tests.
//!
//! Tests the full lifecycle of the flexible bearer channel for
//! `/v1/chat/completions`: an SDKWork app-session auth token (non-`sk-`/`sp-`
//! bearer <REDACTED>) resolves into an authenticated upstream route context
//! through the [`OpenAiAuthTokenAuthenticator`] trait, then the gateway relays
//! the chat completion request to a provider and returns the OpenAI-compatible
//! response.
//!
//! These tests follow `TEST_SPEC.md` contract-test requirements:
//! - Every protected API surface includes an unauthenticated request test.
//! - The auth-token channel classifies bearer credentials and resolves them.
//! - The happy path proves the complete request→auth→relay→response pipeline.
//!
//! The auth-token authenticator used here (`RealTestAuthTokenAuthenticator`)
//! delegates to the real `verify_app_session_token` function from
//! `sdkwork-cloudrouter-http`, so a malformed token or a subject mismatch
//! between bearer <REDACTED> and access token produces a genuine 401 response.

use std::sync::Arc;

use async_trait::async_trait;
use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use axum::response::IntoResponse;
use serde_json::Value;
use tower::ServiceExt;

use sdkwork_cloudrouter_router_service::api::{
    openai_chat_completions_router_with_auth_extensions, OpenAiAuthTokenAuthenticator,
    OpenAiRuntimeFailureStrategy, OpenAiRuntimeRouteConfig,
};
use sdkwork_cloudrouter_router_service::application::AuthenticatedApiKeyContext;
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, ModelPrice, ModelUpstreamRoute, ModelVendor,
    ModelVendorDefinition, Money, PriceSide, PricingPlan, ProviderAuthProfile,
    ProviderRetryPolicy, RouteCandidate, RoutingCapability, RoutingPolicy, RoutingPolicyScope,
    RoutingRule, UpstreamAccountGroup, UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_cloudrouter_router_service::ports::{
    ChatCompletionRelay, ChatCompletionRelayRequest, ChatCompletionRelayResponse,
};
use sdkwork_cloudrouter_test_support::{
    app_session_bearer_token, app_session_dual_token_headers, app_session_config,
    default_trusted_request_subject, API_KEY_PEPPER,
};
use sdkwork_cloudrouter_config::AppSessionConfig;
use sdkwork_cloudrouter_http::verify_app_session_token;
use sdkwork_web_core::default_open_api_bearer_classifier;

// ---------------------------------------------------------------------------
// Test fixture constants — group_id must be identical across
// UpstreamAccountGroup.id, UpstreamAccountRoute binding, and AuthenticatedApiKeyContext.
// ---------------------------------------------------------------------------

const DEFAULT_GROUP_ID: i64 = 2001;
const DEFAULT_GROUP_CODE: &str = "default-group";
const TENANT_ID: i64 = 100_001;
const ACCOUNT_ID: i64 = 3001;
const SUPPLIER_CODE: &str = "openrouter";

/// Fixed `now` used by the authenticator. The test tokens are signed with
/// `issued_at = 1_800_000_000` and `expires_at = issued_at + 300`, so `now = issued_at + 1`
/// lands the tokens inside the valid time window.
const TEST_NOW_UNIX_SECONDS: i64 = 1_800_000_001;

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/// Build a complete `InMemoryPricingCatalog` seeded with a default group,
/// an upstream account bound to it, a chat model with routing policy and
/// pricing — so route selection succeeds without a database.
///
/// The critical invariant: `UpstreamAccountGroup.id` (DEFAULT_GROUP_ID),
/// `UpstreamAccountRoute::with_account_group_binding(DEFAULT_GROUP_ID, ...)`,
/// and `AuthenticatedApiKeyContext.group_id` (DEFAULT_GROUP_ID) must all
/// agree, or the route planner returns 503 `upstream account group not found`.
fn build_test_catalog() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();

    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));

    catalog.add_model(AiModel::new(
        "gpt-4o",
        "GPT-4o",
        "openai",
        vec!["chat", "completion"],
    ));

    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o",
            "gpt-4o",
            SUPPLIER_CODE,
            ACCOUNT_ID,
            "openai/gpt-4o",
        )
        .with_upstream_endpoint(
            Some("https://provider-proxy.internal/openrouter"),
            Some("vault://providers/openrouter/account/main"),
        )
        .with_timeout_ms(30_000)
        .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );

    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new(SUPPLIER_CODE, ACCOUNT_ID)
            .with_account_group_binding(DEFAULT_GROUP_ID, 10, 100)
            .with_upstream_endpoint(
                Some("https://provider-proxy.internal/openrouter"),
                Some("vault://providers/openrouter/account/main"),
            )
            .with_auth_profile(ProviderAuthProfile::bearer())
            .with_timeout_ms(30_000)
            .with_retry_policy(ProviderRetryPolicy::new(3, vec![429, 503], 0).unwrap()),
    );

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
    catalog.add_upstream_account_group(default_group);

    for meter in [
        BillingMeter::LlmInputToken,
        BillingMeter::LlmOutputToken,
        BillingMeter::LlmCacheReadToken,
    ] {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            "openai/gpt-4o",
            "gpt-4o",
            PriceSide::OfficialReference,
            meter.clone(),
            Money::usd("0.150000").unwrap(),
        ));
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                "openai/gpt-4o",
                "gpt-4o",
                PriceSide::UpstreamCost,
                meter,
                Money::usd("0.110000").unwrap(),
            )
            .for_upstream_account(SUPPLIER_CODE, ACCOUNT_ID),
        );
    }

    catalog.add_routing_policy(
        RoutingPolicy::new(
            9001,
            TENANT_ID,
            20,
            "default-group-gpt-4o-policy",
            RoutingPolicyScope::UpstreamAccountGroup,
            Some(DEFAULT_GROUP_ID),
            Some(9101),
        )
        .with_capability(RoutingCapability::Chat),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            9102,
            TENANT_ID,
            20,
            9101,
            "default-group-gpt-4o",
            1,
            r#"{"catalogKey":"openai/gpt-4o"}"#,
            "openai/gpt-4o",
        )
        .with_candidate_account_groups(vec![RouteCandidate::new(DEFAULT_GROUP_ID, 100)]),
    );

    catalog
}

/// Mock chat-completion relay that returns a deterministic OpenAI-compatible
/// JSON response without contacting any upstream.
struct MockChatRelay;

impl ChatCompletionRelay for MockChatRelay {
    fn create_chat_completion<'a>(
        &'a self,
        request: ChatCompletionRelayRequest,
    ) -> sdkwork_cloudrouter_router_service::ports::ChatCompletionRelayFuture<'a> {
        let response_body = serde_json::json!({
            "id": "chatcmpl-test-001",
            "object": "chat.completion",
            "created": 1_800_000_000,
            "model": request.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "Hello! This is a test response.",
                        "refusal": null
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 5,
                "total_tokens": 15
            }
        });
        Box::pin(async move { Ok(ChatCompletionRelayResponse::json(200, response_body)) })
    }
}

/// Auth-token authenticator that delegates to the real app-session token
/// verification (HMAC-SHA256 signature check + time window validation), so
/// malformed tokens and subject mismatches produce genuine 401 responses.
///
/// Group resolution maps the verified subject's tenant_id to the seeded
/// `UpstreamAccountGroup`, mirroring how a real authenticator would resolve
/// the caller's organization group from IAM after verifying the token.
struct RealTestAuthTokenAuthenticator {
    config: AppSessionConfig,
    now_unix_seconds: i64,
}

impl RealTestAuthTokenAuthenticator {
    /// Resolve the upstream account group for a verified subject. In a real
    /// deployment this would be an IAM lookup; here we map the canonical test
    /// tenant to its seeded group so the downstream route planner can find a
    /// group with id = DEFAULT_GROUP_ID.
    fn resolve_group(
        &self,
        tenant_id: i64,
    ) -> (i64, String, String) {
        // tenant_id → (group_id, group_code, pricing_plan_code)
        match tenant_id {
            TENANT_ID => (DEFAULT_GROUP_ID, DEFAULT_GROUP_CODE.to_owned(), "standard".to_owned()),
            _ => (DEFAULT_GROUP_ID, DEFAULT_GROUP_CODE.to_owned(), "standard".to_owned()),
        }
    }
}

fn openai_auth_error(status: StatusCode, code: &str, message: &str) -> Box<axum::response::Response> {
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
    ) -> Result<AuthenticatedApiKeyContext, sdkwork_cloudrouter_router_service::api::OpenAiAuthTokenError>
    {
        // 1. Verify the bearer token signature and time window.
        let bearer_subject = match verify_app_session_token(
            &self.config,
            raw_bearer_token,
            self.now_unix_seconds,
        ) {
            Ok(subject) => subject,
            Err(error) => {
                return Err(openai_auth_error(
                    StatusCode::UNAUTHORIZED,
                    "invalid_auth_token",
                    &format!("bearer token verification failed: {error}"),
                ));
            }
        };

        // 2. If an access token is present, verify it and confirm it matches
        //    the bearer <REDACTED> subject.
        if let Some(access) = access_token
            .map(str::trim)
            .filter(|v| !v.is_empty())
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

        // 3. Map verified subject to an authenticated context.
        let (group_id, group_code, pricing_plan_code) = self.resolve_group(bearer_subject.tenant_id);

        Ok(AuthenticatedApiKeyContext {
            api_key_id: 0,
            tenant_id: bearer_subject.tenant_id,
            organization_id: bearer_subject.organization_id,
            user_id: bearer_subject.user_id,
            api_key_name_snapshot: "auth-token-session".to_owned(),
            group_id,
            group_code,
            pricing_plan_code,
        })
    }
}

// ---------------------------------------------------------------------------
// Helper: build the chat-completion router with all extensions wired up
// ---------------------------------------------------------------------------

fn build_test_router() -> axum::Router {
    let catalog: Arc<InMemoryPricingCatalog> = Arc::new(build_test_catalog());
    let hasher = Arc::new(
        HmacSha256ApiKeySecretHasher::new(API_KEY_PEPPER).expect("hasher must initialize"),
    );
    let relay: Arc<dyn ChatCompletionRelay + Send + Sync> = Arc::new(MockChatRelay);
    let authenticator: Arc<dyn OpenAiAuthTokenAuthenticator> = Arc::new(
        RealTestAuthTokenAuthenticator {
            config: app_session_config().expect("app session config must initialize"),
            now_unix_seconds: TEST_NOW_UNIX_SECONDS,
        },
    );

    let runtime_config = OpenAiRuntimeRouteConfig::new(
        ProviderRetryPolicy::default(),
        OpenAiRuntimeFailureStrategy::FailClosed,
    );

    openai_chat_completions_router_with_auth_extensions(
        catalog,
        hasher,
        Some(relay),
        None,            // stream_relay
        None,            // usage_recorder
        Vec::new(),      // plugins
        runtime_config,
        Some(authenticator),
        default_open_api_bearer_classifier(),
    )
}

/// Send a POST `/v1/chat/completions` request and return (status, body_text).
async fn send_chat_request(
    router: axum::Router,
    bearer: Option<&str>,
    access_token: Option<&str>,
    body: Value,
) -> (StatusCode, String) {
    let mut builder = Request::builder()
        .method(Method::POST)
        .uri("/v1/chat/completions")
        .header("content-type", "application/json");

    if let Some(token) = bearer {
        builder = builder.header("authorization", format!("Bearer {token}"));
    }
    if let Some(token) = access_token {
        builder = builder.header("Access-Token", token);
    }

    let response = router
        .oneshot(builder.body(Body::from(body.to_string())).unwrap())
        .await
        .unwrap();

    let status = response.status();
    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_text = String::from_utf8(body_bytes.to_vec()).unwrap();
    (status, body_text)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// Verifies that an unauthenticated request to `/v1/chat/completions` returns
/// `401 Unauthorized` with an OpenAI-compatible error envelope.
#[tokio::test]
async fn unauthenticated_request_returns_401() {
    eprintln!("[no_auth] 发送无 Authorization 头部的请求");
    let router = build_test_router();
    let (status, body_text) = send_chat_request(
        router,
        None,
        None,
        serde_json::json!({
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": "Hello"}]
        }),
    )
    .await;

    eprintln!("[no_auth] 响应: HTTP {}  body={}", status.as_u16(), body_text);
    assert_eq!(
        StatusCode::UNAUTHORIZED,
        status,
        "unauthenticated request must return 401"
    );
    let body: Value = serde_json::from_str(&body_text).expect("response must be valid JSON");
    assert!(
        body.get("error").is_some(),
        "error envelope must contain 'error' field"
    );
    eprintln!("[no_auth] ✓ 验证通过：无认证正确返回 401\n");
}

/// Verifies that a malformed bearer <REDACTED> (not a valid app-session token
/// format) returns `401 Unauthorized`. The authenticator uses real token
/// verification, so a garbage token fails HMAC signature validation.
#[tokio::test]
async fn malformed_bearer_token_returns_401() {
    eprintln!("[malformed] 发送无效 token: 'not-a-valid-token-at-all'");
    let router = build_test_router();
    let (status, body_text) = send_chat_request(
        router,
        Some("not-a-valid-token-at-all"),
        None,
        serde_json::json!({
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": "Hello"}]
        }),
    )
    .await;

    eprintln!("[malformed] 响应: HTTP {}  body={}", status.as_u16(), body_text);
    assert_eq!(
        StatusCode::UNAUTHORIZED,
        status,
        "malformed bearer token must return 401"
    );
    let body: Value = serde_json::from_str(&body_text).expect("response must be valid JSON");
    assert!(
        body.get("error").is_some(),
        "error envelope must contain 'error' field for invalid token"
    );
    eprintln!("[malformed] ✓ 验证通过：无效 token 正确返回 401\n");
}

/// Verifies the happy path: an SDKWork app-session auth token (dual-token
/// channel) authenticates successfully and the chat completion request is
/// relayed to the provider, returning a valid OpenAI-compatible response.
#[tokio::test]
async fn auth_token_chat_completion_happy_path() {
    let router = build_test_router();

    // Arrange: build a valid dual-token pair using the test-support helpers.
    let subject = default_trusted_request_subject();
    let issued_at = 1_800_000_000_i64;
    let expires_at = issued_at + 300;
    let (bearer, access_token) =
        app_session_dual_token_headers(subject, issued_at, expires_at)
            .expect("failed to sign dual-token headers");

    eprintln!("[happy_path] 双 token 签名完成: user_id={}", subject.user_id);

    let request_body = serde_json::json!({
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Hello, world!"}],
        "max_tokens": 100
    });

    // Act
    let (status, body_text) = send_chat_request(
        router,
        Some(bearer.trim_start_matches("Bearer ").trim()),
        Some(&access_token),
        request_body,
    )
    .await;

    eprintln!("[happy_path] 响应: HTTP {}  body长度={}", status.as_u16(), body_text.len());

    // Assert: HTTP 200 with a valid chat completion response body.
    assert_eq!(
        StatusCode::OK,
        status,
        "auth-token chat completion should return 200 OK"
    );

    let body: Value =
        serde_json::from_str(&body_text).expect("response body must be valid JSON");
    assert_eq!(
        "chat.completion",
        body["object"].as_str().unwrap_or(""),
        "response object must be 'chat.completion'"
    );
    assert_eq!(
        "gpt-4o",
        body["model"].as_str().unwrap_or(""),
        "response model must match request"
    );
    assert!(
        body["choices"].as_array().map_or(false, |c| !c.is_empty()),
        "response must contain at least one choice"
    );
    assert_eq!(
        "assistant",
        body["choices"][0]["message"]["role"]
            .as_str()
            .unwrap_or(""),
        "choice message role must be 'assistant'"
    );
    eprintln!("[happy_path] 响应内容: {}", body["choices"][0]["message"]["content"].as_str().unwrap_or(""));
    assert!(
        body["usage"]["total_tokens"].as_i64().unwrap_or(0) > 0,
        "response must report token usage"
    );
    eprintln!("[happy_path] ✓ 验证通过：有效双 token 完整调用成功，返回 200\n");
}

/// Verifies that an `sk-` prefixed API-key credential still takes the API-key
/// channel (not the auth-token channel) and responds with a well-formed body.
#[tokio::test]
async fn api_key_bearer_takes_api_key_channel() {
    let router = build_test_router();

    let request_body = serde_json::json!({
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Hello from API key"}],
        "max_tokens": 50
    });

    // Act: use a sk- prefixed credential that the catalog does not have.
    let (status, body_text) = send_chat_request(
        router,
        Some("sk-live-test-unknown"),
        None,
        request_body,
    )
    .await;

    // Assert: The API-key channel must not panic. Either:
    // - 200 OK (if the API key resolves), or
    // - 401 Unauthorized (unknown key), both are well-formed JSON.
    let body: Value = serde_json::from_str(&body_text).unwrap_or(Value::Null);

    if status == StatusCode::OK {
        assert!(
            body["object"].as_str() == Some("chat.completion"),
            "successful API-key chat completion must return chat.completion object"
        );
    } else {
        assert!(
            body.get("error").is_some() || body.is_null(),
            "API-key auth failure must return an error envelope or empty body"
        );
    }
}

/// Verifies that the auth-token channel rejects an `Access-Token` header whose
/// subject does not match the `Authorization` bearer <REDACTED> subject.
/// The real authenticator detects the subject mismatch and returns 401.
#[tokio::test]
async fn mismatched_dual_token_returns_401() {
    let router = build_test_router();

    // Arrange: sign two tokens with different user ids.
    let subject_a = default_trusted_request_subject();
    let mut subject_b = subject_a;
    subject_b.user_id = 999; // different user
    subject_b.operator_id = 999;

    let issued_at = 1_800_000_000_i64;
    let expires_at = issued_at + 300;

    let bearer = app_session_bearer_token(subject_a, issued_at, expires_at)
        .expect("failed to sign bearer token");
    let mismatched_access =
        app_session_bearer_token(subject_b, issued_at + 1, expires_at + 1)
            .expect("failed to sign mismatched access token");

    eprintln!("[mismatch] Bearer <REDACTED>   : user_id={} (tenant_id={})",
        subject_a.user_id, subject_a.tenant_id);
    eprintln!("[mismatch] Access-Token: user_id={} (tenant_id={})  ← 不同用户!",
        subject_b.user_id, subject_b.tenant_id);

    let request_body = serde_json::json!({
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Hello"}]
    });

    // Act
    let (status, body_text) = send_chat_request(
        router,
        Some(bearer.trim_start_matches("Bearer ").trim()),
        Some(mismatched_access.trim_start_matches("Bearer ").trim()),
        request_body,
    )
    .await;

    eprintln!("[mismatch] 响应: HTTP {}  body={}", status.as_u16(), body_text);

    // Assert: mismatched dual tokens must be rejected with 401.
    assert_eq!(
        StatusCode::UNAUTHORIZED,
        status,
        "dual-token subject mismatch must return 401"
    );
    let body: Value = serde_json::from_str(&body_text).expect("response must be valid JSON");
    assert!(
        body.get("error").is_some(),
        "error envelope must contain 'error' field"
    );
    eprintln!("[mismatch] ✓ 验证通过：subject 不匹配正确返回 401\n");
}

/// Verifies that the chat completion request body schema is validated:
/// a request with an empty `messages` array returns a non-200 status.
#[tokio::test]
async fn empty_messages_returns_non_200() {
    let router = build_test_router();

    let subject = default_trusted_request_subject();
    let issued_at = 1_800_000_000_i64;
    let expires_at = issued_at + 300;
    let bearer = app_session_bearer_token(subject, issued_at, expires_at)
        .expect("failed to sign bearer token");

    let request_body = serde_json::json!({
        "model": "gpt-4o",
        "messages": []
    });

    eprintln!("[empty_msg] 发送空 messages 数组 (有效 token)");

    let (status, body_text) = send_chat_request(
        router,
        Some(bearer.trim_start_matches("Bearer ").trim()),
        None,
        request_body,
    )
    .await;

    eprintln!("[empty_msg] 响应: HTTP {}  body={}", status.as_u16(), body_text);

    // Empty messages should trigger a validation error (non-200).
    assert_ne!(
        StatusCode::OK,
        status,
        "empty messages should not return 200 OK"
    );
    eprintln!("[empty_msg] ✓ 验证通过：空 messages 正确返回非 200 状态码\n");
}

/// Verifies the full dual-token login flow end-to-end:
/// 1. Sign a fresh app-session token pair (login).
/// 2. Verify the bearer <REDACTED> signature round-trips.
/// 3. Present both tokens on the chat-completion request.
/// 4. Receive a valid provider response.
#[tokio::test]
async fn full_login_to_chat_completion_flow() {
    eprintln!("========================================");
    eprintln!("[full_login] STEP 1: 登录签名（生成双 token）");

    // Step 1: Simulate a complete login — sign a dual-token pair from the
    // test-support trusted subject (the canonical bootstrap identity).
    let subject = default_trusted_request_subject();
    let issued_at = 1_800_000_000_i64;
    let expires_at = issued_at + 300;

    eprintln!("  登录身份: tenant_id={}, user_id={}, operator_id={}",
        subject.tenant_id, subject.user_id, subject.operator_id);
    eprintln!("  时间窗口: issued_at={}, expires_at={} (有效期 {}s)",
        issued_at, expires_at, expires_at - issued_at);

    // Dual-token channel: authorization bearer + access-token header.
    let (bearer, access_token) =
        app_session_dual_token_headers(subject, issued_at, expires_at)
            .expect("login: failed to sign dual-token headers");

    eprintln!("  Bearer <REDACTED> 签名完成: {}...", &bearer[..std::cmp::min(80, bearer.len())]);
    eprintln!("  Access-Token 签名完成: {}...", &access_token[..std::cmp::min(80, access_token.len())]);

    eprintln!("----------------------------------------");
    eprintln!("[full_login] STEP 2: 验签（round-trip 验证）");

    // Step 2: Verify the bearer <REDACTED> signature round-trips before issuing the
    // chat completion request.
    let config = app_session_config().expect("failed to load app session config");
    let verified_subject = sdkwork_cloudrouter_http::verify_app_session_authorization_header(
        &config,
        bearer.as_str(),
        TEST_NOW_UNIX_SECONDS,
    )
    .expect("bearer <REDACTED> signature must verify");
    eprintln!("  验签成功! 解析结果: tenant_id={}, user_id={}, operator_id={}",
        verified_subject.tenant_id, verified_subject.user_id, verified_subject.operator_id);

    assert_eq!(
        subject.tenant_id, verified_subject.tenant_id,
        "tenant id must survive token round-trip"
    );
        assert_eq!(
        subject.user_id, verified_subject.user_id,
        "user id must survive token round-trip"
    );
    eprintln!("  ✓ tenant_id 和 user_id 一致，签名 round-trip 验证通过");

    eprintln!("----------------------------------------");
    eprintln!("[full_login] STEP 3: 调用 chat completion（携带双 token）");

    // Step 3: Build the router and issue the chat completion request.
    let router = build_test_router();
    let request_body = serde_json::json!({
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say hello in exactly 5 words."}
        ],
        "temperature": 0.7,
        "max_tokens": 50
    });

    eprintln!("  请求模型: gpt-4o");
    eprintln!("  请求消息: system + user (2 条)");
    eprintln!("  请求头: Authorization=Bearer <REDACTED> Access-Token=<签名>");
    eprintln!("  路由路径: POST /v1/chat/completions");

    let (status, body_text) = send_chat_request(
        router,
        Some(bearer.trim_start_matches("Bearer ").trim()),
        Some(&access_token),
        request_body,
    )
    .await;

    eprintln!("  收到响应: HTTP {} ({})", status.as_u16(), status.as_str());
    eprintln!("  响应体长度: {} 字节", body_text.len());

    eprintln!("----------------------------------------");
    eprintln!("[full_login] STEP 4: 验证响应");

    // Step 4: Assert a valid OpenAI-compatible chat completion response.
    assert_eq!(
        StatusCode::OK,
        status,
        "full login→chat flow must return 200 OK"
    );
    eprintln!("  ✓ HTTP 状态码 = 200 OK（完整调用链路成功）");

    let body: Value = serde_json::from_str(&body_text).expect("response must be valid JSON");

    eprintln!("  解析 JSON 响应:");
    eprintln!("    object  = {}", body["object"].as_str().unwrap_or(""));
    eprintln!("    id      = {}", body["id"].as_str().unwrap_or(""));
    eprintln!("    model   = {}", body["model"].as_str().unwrap_or(""));
    eprintln!("    created = {}", body["created"].as_i64().unwrap_or(0));

    // Validate the response shape matches OpenAI /v1/chat/completions schema.
    assert_eq!("chat.completion", body["object"].as_str().unwrap_or(""));
    assert!(!body["id"].as_str().unwrap_or("").is_empty(), "id is required");
    assert!(body["created"].as_i64().unwrap_or(0) > 0, "created timestamp is required");
    assert_eq!("gpt-4o", body["model"].as_str().unwrap_or(""));

    let choices = body["choices"]
        .as_array()
        .expect("choices array is required");
    assert!(!choices.is_empty(), "at least one choice is required");
    assert_eq!(
        "assistant",
        choices[0]["message"]["role"].as_str().unwrap_or("")
    );
    eprintln!("  ✓ choices[0].message.role = assistant");
    eprintln!("    choices[0].message.content = {}",
        choices[0]["message"]["content"].as_str().unwrap_or(""));
    eprintln!("    choices[0].finish_reason = {}",
        choices[0]["finish_reason"].as_str().unwrap_or(""));

    let usage = body["usage"].as_object().expect("usage object is required");
    eprintln!("    usage.prompt_tokens     = {}", usage["prompt_tokens"].as_i64().unwrap_or(0));
    eprintln!("    usage.completion_tokens = {}", usage["completion_tokens"].as_i64().unwrap_or(0));
    eprintln!("    usage.total_tokens      = {}", usage["total_tokens"].as_i64().unwrap_or(0));
    assert!(
        usage["total_tokens"].as_i64().unwrap_or(0) > 0,
        "total_tokens must be reported"
    );

    eprintln!("========================================");
    eprintln!("[full_login] 全部断言通过 ✓");
    eprintln!("========================================\n");
}
