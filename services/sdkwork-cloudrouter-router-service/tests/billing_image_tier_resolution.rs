//! 图像模型的**单档位** `tier_code` 费率必须能在没有请求档位时解析。
//!
//! sdkwork-models 把一批图像费率条件化在 `tier_code` 上：
//!
//! | 模型 | 费率条件 | 请求是否声明档位 |
//! | --- | --- | --- |
//! | `kuaishou/kling-image-3.0` | `tier_code = res_1k_2k`（**唯一**一条） | 否：`KlingImageGenerationRequest` 只有 prompt / model_name / aspect_ratio / image |
//! | `kuaishou/kling-image-o1` | `tier_code = res_1k_2k`（唯一） | 否 |
//! | `bytedance/doubao-seedream-5-0-pro` | 4 条不同 tier | 否 |
//! | `runway/gpt_image_2` | 8 条不同 tier | 部分 |
//!
//! 计费侧原先只对**视频**计量单位解析 `tier_code`（`ai_model_video_profile`），
//! 图像计量单位拿到的是 `VideoPricingTierDecision::unknown()`。于是带条件的候选
//! 全部被过滤干净，预检报 `price_not_found` —— 模型有价却卖不出去。
//!
//! 修法只处理**没有选择余地**的情形：该计量单位的所有官方费率共享**同一个**
//! `tier_code`，且没有无条件费率。此时注入这个档位不会改变价格，也不会把多档位
//! 模型蒙对一个档位。多档位模型（如 Seedream / Runway）继续 fail-closed，直到
//! 契约能声明请求档位或目录补图像档位表。
//!
//! 用例成对出现：单档位放行、多档位继续拒、无条件费率不受影响。

use axum::http::Method;
use chrono::{DateTime, Utc};
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, Invocation,
    InvocationAccount, InvocationBody, InvocationClassificationRequest, InvocationDispatch,
    InvocationError, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, PricingFinalizationInterceptor, PricingPreflightInterceptor,
    PricingSettlementInterceptor, ProviderNativeResourceClassifier, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, PricingRateCondition,
    PricingRateMetadata, PricingRateVariant, ProviderAuthProfile, UpstreamAccountGroup,
    UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::{json, Value};
use std::sync::Arc;

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const API_KEY_ID: i64 = 100;
const ACCOUNT_GROUP_ID: i64 = 10;
const ACCOUNT_ID: i64 = 3001;
const VENDOR: &str = "kuaishou";
const CATALOG_KEY: &str = "kuaishou/kling-image-3.0";
const MODEL: &str = "kling-image-3.0";

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

/// 一条只在 `tier_code = <tier>` 时命中的官方费率。
fn tier_rate(meter: BillingMeter, tier: &str, price: &str) -> ModelPrice {
    let metadata = PricingRateMetadata {
        record_identity: None,
        price_book_code: "models.test.global.official".to_owned(),
        rate_hash: format!("hash-{tier}"),
        product_code: "models.test.image".to_owned(),
        operation_code: "image.generate".to_owned(),
        billability: "chargeable".to_owned(),
        charge_timing: "successful_result".to_owned(),
        calculation_mode: "per_unit".to_owned(),
        quantity_aggregation: "sum".to_owned(),
        minimum_quantity: DecimalValue::ZERO,
        quantity_step: None,
        priority: 100,
        effective_from: DateTime::<Utc>::MIN_UTC,
        effective_to: None,
        rate_variant: PricingRateVariant::Standard,
        schedule: None,
        conditions: vec![PricingRateCondition {
            dimension_code: "tier_code".to_owned(),
            operator_code: "eq".to_owned(),
            value: json!(tier),
        }],
        tiers: Vec::new(),
        formula: None,
    };
    ModelPrice::new_for_catalog_key(
        CATALOG_KEY,
        MODEL,
        PriceSide::OfficialReference,
        meter,
        Money::usd(price).unwrap(),
    )
    .with_rate_metadata(metadata)
}

fn catalog(rates: Vec<ModelPrice>) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        VENDOR,
        ModelVendor::Kuaishou,
        VENDOR,
    ));
    catalog
        .add_model(AiModel::new(MODEL, MODEL, VENDOR, vec!["image"]).with_catalog_key(CATALOG_KEY));
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
        CATALOG_KEY,
        MODEL,
        VENDOR,
        ACCOUNT_ID,
        MODEL,
    ));
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new(VENDOR, ACCOUNT_ID).with_account_group_binding(
            ACCOUNT_GROUP_ID,
            100,
            100,
        ),
    );
    for rate in rates {
        catalog.add_price(rate);
    }
    catalog
}

async fn declared_invocation(body: Value) -> Invocation {
    let classification = ProviderNativeResourceClassifier
        .classify(
            &InvocationClassificationRequest::new(Method::POST, "/v1/images/generations")
                .with_supplier_code(VENDOR),
        )
        .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model = Some(MODEL.to_owned());
    resource.requested_model_catalog_key = Some(CATALOG_KEY.to_owned());
    resource.provider_native_model = Some(MODEL.to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/kling/v1/images/generations")
            .with_request_id("req-image-tier")
            .with_body(InvocationBody::json(body)),
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
        base_url: Some("https://vendor.example".to_owned()),
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

/// 目录改写 → 预检 → 抽取 → 终审 → 结算；返回 (mode, 用量行, 金额)。
async fn settle(
    rates: Vec<ModelPrice>,
) -> Result<(BillingMode, Vec<(String, String)>, String), InvocationError> {
    settle_with_body(rates, json!({"model_name": MODEL, "prompt": "a red apple"})).await
}

async fn settle_with_body(
    rates: Vec<ModelPrice>,
    body: Value,
) -> Result<(BillingMode, Vec<(String, String)>, String), InvocationError> {
    let catalog = Arc::new(catalog(rates));
    let mut invocation = declared_invocation(body).await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    let mode = invocation.billing.mode.clone();
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await?;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"code": 0, "data": [{"url": "https://cdn.example/a.png"}]}),
    );
    UsageExtractionInterceptor.after(&mut invocation).await?;
    PricingFinalizationInterceptor::new(Arc::clone(&catalog))
        .after(&mut invocation)
        .await?;
    PricingSettlementInterceptor.after(&mut invocation).await?;
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
    let amount = invocation
        .usage
        .settlement_commands
        .first()
        .map(|command| command.customer_charge_amount.clone())
        .unwrap_or_default();
    Ok((mode, lines, amount))
}

/// 单档位：目录只有 `res_1k_2k` 一条费率，请求没有档位字段 ⇒ 必须按该档位售出。
#[tokio::test]
async fn a_single_tier_image_rate_resolves_without_a_request_tier() {
    let (mode, lines, amount) = settle(vec![tier_rate(
        BillingMeter::ImageResult,
        "res_1k_2k",
        "0.028169",
    )])
    .await
    .expect("a single-tier image rate must resolve; the model has exactly one sellable tier");
    assert_eq!(BillingMode::ResultCount, mode);
    assert_eq!(vec![("image_result".to_owned(), "1".to_owned())], lines);
    assert_eq!("0.028169000000", amount);
}

/// 多档位：两条不同 tier 的费率，请求没有档位 ⇒ 继续 fail-closed，绝不猜。
#[tokio::test]
async fn a_multi_tier_image_rate_stays_fail_closed_without_a_request_tier() {
    let error = settle(vec![
        tier_rate(BillingMeter::ImageResult, "res_1k_2k", "0.028169"),
        tier_rate(BillingMeter::ImageResult, "res_4k", "0.084507"),
    ])
    .await
    .expect_err("two tiers without a request tier must not be guessed");
    assert!(
        error.message.contains("price") || error.message.contains("pricing"),
        "the failure must be a pricing gap: {error:?}"
    );
}

/// 对照：无条件费率照旧解析，不受单档位逻辑影响。
#[tokio::test]
async fn an_unconditional_image_rate_still_resolves() {
    let (mode, lines, _) = settle(vec![ModelPrice::new_for_catalog_key(
        CATALOG_KEY,
        MODEL,
        PriceSide::OfficialReference,
        BillingMeter::ImageResult,
        Money::usd("0.010000").unwrap(),
    )])
    .await
    .expect("an unconditional rate must keep resolving");
    assert_eq!(BillingMode::ResultCount, mode);
    assert_eq!(vec![("image_result".to_owned(), "1".to_owned())], lines);
}

/// Kling v2.1 图像按输入模式分三档（t2i $0.1 / i2i $0.2 / multi_ref $0.4）。
/// 请求形状决定模式，不需要档位字段。
#[tokio::test]
async fn image_input_mode_selects_the_matching_tier() {
    let rates = vec![
        tier_rate(BillingMeter::ImageResult, "t2i_1k_2k", "0.100000"),
        tier_rate(BillingMeter::ImageResult, "i2i_1k_2k", "0.200000"),
        tier_rate(BillingMeter::ImageResult, "multi_ref_1k_2k", "0.400000"),
    ];
    let (_, _, amount) = settle_with_body(
        rates.clone(),
        json!({"model_name": MODEL, "prompt": "a red apple"}),
    )
    .await
    .expect("text-to-image must resolve the t2i tier");
    assert_eq!("0.100000000000", amount);

    let (_, _, amount) = settle_with_body(
        rates.clone(),
        json!({"model_name": MODEL, "prompt": "a red apple",
               "image": "https://cdn.example/ref.png"}),
    )
    .await
    .expect("image-to-image must resolve the i2i tier");
    assert_eq!("0.200000000000", amount);

    let (_, _, amount) = settle_with_body(
        rates,
        json!({"model_name": MODEL, "prompt": "a red apple",
               "image_reference_list": [{"image": "https://cdn.example/ref.png"}]}),
    )
    .await
    .expect("multi-reference must resolve the multi_ref tier");
    assert_eq!("0.400000000000", amount);
}

/// 同一模式有多个档位（模式 + 分辨率后缀）时无法从请求形状唯一确定，
/// 继续 fail-closed。
#[tokio::test]
async fn ambiguous_mode_tiers_stay_fail_closed() {
    let rates = vec![
        tier_rate(BillingMeter::ImageResult, "t2i_1k_2k", "0.100000"),
        tier_rate(BillingMeter::ImageResult, "t2i_4k", "0.200000"),
    ];
    let error = settle_with_body(rates, json!({"model_name": MODEL, "prompt": "x"}))
        .await
        .expect_err("two t2i tiers without a resolution signal must not be guessed");
    assert!(
        error.message.contains("price") || error.message.contains("pricing"),
        "the failure must be a pricing gap: {error:?}"
    );
}
