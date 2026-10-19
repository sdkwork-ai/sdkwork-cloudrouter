//! 音乐生成的时长兜底：**当前行为是 1 秒**，但它是一个待确认的定价语义。
//!
//! Suno 的请求契约把 `duration` 声明为**可选**，响应只有 task id；任务查询面
//! 已归 Free，不会在完成时回填时长。因此"不声明时长"的请求只能走兜底：
//!
//! ```text
//! music_output_second，单价 $0.02/秒
//! 不声明 duration ⇒ 1 秒 ⇒ $0.02/首
//! ```
//!
//! 目录把 Suno 标成 $0.02/**秒**（≈ $1.20/分钟），这与行业"按首/按分钟"的
//! 量级明显不一致。若直接把兜底改成 60 秒，会从 $0.02 跳到 $1.20/首（60×
//! 多收）；若维持 1 秒，则长曲子少收两个数量级。**在 sdkwork-models 确认
//! `music_output_second` 的真实语义之前，不能猜**。
//!
//! 本测试把当前行为钉成显式证据：
//!
//! * 不声明时长 ⇒ 恰好 1 秒（保守下限，避免多收）；
//! * 声明 180 秒 ⇒ 按 180 秒结算（客户/产品可用声明值覆盖兜底）。
//!
//! 任何修改兜底值的改动都会让这条测试红，迫使改动者先回答"$0.02 是每秒
//! 还是每首"。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationDispatch, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, PricingFinalizationInterceptor, PricingPreflightInterceptor,
    PricingSettlementInterceptor, ProviderNativeResourceClassifier, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelVendor,
    ModelVendorDefinition, Money, PriceSide, PricingPlan, ProviderAuthProfile,
    UpstreamAccountGroup,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::{json, Value};
use std::sync::Arc;

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const API_KEY_ID: i64 = 100;
const ACCOUNT_GROUP_ID: i64 = 10;
const VENDOR: &str = "suno";
const MODEL: &str = "suno-v5";
const CATALOG_KEY: &str = "suno/suno-v5";

fn subject() -> InvocationSubject {
    InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
        tenant_id: TENANT_ID,
        organization_id: ORGANIZATION_ID,
        user_id: 30,
        api_key_id: API_KEY_ID,
        api_key_name_snapshot: "Test key".to_owned(),
        group_id: ACCOUNT_GROUP_ID,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
    })
}

fn catalog() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        VENDOR,
        ModelVendor::Suno,
        VENDOR,
    ));
    catalog
        .add_model(AiModel::new(MODEL, MODEL, VENDOR, vec!["music"]).with_catalog_key(CATALOG_KEY));
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.000000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new_scoped(
        ACCOUNT_GROUP_ID,
        TENANT_ID,
        ORGANIZATION_ID,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog.add_api_key(
        GatewayApiKey::new(API_KEY_ID, ACCOUNT_GROUP_ID, "sk-test", "hash:sk-test").with_owner(
            TENANT_ID,
            ORGANIZATION_ID,
            30,
        ),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        CATALOG_KEY,
        MODEL,
        PriceSide::OfficialReference,
        BillingMeter::MusicOutputSecond,
        Money::usd("0.020000").unwrap(),
    ));
    catalog
}

async fn music_invocation(body: Value) -> Invocation {
    let classification = ProviderNativeResourceClassifier
        .classify(
            &InvocationClassificationRequest::new(Method::POST, "/v1/music/generations")
                .with_supplier_code(VENDOR),
        )
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/suno/v1/music/generations")
            .with_request_id("req-suno-duration")
            .with_body(InvocationBody::json(body)),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: VENDOR.to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://api.suno.example".to_owned()),
        secret_ref: None,
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: None,
        billing_mode: AccountBillingMode::Prepay,
        account_group_id: Some(ACCOUNT_GROUP_ID),
        account_group_code: Some("standard-group".to_owned()),
        pricing_plan_code: Some("standard".to_owned()),
    });
    invocation.resource.requested_model = Some(MODEL.to_owned());
    invocation.resource.requested_model_catalog_key = Some(CATALOG_KEY.to_owned());
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
}

async fn settle(body: Value) -> (String, String) {
    let catalog = Arc::new(catalog());
    let mut invocation = music_invocation(body).await;
    assert_eq!(BillingMode::AudioSecond, invocation.billing.mode);
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("preflight");
    invocation.dispatch =
        InvocationDispatch::json_response(200, json!({"task_id": "task-1", "status": "queued"}));
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");
    PricingFinalizationInterceptor::new(Arc::clone(&catalog))
        .after(&mut invocation)
        .await
        .expect("final pricing");
    PricingSettlementInterceptor
        .after(&mut invocation)
        .await
        .expect("settlement");
    let command = invocation
        .usage
        .settlement_commands
        .first()
        .expect("one settlement command");
    (
        command.billable_quantity.clone(),
        command.customer_charge_amount.clone(),
    )
}

/// 不声明时长：当前按 1 秒（$0.02）兜底。这是**保守下限**，不是对
/// `music_output_second` 语义的确认——见文件头。
#[tokio::test]
async fn music_without_a_declared_duration_falls_back_to_one_second() {
    let (quantity, amount) = settle(json!({"prompt": "a calm piano piece"})).await;
    assert_eq!("1.000000000000", quantity);
    assert_eq!("0.020000000000", amount);
}

/// 客户声明 180 秒：按声明值结算（$0.02 × 180 = $3.60），不受兜底影响。
#[tokio::test]
async fn a_declared_duration_overrides_the_fallback() {
    let (quantity, amount) = settle(json!({"prompt": "a calm piano piece", "duration": 180})).await;
    assert_eq!("180.000000000000", quantity);
    assert_eq!("3.600000000000", amount);
}
