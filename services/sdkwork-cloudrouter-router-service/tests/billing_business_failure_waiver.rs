//! 2xx 业务失败：不能按 1 张/条收。
//!
//! 厂商原生媒体 API 常用 HTTP 200 + 业务错误返回：Kling/Vidu 的 `code != 0`
//! （官方成功码是 0）、MiniMax 的 `base_resp.status_code != 0`、其他厂商的
//! `error` 对象或 `status: failed`。此时没有产出可计量，按 1 条/1 张收是
//! 多收客户；正确口径是 waive 并释放预扣。
//!
//! token 模式不在此列：即使响应带错误，已经发生的 token 计算仍要结算。

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    Invocation, InvocationAccount, InvocationBody, InvocationClassificationRequest,
    InvocationDispatch, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, PricingPreflightInterceptor, ProviderNativeResourceClassifier,
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
const MODEL: &str = "kling-v2-1";
const CATALOG_KEY: &str = "kuaishou/kling-v2-1";

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
        "kuaishou",
        ModelVendor::Kuaishou,
        "kuaishou",
    ));
    catalog.add_model(
        AiModel::new(MODEL, MODEL, "kuaishou", vec!["image"]).with_catalog_key(CATALOG_KEY),
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
        Money::usd("0.100000").unwrap(),
    ));
    catalog
}

async fn invocation(response: Value) -> Invocation {
    let classification = ProviderNativeResourceClassifier
        .classify(
            &InvocationClassificationRequest::new(Method::POST, "/v1/images/generations")
                .with_supplier_code("kling")
                .with_provider_family("media")
                .with_endpoint_key("image_generation")
                .with_capability(
                    sdkwork_cloudrouter_router_service::domain::RoutingCapability::Image,
                ),
        )
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/kling/v1/images/generations")
            .with_request_id("req-business-failure")
            .with_body(InvocationBody::json(
                json!({"model_name": MODEL, "prompt": "a cat"}),
            )),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: "kling".to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://api.kling.example".to_owned()),
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

    let catalog = Arc::new(catalog());
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

/// Kling 业务失败：`code != 0`、无结果 ⇒ waive、不产行。
#[tokio::test]
async fn a_kling_business_error_is_waived() {
    let invocation = invocation(json!({"code": 1201, "message": "invalid prompt"})).await;
    assert!(invocation.usage.lines.is_empty());
    assert_eq!(
        Some("provider_business_failure"),
        invocation.charging.waived.as_deref()
    );
}

/// 对照：Kling 成功 `code: 0` + 结果数组 ⇒ 正常计 1 张。
#[tokio::test]
async fn a_kling_success_still_bills_the_result() {
    let invocation = invocation(json!({"code": 0, "data": [{"url": "a"}]})).await;
    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!("1", invocation.usage.lines[0].quantity.billable_quantity);
    assert!(invocation.charging.waived.is_none());
}

/// 其他厂商的 `status: failed`（无 code 语义）⇒ waive。
#[tokio::test]
async fn a_failed_status_is_waived() {
    let invocation = invocation(json!({
        "status": "failed",
        "error": {"code": "InvalidParameter", "message": "bad prompt"}
    }))
    .await;
    assert!(invocation.usage.lines.is_empty());
    assert_eq!(
        Some("provider_business_failure"),
        invocation.charging.waived.as_deref()
    );
}

/// 字符串化的业务码（`"1201"`）同样要识别为失败。
#[tokio::test]
async fn a_stringified_kling_code_is_a_failure() {
    let invocation = invocation(json!({"code": "1201", "message": "invalid prompt"})).await;
    assert!(invocation.usage.lines.is_empty());
    assert_eq!(
        Some("provider_business_failure"),
        invocation.charging.waived.as_deref()
    );
}

/// `code: "error"`（Suno 一类第三方）也是失败。
#[tokio::test]
async fn a_string_error_code_is_a_failure() {
    let invocation = invocation(json!({"code": "error", "message": "generation failed"})).await;
    assert!(invocation.usage.lines.is_empty());
    assert_eq!(
        Some("provider_business_failure"),
        invocation.charging.waived.as_deref()
    );
}

/// 对照：`error: null` 与空对象不是失败，不能误 waive。
#[tokio::test]
async fn a_null_error_is_not_a_failure() {
    let invocation = invocation(json!({
        "code": 0,
        "error": null,
        "data": [{"url": "a"}]
    }))
    .await;
    assert_eq!(1, invocation.usage.lines.len());
    assert!(invocation.charging.waived.is_none());
}

/// 对照：schema 默认的空字符串错误对象（`{"code":"","message":""}`）语义为空，
/// 正常产出仍要计费。
#[tokio::test]
async fn an_empty_error_object_is_not_a_failure() {
    let invocation = invocation(json!({
        "code": 0,
        "error": {"code": "", "message": "", "type": ""},
        "data": [{"url": "a"}]
    }))
    .await;
    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!("1", invocation.usage.lines[0].quantity.billable_quantity);
    assert!(invocation.charging.waived.is_none());
}
