//! ElevenLabs 音效生成：目录按 `audio_output_minute` 计价，请求按
//! `duration_seconds` 声明时长。
//!
//! 路由 taxonomy 声明的是 `api_request`（管理面兜底），但请求契约**强制**
//! `model_id`，payload 会把它解析成目录模型 `elevenlabs/eleven_text_to_sound_v2`；
//! 身份对账发现声明（`api_request`）与目录（`audio_output_minute`）无交集，
//! 以目录为准把计费改写为按分钟。这条测试钉住"真实请求（带 model_id）不是
//! 按次无价"，并验证 10 秒按 1/6 分钟结算。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, Invocation,
    InvocationAccount, InvocationBody, InvocationClassificationRequest, InvocationDispatch,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    PricingFinalizationInterceptor, PricingPreflightInterceptor, PricingSettlementInterceptor,
    ProviderNativeResourceClassifier, UsageExtractionInterceptor,
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
const VENDOR: &str = "elevenlabs";
const MODEL: &str = "eleven_text_to_sound_v2";
const CATALOG_KEY: &str = "elevenlabs/eleven_text_to_sound_v2";

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
        ModelVendor::ElevenLabs,
        VENDOR,
    ));
    catalog
        .add_model(AiModel::new(MODEL, MODEL, VENDOR, vec!["audio"]).with_catalog_key(CATALOG_KEY));
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
        BillingMeter::AudioOutputMinute,
        Money::usd("0.120000").unwrap(),
    ));
    catalog
}

async fn sound_invocation() -> Invocation {
    let classification = ProviderNativeResourceClassifier
        .classify(
            &InvocationClassificationRequest::new(Method::POST, "/v1/sound-generation")
                .with_supplier_code(VENDOR),
        )
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/elevenlabs/v1/sound-generation")
            .with_request_id("req-sound")
            .with_body(InvocationBody::json(json!({
                "model_id": MODEL,
                "text": "rain on a window",
                "duration_seconds": 10
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
        base_url: Some("https://api.elevenlabs.example".to_owned()),
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
    // Payload 拦截器从 `model_id` 解析模型；这里复现它的结果。
    invocation.resource.requested_model = Some(MODEL.to_owned());
    invocation.resource.requested_model_catalog_key = Some(CATALOG_KEY.to_owned());
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
}

#[tokio::test]
async fn sound_generation_bills_audio_minutes_not_requests() {
    let catalog = Arc::new(catalog());
    let mut invocation = sound_invocation().await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    assert_eq!(
        BillingMode::AudioSecond,
        invocation.billing.mode,
        "the catalog's audio_output_minute must override the per-request fallback"
    );
    assert_eq!(
        Some(BillingMeter::AudioOutputMinute),
        invocation.billing.meter
    );

    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("preflight");
    invocation.dispatch = InvocationDispatch::json_response(200, json!({}));
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
    assert_eq!("audio_output_minute", command.billing_meter_code);
    // 10 秒 = 1/6 分钟 × $0.12 = $0.02（Decimal 截断到 $0.019999999999）。
    assert_eq!("0.019999999999", command.customer_charge_amount);
}
