//! 厂商原生**管理面 / 免费工具**端点的计费口径。
//!
//! 这些端点上游不按量计费（文件上传/读取、缓存管理、批量查询/取消、
//! `count_tokens`），目录也没有 `api_request` 费率。此前它们被归到
//! `ExternalUsageLine`：
//!
//! ```text
//! 预检：目录里模型有 token 价 ⇒ 通过
//! 抽取：没有任何用量行
//! 结算：没有可结算金额 ⇒ 500
//! ```
//!
//! 上游已经执行完成，客户却收到 500，预扣还被保留。正确口径是 **Free**：
//! 不预扣、不结算、不需要目录价格。批量**创建**是唯一例外——结果回收链路
//! 未落地，必须继续由预检守卫拒单，不能被这里的 Free 规则放行。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
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
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("req-unmetered-management")
            .with_body(InvocationBody::json(json!({"input": "hello"}))),
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

const FREE_OPERATIONS: &[(Method, &str, &str)] = &[
    (Method::GET, "/anthropic/v1/files", "anthropic"),
    (Method::POST, "/anthropic/v1/files", "anthropic"),
    (Method::GET, "/anthropic/v1/files/file-1", "anthropic"),
    (
        Method::GET,
        "/anthropic/v1/files/file-1/content",
        "anthropic",
    ),
    (Method::DELETE, "/anthropic/v1/files/file-1", "anthropic"),
    (Method::GET, "/anthropic/v1/messages/batches", "anthropic"),
    (
        Method::GET,
        "/anthropic/v1/messages/batches/batch-1",
        "anthropic",
    ),
    (
        Method::POST,
        "/anthropic/v1/messages/batches/batch-1/cancel",
        "anthropic",
    ),
    (
        Method::POST,
        "/anthropic/v1/messages/count_tokens",
        "anthropic",
    ),
    (Method::GET, "/google/v1beta/cachedContents", "google"),
    (Method::POST, "/google/v1beta/cachedContents", "google"),
    (
        Method::GET,
        "/google/v1beta/cachedContents/cache-1",
        "google",
    ),
    (
        Method::DELETE,
        "/google/v1beta/cachedContents/cache-1",
        "google",
    ),
    (Method::GET, "/google/v1beta/files", "google"),
    (Method::POST, "/google/v1beta/files", "google"),
    (Method::GET, "/google/v1beta/files/file-1", "google"),
    (Method::DELETE, "/google/v1beta/files/file-1", "google"),
    (
        Method::POST,
        "/google/v1beta/models/gemini-2.5-flash:countTokens",
        "google",
    ),
];

#[tokio::test]
async fn management_and_free_tool_endpoints_are_free() {
    for (method, path, supplier) in FREE_OPERATIONS {
        let invocation = invocation(method.clone(), *path, *supplier).await;
        assert_eq!(
            BillingMode::Free,
            invocation.billing.mode,
            "{method} {path} must not require a price"
        );
        assert!(!invocation.billing.pricing_required, "{method} {path}");
        assert!(!invocation.billing.settlement_required, "{method} {path}");
        assert_eq!(None, invocation.billing.meter, "{method} {path}");
    }
}

/// Free 的意义：**空目录也能过预检**。旧行为在空目录下报 PriceNotFound，
/// 在有目录时走到结算再报 500，两种都是不可用。
#[tokio::test]
async fn free_management_survives_preflight_without_a_catalog() {
    let mut invocation = invocation(Method::GET, "/anthropic/v1/files", "anthropic").await;
    PricingPreflightInterceptor::new(Arc::new(InMemoryPricingCatalog::default()))
        .before(&mut invocation)
        .await
        .expect("a free endpoint must not require catalog pricing");
}

/// 对照：批量创建仍然非 Free，且预检守卫继续拒单。
#[tokio::test]
async fn batch_creation_is_still_guarded() {
    let mut invocation =
        invocation(Method::POST, "/anthropic/v1/messages/batches", "anthropic").await;
    assert_ne!(BillingMode::Free, invocation.billing.mode);
    let error = PricingPreflightInterceptor::new(Arc::new(InMemoryPricingCatalog::default()))
        .before(&mut invocation)
        .await
        .expect_err("batch creation must stay refused until results are reconciled");
    assert!(
        error.message.contains("does not reconcile"),
        "the refusal must explain the missing reconciliation: {error:?}"
    );
}

/// 对照：付费生成端点不能被管理面规则误放行。
#[tokio::test]
async fn paid_generation_endpoints_are_not_free() {
    for (method, path, supplier) in [
        (Method::POST, "/suno/v1/music/generations", "suno"),
        (Method::POST, "/kling/v1/videos/generations", "kling"),
        (
            Method::POST,
            "/google/v1beta/models/gemini-2.5-flash:batchEmbedContents",
            "google",
        ),
    ] {
        let invocation = invocation(method.clone(), path, supplier).await;
        assert_ne!(
            BillingMode::Free,
            invocation.billing.mode,
            "{method} {path} must stay priced (or refused), not silently free"
        );
    }
}
