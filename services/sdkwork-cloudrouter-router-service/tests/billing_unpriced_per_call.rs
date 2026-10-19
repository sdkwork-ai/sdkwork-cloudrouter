//! 未定价的"按次"端点必须 **fail-closed**，不能静默免费。
//!
//! 这 10 个端点都真实产生上游动作，但 sdkwork-models 目录没有给它们
//! `api_request` 官方费率（目录里只有 `runway/gwm1_avatars` 有一条）：
//!
//! ```text
//! POST /v1/batches                       批量创建（结果回收链路未落地，守卫拒单）
//! POST /v1/threads/runs                  创建 run（异步 token 用量）
//! POST /v1/threads/{id}/runs
//! POST .../runs/{run_id}/submit_tool_outputs
//! POST /v1/tools/search                  DeepSeek web search（付费工具）
//! POST /v1/tools/fetch                   DeepSeek web fetch（付费工具）
//! POST /v1/vector_stores/{id}/files      文件摄取（存储成本）
//! POST /v1/vector_stores/{id}/file_batches
//! POST /v1/vector_stores/{id}/search     检索
//! POST /elevenlabs/v1/sound-generation  ✅ 已按目录 audio_output_minute 结算（2.41），不在此列
//! ```
//!
//! 本测试是"禁止过度免费"的反向锁：任何把这些端点误判成 Free 的改动都会红。
//! 同时也确认失败原因可诊断（Pricing / api_request），而不是静默成功。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    OpenAiResourceClassifier, PricingPreflightInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    DecimalValue, GatewayApiKey, Money, PriceSide, PricingPlan, ProviderAuthProfile,
    UpstreamAccountGroup,
};
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

/// 有 api key / 计划 / 账号组，但**没有任何 api_request 费率**：让失败发生在
/// 价格解析，而不是鉴权层。
fn catalog_without_per_request_rates() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.000000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new_scoped(
        10,
        10,
        20,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog
        .add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test").with_owner(10, 20, 30));
    catalog
}

async fn openai_invocation(method: Method, path: &str, body: Value) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(method.clone(), path))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("req-unpriced-per-call")
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
        base_url: Some("https://api.openai.example".to_owned()),
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

#[tokio::test]
async fn unpriced_per_call_operations_are_refused_not_free() {
    for (method, path, body) in [
        (
            Method::POST,
            "/v1/threads/runs",
            json!({"assistant_id": "asst-1"}),
        ),
        (
            Method::POST,
            "/v1/threads/thread-1/runs",
            json!({"assistant_id": "asst-1"}),
        ),
        (
            Method::POST,
            "/v1/threads/thread-1/runs/run-1/submit_tool_outputs",
            json!({"tool_outputs": []}),
        ),
        (
            Method::POST,
            "/v1/tools/search",
            json!({"query": "cloud router"}),
        ),
        (
            Method::POST,
            "/v1/tools/fetch",
            json!({"url": "https://example.com"}),
        ),
        (
            Method::POST,
            "/v1/vector_stores/vs-1/files",
            json!({"file_id": "file-1"}),
        ),
        (
            Method::POST,
            "/v1/vector_stores/vs-1/file_batches",
            json!({"file_ids": ["file-1"]}),
        ),
    ] {
        let label = format!("{method} {path}");
        let mut invocation = openai_invocation(method.clone(), path, body).await;
        assert_eq!(
            BillingMode::ApiRequest,
            invocation.billing.mode,
            "{label} must stay per-call, not become free"
        );
        let error = PricingPreflightInterceptor::new(Arc::new(catalog_without_per_request_rates()))
            .before(&mut invocation)
            .await
            .expect_err("an unpriced per-call operation must not be dispatched");
        assert_eq!(
            sdkwork_cloudrouter_router_service::application::InvocationErrorKind::Pricing,
            error.kind,
            "{label} must fail as a pricing gap: {error:?}"
        );
        assert!(
            error.message.contains("api_request") || error.message.contains("pricing"),
            "{label} failure must be diagnosable: {error:?}"
        );
    }
}

/// 批量创建由预检守卫拒单（不是价格缺口），也不能被误判成 Free。
#[tokio::test]
async fn unpriced_batch_submission_is_guarded_not_free() {
    let mut invocation = openai_invocation(
        Method::POST,
        "/v1/batches",
        json!({"input_file_id": "file-1"}),
    )
    .await;
    assert_eq!(BillingMode::ApiRequest, invocation.billing.mode);
    let error = PricingPreflightInterceptor::new(Arc::new(catalog_without_per_request_rates()))
        .before(&mut invocation)
        .await
        .expect_err("batch submission must stay refused");
    assert!(
        error.message.contains("does not reconcile"),
        "the batch guard must explain the missing reconciliation: {error:?}"
    );
}
