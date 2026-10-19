//! 异步任务轮询面的计费口径。
//!
//! Kling / Vidu / 火山 / Suno / Gemini 的任务查询只是**读状态**：上游不按次
//! 收费，目录也没有 `api_request` 费率。此前它们按 `api_request` 报价 ⇒ 预检
//! `PriceNotFound` ⇒ 所有已生成结果的轮询 500，客户拿不到视频/音乐/图片（而
//! 生成面已经按秒/按条计过费）。轮询与读取必须 Free。
//!
//! `POST /v1/responses/input_tokens` 同理：它是免费的 token 计数工具，不产生
//! 推理。生成面（`POST .../generations`）仍按各自计量单位计费，不能被这里误放行。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    OpenAiResourceClassifier, PricingPreflightInterceptor, ProviderNativeResourceClassifier,
};
use sdkwork_cloudrouter_router_service::domain::ProviderAuthProfile;
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

async fn invocation(
    method: Method,
    path: &str,
    supplier: &str,
    body: serde_json::Value,
) -> Invocation {
    if path.starts_with("/v1/") {
        let classification = OpenAiResourceClassifier
            .classify(&InvocationClassificationRequest::new(method.clone(), path))
            .expect("openai classification");
        let (resource, billing, routing) = classification.into_parts();
        return finish(method, path, "openai", body, resource, billing, routing).await;
    }
    let rest = path
        .trim_start_matches('/')
        .split_once('/')
        .map(|(_, tail)| format!("/{tail}"))
        .expect("vendor-prefixed path");
    let classification = ProviderNativeResourceClassifier
        .classify(
            &InvocationClassificationRequest::new(method.clone(), rest)
                .with_supplier_code(supplier),
        )
        .expect("provider native classification");
    let (resource, billing, routing) = classification.into_parts();
    finish(method, path, supplier, body, resource, billing, routing).await
}

async fn finish(
    method: Method,
    path: &str,
    supplier: &str,
    body: serde_json::Value,
    resource: sdkwork_cloudrouter_router_service::application::InvocationResource,
    billing: sdkwork_cloudrouter_router_service::application::InvocationBilling,
    routing: sdkwork_cloudrouter_router_service::application::InvocationRouting,
) -> Invocation {
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("req-async-task-query")
            .with_body(InvocationBody::json(body)),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: supplier.to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://vendor.example".to_owned()),
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

const QUERIES: &[(Method, &str, &str)] = &[
    (Method::GET, "/kling/v1/tasks/task-1", "kling"),
    (Method::GET, "/kling/v1/videos/generations/task-1", "kling"),
    (Method::GET, "/vidu/ent/v2/tasks/task-1/creations", "vidu"),
    (
        Method::GET,
        "/volcengine/api/v3/contents/generations/tasks/task-1",
        "volcengine",
    ),
    (Method::GET, "/suno/v1/music/generations/task-1", "suno"),
    (
        Method::GET,
        "/google/v1beta/models/veo-3/operations/op-1",
        "google",
    ),
    (Method::POST, "/v1/responses/input_tokens", "openai"),
];

#[tokio::test]
async fn async_task_queries_are_free_and_survive_preflight() {
    for (method, path, supplier) in QUERIES {
        let label = format!("{method} {path}");
        let mut invocation = invocation(method.clone(), path, supplier, json!({})).await;
        assert_eq!(
            BillingMode::Free,
            invocation.billing.mode,
            "{label} must be a free status read"
        );
        PricingPreflightInterceptor::new(Arc::new(InMemoryPricingCatalog::default()))
            .before(&mut invocation)
            .await
            .unwrap_or_else(|error| panic!("{label} must pass preflight: {error:?}"));
    }
}

/// 生成面不能被轮询规则误放行。
#[tokio::test]
async fn generation_entrypoints_stay_priced() {
    for (method, path, supplier, body) in [
        (
            Method::POST,
            "/kling/v1/videos/generations",
            "kling",
            json!({"model_name": "kling-v2-1", "prompt": "a cat"}),
        ),
        (
            Method::POST,
            "/suno/v1/music/generations",
            "suno",
            json!({"prompt": "a song"}),
        ),
        (
            Method::POST,
            "/volcengine/api/v3/contents/generations/tasks",
            "volcengine",
            json!({"model": "doubao-seedance-1-0-pro", "content": []}),
        ),
        (
            Method::POST,
            "/v1/tools/search",
            "openai",
            json!({"query": "hi"}),
        ),
    ] {
        let invocation = invocation(method.clone(), path, supplier, body).await;
        assert_ne!(
            BillingMode::Free,
            invocation.billing.mode,
            "{method} {path} is a generation/tool call, not a status read"
        );
    }
}
