//! OpenAI 兼容面的管理 / CRUD 端点计费口径。
//!
//! 文件、批量查询/取消、assistants、threads（不含 runs）、conversations、
//! containers、vector stores（不含摄取/检索）、uploads、voices、实时控制、
//! stored completions、responses 轮询——上游都不按次收费，目录也没有
//! `api_request` 费率。此前它们走 `api_request` 策略，预检直接
//! `PriceNotFound`，整类端点不可用（500）。
//!
//! 本测试钉住两件事：
//!
//! 1. 管理面是 **Free**：不预扣、不结算、空目录也能过预检；
//! 2. 会产生上游模型计算 / 存储计费的子端点**不能被误放行**（threads runs、
//!    responses compact、vector store file_batches/search/files、container
//!    files、`POST /v1/videos` 生成）。

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
use serde_json::json;
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

/// 空价目表，但带上 api key / 计费计划 / 账号组：让预检走到价格解析而不是
/// 在鉴权层失败。
fn empty_catalog() -> InMemoryPricingCatalog {
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

async fn openai_invocation(method: Method, path: &str, body: serde_json::Value) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(method.clone(), path))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("req-openai-management")
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

const FREE_OPERATIONS: &[(Method, &str)] = &[
    (Method::GET, "/v1/files"),
    (Method::POST, "/v1/files"),
    (Method::GET, "/v1/files/file-1"),
    (Method::GET, "/v1/files/file-1/content"),
    (Method::DELETE, "/v1/files/file-1"),
    (Method::GET, "/v1/batches"),
    (Method::GET, "/v1/batches/batch-1"),
    (Method::POST, "/v1/batches/batch-1/cancel"),
    (Method::POST, "/v1/moderations"),
    (Method::GET, "/v1/assistants"),
    (Method::POST, "/v1/assistants"),
    (Method::GET, "/v1/threads/thread-1"),
    (Method::POST, "/v1/threads/thread-1/messages"),
    (Method::GET, "/v1/threads/thread-1/runs"),
    (Method::GET, "/v1/threads/thread-1/runs/run-1/steps"),
    (Method::POST, "/v1/threads/thread-1/runs/run-1/cancel"),
    // 只更新 run 元数据，不产生新的模型计算。
    (Method::POST, "/v1/threads/thread-1/runs/run-1"),
    (Method::GET, "/v1/conversations"),
    (Method::POST, "/v1/conversations/conv-1/items"),
    (Method::GET, "/v1/containers"),
    (Method::POST, "/v1/containers"),
    (Method::GET, "/v1/containers/container-1/files"),
    // 容器文件上传是管理面；容器按会话计费。
    (Method::POST, "/v1/containers/container-1/files"),
    (Method::GET, "/v1/vector_stores"),
    (Method::POST, "/v1/vector_stores"),
    (Method::GET, "/v1/vector_stores/vs-1/files"),
    // 单文件属性更新不触发摄取/存储。
    (Method::POST, "/v1/vector_stores/vs-1/files/file-1"),
    (Method::GET, "/v1/vector_stores/vs-1/file_batches/batch-1"),
    (Method::POST, "/v1/uploads"),
    (Method::POST, "/v1/uploads/upload-1/parts"),
    (Method::GET, "/v1/audio/voices"),
    (Method::GET, "/v1/audio/voice_consents"),
    (Method::POST, "/v1/realtime/client_secrets"),
    (Method::POST, "/v1/realtime/calls/call-1/accept"),
    (Method::GET, "/v1/chat/completions"),
    (Method::GET, "/v1/chat/completions/completion-1"),
    (Method::GET, "/v1/responses/response-1"),
    (Method::DELETE, "/v1/responses/response-1"),
    (Method::POST, "/v1/responses/response-1/cancel"),
    (Method::GET, "/v1/responses/response-1/input_items"),
    (Method::GET, "/v1/videos"),
    (Method::GET, "/v1/videos/video-1"),
    // Sora 角色是素材对象，创建不产生视频渲染成本。
    (Method::POST, "/v1/videos/characters"),
];

#[tokio::test]
async fn management_endpoints_are_free() {
    for (method, path) in FREE_OPERATIONS {
        let invocation = openai_invocation(method.clone(), path, json!({})).await;
        assert_eq!(
            BillingMode::Free,
            invocation.billing.mode,
            "{method} {path} must not require a per-request price"
        );
        assert!(!invocation.billing.pricing_required, "{method} {path}");
        assert!(!invocation.billing.settlement_required, "{method} {path}");
    }
}

/// Free 的意义：空目录也能过预检（旧行为是 `PriceNotFound`）。
#[tokio::test]
async fn management_survives_preflight_without_a_catalog() {
    for (method, path) in [
        (Method::GET, "/v1/files"),
        (Method::POST, "/v1/moderations"),
        (Method::GET, "/v1/assistants"),
    ] {
        let mut invocation = openai_invocation(method, path, json!({"input": "hi"})).await;
        PricingPreflightInterceptor::new(Arc::new(empty_catalog()))
            .before(&mut invocation)
            .await
            .unwrap_or_else(|error| panic!("{path} must be free: {error:?}"));
    }
}

/// 会产生上游计算 / 存储的子端点不能被管理面规则放行。
#[tokio::test]
async fn compute_subresources_stay_priced() {
    for (method, path, body) in [
        (
            Method::POST,
            "/v1/threads/thread-1/runs",
            json!({"assistant_id": "asst-1"}),
        ),
        (
            Method::POST,
            "/v1/threads/runs",
            json!({"assistant_id": "asst-1"}),
        ),
        (
            Method::POST,
            "/v1/threads/thread-1/runs/run-1/submit_tool_outputs",
            json!({}),
        ),
        (
            Method::POST,
            "/v1/responses/compact",
            json!({"model": "gpt-5"}),
        ),
        (
            Method::POST,
            "/v1/vector_stores/vs-1/file_batches",
            json!({"file_ids": ["file-1"]}),
        ),
        (
            Method::POST,
            "/v1/vector_stores/vs-1/search",
            json!({"query": "hi"}),
        ),
        (
            Method::POST,
            "/v1/vector_stores/vs-1/files",
            json!({"file_id": "file-1"}),
        ),
        (
            Method::POST,
            "/v1/videos",
            json!({"model": "sora-2", "prompt": "a cat"}),
        ),
        (
            Method::POST,
            "/v1/batches",
            json!({"input_file_id": "file-1"}),
        ),
    ] {
        let invocation = openai_invocation(method.clone(), path, body).await;
        assert_ne!(
            BillingMode::Free,
            invocation.billing.mode,
            "{method} {path} must stay priced or refused, not silently free"
        );
    }
}
