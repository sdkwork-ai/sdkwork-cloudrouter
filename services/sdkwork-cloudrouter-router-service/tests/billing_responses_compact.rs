//! `POST /v1/responses/compact` 是**模型调用**，必须按 token 结算。
//!
//! 契约把响应声明为 `OpenAiResponse`（可带 `usage`），请求体带 `model`。它此前
//! 被归为 `api_request`：目录没有 `api_request` 价 ⇒ 预检 `PriceNotFound` ⇒
//! 端点在做了模型计算后返回 500（平台承担 token 成本、客户拿不到结果）。
//! compact 的用量与普通 Responses 同步返回，不需要异步回收，直接走复合 token
//! 计价。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationDispatch, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, OpenAiResourceClassifier, PricingFinalizationInterceptor,
    PricingPreflightInterceptor, PricingSettlementInterceptor, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelVendor,
    ModelVendorDefinition, Money, PriceSide, PricingPlan, ProviderAuthProfile,
    UpstreamAccountGroup,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::json;
use std::sync::Arc;

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const API_KEY_ID: i64 = 100;
const ACCOUNT_GROUP_ID: i64 = 10;
const VENDOR: &str = "openai";
const MODEL: &str = "gpt-5";
const CATALOG_KEY: &str = "openai/gpt-5";

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
        ModelVendor::OpenAi,
        VENDOR,
    ));
    catalog
        .add_model(AiModel::new(MODEL, MODEL, VENDOR, vec!["chat"]).with_catalog_key(CATALOG_KEY));
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
    for (meter, price) in [
        (BillingMeter::LlmInputToken, "1.250000"),
        (BillingMeter::LlmOutputToken, "10.000000"),
    ] {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            CATALOG_KEY,
            MODEL,
            PriceSide::OfficialReference,
            meter,
            Money::usd(price).unwrap(),
        ));
    }
    catalog
}

async fn compact_invocation() -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(
            Method::POST,
            "/v1/responses/compact",
        ))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/responses/compact")
            .with_request_id("req-compact")
            .with_body(InvocationBody::json(json!({
                "model": MODEL,
                "input": [{"role": "user", "content": "long context"}]
            }))),
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
    // Payload 拦截器负责从请求体取 model；这里直接复现它的结果。
    invocation.resource.requested_model = Some(MODEL.to_owned());
    invocation.resource.requested_model_catalog_key = Some(CATALOG_KEY.to_owned());
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
}

#[tokio::test]
async fn response_compaction_bills_model_tokens() {
    let catalog = Arc::new(catalog());
    let mut invocation = compact_invocation().await;
    assert_eq!(
        BillingMode::Composite,
        invocation.billing.mode,
        "compaction is a model call, not a per-request management action"
    );

    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("preflight");

    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "resp_compact_1",
            "object": "response",
            "status": "completed",
            "model": MODEL,
            "usage": {"input_tokens": 1000, "output_tokens": 200, "total_tokens": 1200}
        }),
    );
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

    let amounts = invocation
        .usage
        .settlement_commands
        .iter()
        .map(|command| {
            (
                command.billing_meter_code.clone(),
                command.customer_charge_amount.clone(),
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(
        vec![
            ("llm_input_token".to_owned(), "0.001250000000".to_owned()),
            ("llm_output_token".to_owned(), "0.002000000000".to_owned()),
        ],
        amounts
    );
}
