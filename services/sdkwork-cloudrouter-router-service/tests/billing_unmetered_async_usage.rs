//! `background: true` 的 Responses 在用量回填落地前必须在预检拒单。
//!
//! OpenAI 的后台响应先回一个 `queued`/`in_progress` 的对象，**没有 `usage`**；
//! 真正的 token 用量要等任务完成后，由 `GET /v1/responses/{id}` 返回。而网关把
//! 这次 GET 当管理请求按 `api_request` 收：
//!
//! ```text
//! POST /v1/responses {"background": true, ...}  ⇒ 立即返回 queued（无 usage）
//! 上游继续跑模型                                  ⇒ 平台承担 token 成本
//! GET /v1/responses/{id}                         ⇒ 只收 1 次 api_request
//! 完成后的响应里虽有 usage，但没有 token 计费入口
//! ```
//!
//! 一次 `background` 的 deep research 可能消耗数美元 token，管理请求费远远
//! 覆盖不了。与批量（2.23）同源：用量不经过被计费的响应，就必须拒单，直到
//! "异步响应完成时按 `usage` 回填结算"落地。
//!
//! 只挡创建动作的布尔真值：同步 Responses、`background: false`、轮询 GET、
//! 取消 POST 都不产生"完成时才出现"的模型用量，必须继续放行。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationError, InvocationErrorKind, InvocationInterceptor, InvocationRequest,
    InvocationResourceClassifier, InvocationSubject, OpenAiResourceClassifier,
    PricingPreflightInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::ProviderAuthProfile;
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::{json, Value};
use std::sync::Arc;

fn subject() -> InvocationSubject {
    InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
        tenant_id: 10,
        organization_id: 20,
        user_id: 30,
        api_key_id: 100,
        api_key_name_snapshot: "Test key".to_owned(),
        group_id: 10,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
    })
}

async fn invocation(method: Method, path: &str, body: Value) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(method.clone(), path))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("req-unmetered-async")
            .with_body(InvocationBody::json(body)),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: "openai".to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://api.openai.com".to_owned()),
        secret_ref: None,
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: None,
        billing_mode: AccountBillingMode::Prepay,
        account_group_id: Some(10),
        account_group_code: Some("standard-group".to_owned()),
        pricing_plan_code: Some("standard".to_owned()),
    });
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
}

/// 空目录足以区分"守卫拒单"与"正常计价失败"：守卫在价格解析之前执行。
async fn preflight_error(method: Method, path: &str, body: Value) -> InvocationError {
    let mut invocation = invocation(method, path, body).await;
    let catalog = Arc::new(InMemoryPricingCatalog::default());
    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect_err("preflight must fail without a catalog")
}

/// 轮询 / 取消 / moderation 属于管理面（Free），空目录也必须通过预检。
async fn preflight_free(method: Method, path: &str, body: Value) {
    let label = format!("{method} {path}");
    let mut invocation = invocation(method, path, body).await;
    assert_eq!(
        BillingMode::Free,
        invocation.billing.mode,
        "{label} must be free management"
    );
    let catalog = Arc::new(InMemoryPricingCatalog::default());
    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .unwrap_or_else(|error| panic!("{label} must pass preflight: {error:?}"));
}

const ASYNC_REFUSAL: &str = "async response usage reconciliation";

fn assert_async_refusal(error: InvocationError) {
    assert_eq!(
        InvocationErrorKind::Pricing,
        error.kind,
        "the refusal must be a pricing failure: {error:?}"
    );
    assert!(
        error.message.contains(ASYNC_REFUSAL),
        "the refusal must explain the missing usage reconciliation: {}",
        error.message
    );
    assert!(
        error.message.contains("background"),
        "the refusal must name the background flag: {}",
        error.message
    );
}

/// 后台 Responses 创建：拒单。
#[tokio::test]
async fn background_response_creation_is_refused() {
    let error = preflight_error(
        Method::POST,
        "/v1/responses",
        json!({"model": "gpt-5", "input": "research this", "background": true}),
    )
    .await;
    assert_async_refusal(error);
}

/// 对照：显式 `background: false` 是同步响应，必须继续放行。
#[tokio::test]
async fn synchronous_response_with_background_false_is_not_refused() {
    let error = preflight_error(
        Method::POST,
        "/v1/responses",
        json!({"model": "gpt-5", "input": "hi", "background": false}),
    )
    .await;
    assert!(
        !error.message.contains(ASYNC_REFUSAL),
        "background:false is a synchronous response and must not be refused: {}",
        error.message
    );
}

/// 对照：不带 `background` 的普通 Responses 必须继续放行。
#[tokio::test]
async fn synchronous_response_without_the_flag_is_not_refused() {
    let error = preflight_error(
        Method::POST,
        "/v1/responses",
        json!({"model": "gpt-5", "input": "hi"}),
    )
    .await;
    assert!(
        !error.message.contains(ASYNC_REFUSAL),
        "a synchronous response must not be refused: {}",
        error.message
    );
}

/// 对照：轮询 GET 不产生新的模型用量，且属于管理面 ⇒ Free。
#[tokio::test]
async fn background_response_polling_is_not_refused() {
    preflight_free(Method::GET, "/v1/responses/resp_1", json!({})).await;
}

/// 对照：取消 POST 的路径不是创建面，守卫不得误伤；取消本身免费。
#[tokio::test]
async fn background_response_cancel_is_not_refused() {
    preflight_free(
        Method::POST,
        "/v1/responses/resp_1/cancel",
        json!({"background": true}),
    )
    .await;
}

/// 对照：moderation 是上游免费端点，不得被后台守卫误伤，也不按次收。
#[tokio::test]
async fn a_plain_api_request_route_is_not_refused_as_background() {
    preflight_free(
        Method::POST,
        "/v1/moderations",
        json!({"input": "hello", "background": true}),
    )
    .await;
}
