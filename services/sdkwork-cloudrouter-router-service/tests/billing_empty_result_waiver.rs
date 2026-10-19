//! 上游 2xx 但零产出：不能按 1 张/条收。
//!
//! 图像/视频生成可能以 2xx 返回 `{"data": []}`（内容过滤、空候选、任务未
//! 创建），也可能显式 `result_count: 0`。抽取层此前用 `.max(1)` 把 0 抬成 1，
//! 于是"没有产出"也收一张的钱。正确口径是 **waive**：不产用量行、置
//! `charging.waived`，由结算层释放预扣并成功返回。
//!
//! 对照：字段缺失（异步任务回执只有 task id）仍按 1 条任务计费。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationDispatch, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, OpenAiResourceClassifier, PricingPreflightInterceptor,
    UsageExtractionInterceptor,
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
const MODEL: &str = "gpt-image-2";
const CATALOG_KEY: &str = "openai/gpt-image-2";

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
        "openai",
        ModelVendor::OpenAi,
        "openai",
    ));
    catalog.add_model(
        AiModel::new(MODEL, MODEL, "openai", vec!["image"]).with_catalog_key(CATALOG_KEY),
    );
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
        BillingMeter::ImageResult,
        Money::usd("0.040000").unwrap(),
    ));
    catalog
}

async fn invocation(body: Value) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(
            Method::POST,
            "/v1/images/generations",
        ))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/images/generations")
            .with_request_id("req-empty-results")
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
    assert_eq!(BillingMode::ResultCount, invocation.billing.mode);
    invocation
}

async fn extract(body: Value, response: Value) -> Invocation {
    let catalog = Arc::new(catalog());
    let mut invocation = invocation(body).await;
    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("preflight");
    invocation.dispatch = InvocationDispatch::json_response(200, response);
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");
    invocation
}

/// 空数组：无产出 ⇒ waive、不产行（不按请求里的 `n` 收）。
#[tokio::test]
async fn an_empty_result_array_is_waived_instead_of_billing_one() {
    let invocation = extract(
        json!({"model": MODEL, "prompt": "x", "n": 4}),
        json!({"data": []}),
    )
    .await;
    assert!(
        invocation.usage.lines.is_empty(),
        "zero results must not fabricate a line: {:?}",
        invocation.usage.lines
    );
    assert_eq!(
        Some("provider_returned_no_results"),
        invocation.charging.waived.as_deref()
    );
}

/// 显式 `result_count: 0`：同样 waive。
#[tokio::test]
async fn an_explicit_zero_result_count_is_waived() {
    let invocation = extract(
        json!({"model": MODEL, "prompt": "x"}),
        json!({"result_count": 0}),
    )
    .await;
    assert!(invocation.usage.lines.is_empty());
    assert_eq!(
        Some("provider_returned_no_results"),
        invocation.charging.waived.as_deref()
    );
}

/// 对照：非空数组按实际条数计 2 张。
#[tokio::test]
async fn produced_images_are_still_billed_per_result() {
    let invocation = extract(
        json!({"model": MODEL, "prompt": "x", "n": 4}),
        json!({"data": [{"url": "a"}, {"url": "b"}]}),
    )
    .await;
    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!("2", invocation.usage.lines[0].quantity.billable_quantity);
    assert!(invocation.charging.waived.is_none());
}

/// 对照：没有结果数组的异步任务回执仍按 1 条任务计费。
#[tokio::test]
async fn a_task_receipt_without_a_result_array_still_bills_one() {
    let invocation = extract(
        json!({"model": MODEL, "prompt": "x"}),
        json!({"task_id": "task-1", "status": "queued"}),
    )
    .await;
    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!("1", invocation.usage.lines[0].quantity.billable_quantity);
    assert!(invocation.charging.waived.is_none());
}
