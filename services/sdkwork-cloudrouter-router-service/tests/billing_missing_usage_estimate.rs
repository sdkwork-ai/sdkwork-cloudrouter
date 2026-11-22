//! 成功的非流式响应缺少 `usage` 时，必须仍然计费。
//!
//! 上游（或中间的透明代理）偶发省略 `usage`。抽取层若直接放弃，整条计费链拿不到
//! 用量行：结算报 "did not produce a billable amount"，但响应已经成功物化 ——
//! 客户端照常拿到 200，等于免单。这里按与流式兜底相同的保守估算合成用量体：
//! 输入按请求体、输出按响应文本，估算偏低但不为 0。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationDispatch, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, OpenAiResourceClassifier, PricingPreflightInterceptor,
    UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, ProviderAuthProfile,
    UpstreamAccountGroup, UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::{json, Value};
use std::sync::Arc;

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const API_KEY_ID: i64 = 100;
const ACCOUNT_GROUP_ID: i64 = 10;
const ACCOUNT_ID: i64 = 3001;
const VENDOR: &str = "openai";
const MODEL: &str = "gpt-4o-mini";
const CATALOG_KEY: &str = "openai/gpt-4o-mini";

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
    catalog.add_vendor(ModelVendorDefinition::new(VENDOR, ModelVendor::OpenAi, "OpenAI"));
    catalog.add_model(
        AiModel::new(MODEL, MODEL, VENDOR, vec!["chat"]).with_catalog_key(CATALOG_KEY),
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
    catalog.add_model_upstream_route(ModelUpstreamRoute::new_for_catalog_key(
        CATALOG_KEY, MODEL, VENDOR, ACCOUNT_ID, MODEL,
    ));
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new(VENDOR, ACCOUNT_ID).with_account_group_binding(
            ACCOUNT_GROUP_ID,
            100,
            100,
        ),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        CATALOG_KEY,
        MODEL,
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("0.150000").unwrap(),
    ));
    catalog.add_price(ModelPrice::new_for_catalog_key(
        CATALOG_KEY,
        MODEL,
        PriceSide::OfficialReference,
        BillingMeter::LlmOutputToken,
        Money::usd("0.600000").unwrap(),
    ));
    catalog
}

async fn declared_invocation() -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(
            Method::POST,
            "/v1/chat/completions",
        ))
        .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model = Some(MODEL.to_owned());
    resource.requested_model_catalog_key = Some(CATALOG_KEY.to_owned());
    resource.provider_native_model = Some(MODEL.to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions")
            .with_request_id("req-missing-usage")
            .with_body(InvocationBody::json(json!({
                "model": MODEL,
                "messages": [{"role": "user", "content": "explain sticky routing"}]
            }))),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: VENDOR.to_owned(),
        account_id: ACCOUNT_ID,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://api.openai.com".to_owned()),
        secret_ref: None,
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: Some(MODEL.to_owned()),
        billing_mode: AccountBillingMode::Prepay,
        account_group_id: Some(ACCOUNT_GROUP_ID),
        account_group_code: Some("standard-group".to_owned()),
        pricing_plan_code: Some("standard".to_owned()),
    });
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
}

async fn extract(response: Value) -> Invocation {
    let catalog = Arc::new(catalog());
    let mut invocation = declared_invocation().await;
    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
    invocation.dispatch = InvocationDispatch::json_response(200, response);
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");
    invocation
}

#[tokio::test]
async fn a_successful_response_without_usage_is_billed_from_an_estimate() {
    let invocation = extract(json!({
        "id": "chatcmpl-1",
        "object": "chat.completion",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": "sticky routing keeps a session on one account"}
        }]
    }))
    .await;

    assert_eq!(BillingMode::Composite, invocation.billing.mode);
    let lines = invocation
        .usage
        .lines
        .iter()
        .map(|line| {
            (
                line.meter.code().to_owned(),
                line.quantity.billable_quantity.clone(),
            )
        })
        .collect::<Vec<_>>();
    assert!(
        !lines.is_empty(),
        "a successful response without usage must still be billed"
    );
    let quantity_of = |meter: &str| {
        lines
            .iter()
            .find(|(code, _)| code == meter)
            .map(|(_, quantity)| quantity.parse::<i64>().unwrap_or_default())
            .unwrap_or_default()
    };
    assert!(
        quantity_of(BillingMeter::LlmInputToken.code()) > 0,
        "prompt tokens are estimated from the request body: {lines:?}"
    );
    assert!(
        quantity_of(BillingMeter::LlmOutputToken.code()) > 0,
        "completion tokens are estimated from the response text: {lines:?}"
    );
}

#[tokio::test]
async fn a_successful_response_without_text_output_produces_no_lines() {
    // No assistant text (204-style or tool-only payload): there is nothing the
    // text estimator can price, so extraction stays a no-op instead of inventing
    // a charge.
    let invocation = extract(json!({"id": "chatcmpl-2", "choices": []})).await;
    assert!(
        invocation.usage.lines.is_empty(),
        "no textual output must not invent billable lines"
    );
}
