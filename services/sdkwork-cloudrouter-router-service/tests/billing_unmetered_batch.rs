//! 批量**提交**在结果回收链路落地前必须在预检拒单。
//!
//! `/v1/batches` 与 `/anthropic/v1/messages/batches` 是透传：批量任务在上游异步
//! 执行，逐请求的 `usage` 只出现在输出文件（OpenAI 的
//! `output_file_id` → `GET /v1/files/{id}/content` 的 JSONL；Anthropic 的
//! `results_url`）里，而网关没有任何代码读取这些结果集。运行时只按
//! `api_request` 收一次管理请求费：
//!
//! ```text
//! 一个 10,000 条的 batch ⇒ 网关收 1 次 api_request
//!                         ⇒ 上游 token 成本全部由平台承担
//! ```
//!
//! OpenAI 的 batch 价还是标准价的 50%，即便以后补了结果回收，也还需要一个
//! 批价折扣维度。在两者都就绪之前，**放行提交 = 免费送整批算力**，因此与
//! `billing_unmeterable_tts` 同一处置原则：预检拒单。
//!
//! 只挡"创建"动作：轮询（GET）与取消（POST `/cancel`）不产生新的上游 token
//! 成本，必须继续放行——否则客户连已提交任务的善后都做不了。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationError, InvocationErrorKind, InvocationInterceptor, InvocationRequest,
    InvocationResourceClassifier, InvocationSubject, OpenAiResourceClassifier,
    PricingPreflightInterceptor, ProviderNativeResourceClassifier,
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

async fn invocation(method: Method, path: &str, supplier: &str) -> Invocation {
    let classification = if path.starts_with("/v1/") {
        OpenAiResourceClassifier
            .classify(&InvocationClassificationRequest::new(method.clone(), path))
    } else {
        let rest = path
            .trim_start_matches('/')
            .split_once('/')
            .map(|(_, tail)| format!("/{tail}"))
            .expect("vendor-prefixed path");
        ProviderNativeResourceClassifier.classify(
            &InvocationClassificationRequest::new(method.clone(), rest)
                .with_supplier_code(supplier),
        )
    }
    .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("req-unmetered-batch")
            .with_body(InvocationBody::json(json!({"input_file_id": "file-1"}))),
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

/// 空目录足以区分"守卫拒单"与"正常计价失败"：守卫在价格解析之前执行。
async fn preflight_error(method: Method, path: &str, supplier: &str) -> InvocationError {
    let mut invocation = invocation(method, path, supplier).await;
    let catalog = Arc::new(InMemoryPricingCatalog::default());
    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect_err("preflight must fail without a catalog")
}

/// 轮询 / 取消 / moderation 属于管理面（Free），空目录也必须通过预检。
async fn preflight_free(method: Method, path: &str, supplier: &str) {
    let label = format!("{method} {path}");
    let mut invocation = invocation(method, path, supplier).await;
    assert_eq!(
        BillingMode::Free,
        invocation.billing.mode,
        "{label} must be free management"
    );
    PricingPreflightInterceptor::new(Arc::new(InMemoryPricingCatalog::default()))
        .before(&mut invocation)
        .await
        .unwrap_or_else(|error| panic!("{label} must pass preflight: {error:?}"));
}

const BATCH_REFUSAL: &str = "does not reconcile";

fn assert_batch_refusal(error: InvocationError, api_code: &str) {
    assert_eq!(
        InvocationErrorKind::BillingUnavailable,
        error.kind,
        "batch refusal must be a billing-unavailable failure: {error:?}"
    );
    assert!(
        error.message.contains(BATCH_REFUSAL),
        "the refusal must explain the missing reconciliation: {}",
        error.message
    );
    assert!(
        error.message.contains(api_code),
        "the refusal must name the api code {api_code}: {}",
        error.message
    );
}

/// OpenAI 批量创建：拒单。
#[tokio::test]
async fn openai_batch_submission_is_refused() {
    let error = preflight_error(Method::POST, "/v1/batches", "openai").await;
    assert_batch_refusal(error, "openai.batches");
}

/// Anthropic Message Batches 创建：同样拒单（结果走 `results_url`，网关不回收）。
#[tokio::test]
async fn anthropic_batch_submission_is_refused() {
    let error = preflight_error(Method::POST, "/anthropic/v1/messages/batches", "anthropic").await;
    assert_batch_refusal(error, "anthropic.batches");
}

/// 对照：批量**轮询**不产生新成本，且属于管理面 ⇒ Free。
#[tokio::test]
async fn batch_status_polling_is_not_refused_by_the_guard() {
    preflight_free(Method::GET, "/v1/batches", "openai").await;
}

/// 对照：取消已提交任务不产生新成本，且属于管理面 ⇒ Free。
#[tokio::test]
async fn batch_cancel_is_not_refused_by_the_guard() {
    preflight_free(Method::POST, "/v1/batches/batch_123/cancel", "openai").await;
}

/// 守卫只认创建动作；moderation 是上游免费端点，也不按次收。
#[tokio::test]
async fn a_plain_api_request_route_is_not_refused_as_a_batch() {
    preflight_free(Method::POST, "/v1/moderations", "openai").await;
}
