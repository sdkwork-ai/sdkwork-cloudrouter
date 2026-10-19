//! 上下文分档（context-tier）token 计费回归。
//!
//! 一批旗舰 chat 模型把 input / output / cache-read 三个计量单位**全部**条件化
//! 在同一组上下文长度档位上：
//!
//! ```text
//! input_le_32k        → [0, 32k)
//! input_32k_128k      → [32k, 128k)
//! input_128k_256k     → [128k, 256k)
//! ```
//!
//! 请求侧没有档位字段，计费侧原先只给视频/图像解析 `tier_code`，token 档位
//! 一律"未知" ⇒ 候选全被过滤 ⇒ `PriceNotFound` ⇒ 模型不可售。全量扫目录有
//! 15 个模型是这种形状（Bytedance Doubao/Seed 12 个，Alibaba/Baidu 3 个）。
//!
//! 修法只解析**数值语义明确**的档位名（`input_le_<n>k` / `input_<n>k_<m>k` /
//! `input_gt_<n>k`），并要求档位集合从 0 开始连续、不重叠：
//!
//! * 预检阶段用请求体估算上下文（派发前没有 `usage`）；
//! * 结算阶段用已抽取的 input + cache-read + cache-write 总量选档；
//! * 超过目录最后一档时用最高档（宁可按最高档收，也不能因目录缺一档免单）；
//! * `tier_32k` 这类无法判定"≤ 还是 ≥"的命名继续 fail-closed（Alibaba/Baidu
//!   的剩余缺口见审计文档遗留第 17 条）。
//!
//! 用例：三档各自的金额、超出最高档、歧义命名对照、无条件费率对照。

use axum::http::Method;
use chrono::{DateTime, Utc};
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, Invocation,
    InvocationAccount, InvocationBody, InvocationClassificationRequest, InvocationDispatch,
    InvocationError, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, OpenAiResourceClassifier, PricingFinalizationInterceptor,
    PricingPreflightInterceptor, PricingSettlementInterceptor, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, PricingRateCondition,
    PricingRateMetadata, PricingRateVariant, ProviderAuthProfile, UpstreamAccountGroup,
    UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::json;
use std::sync::Arc;

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const API_KEY_ID: i64 = 100;
const ACCOUNT_GROUP_ID: i64 = 10;
const ACCOUNT_ID: i64 = 3001;
const VENDOR: &str = "bytedance";
const CATALOG_KEY: &str = "bytedance/doubao-seed-2-0-pro";
const MODEL: &str = "doubao-seed-2-0-pro";

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

fn tier_rate(meter: BillingMeter, tier: &str, usd_per_million: &str) -> ModelPrice {
    let metadata = PricingRateMetadata {
        record_identity: None,
        price_book_code: "models.bytedance.cn.official".to_owned(),
        rate_hash: format!("hash-{}-{tier}", meter.code()),
        product_code: "models.bytedance.chat".to_owned(),
        operation_code: "chat.completions".to_owned(),
        billability: "chargeable".to_owned(),
        charge_timing: "usage_reported".to_owned(),
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
        Money::usd(usd_per_million).unwrap(),
    )
    .with_rate_metadata(metadata)
}

/// 三档输入/产出费率（价格取自 Doubao 目录的实际量级）。
fn tiered_rates() -> Vec<ModelPrice> {
    vec![
        tier_rate(BillingMeter::LlmInputToken, "input_le_32k", "3.200000"),
        tier_rate(BillingMeter::LlmOutputToken, "input_le_32k", "16.000000"),
        tier_rate(BillingMeter::LlmInputToken, "input_32k_128k", "4.800000"),
        tier_rate(BillingMeter::LlmOutputToken, "input_32k_128k", "24.000000"),
        tier_rate(BillingMeter::LlmInputToken, "input_128k_256k", "9.600000"),
        tier_rate(BillingMeter::LlmOutputToken, "input_128k_256k", "48.000000"),
    ]
}

fn catalog(rates: Vec<ModelPrice>) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        VENDOR,
        ModelVendor::ByteDance,
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
            .with_request_id("req-context-tier")
            .with_body(InvocationBody::json(json!({
                "model": MODEL,
                "max_tokens": 10,
                "messages": [{"role": "user", "content": "hi"}]
            }))),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: VENDOR.to_owned(),
        account_id: ACCOUNT_ID,
        region_code: "cn".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://ark.example".to_owned()),
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

async fn settle(
    rates: Vec<ModelPrice>,
    prompt_tokens: i64,
) -> Result<(BillingMode, Vec<(String, String, String)>), InvocationError> {
    let catalog = Arc::new(catalog(rates));
    let mut invocation = declared_invocation().await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    let mode = invocation.billing.mode.clone();
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await?;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "chatcmpl-1",
            "object": "chat.completion",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": "ok"},
                         "finish_reason": "stop"}],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": 10,
                "total_tokens": prompt_tokens + 10
            }
        }),
    );
    UsageExtractionInterceptor.after(&mut invocation).await?;
    PricingFinalizationInterceptor::new(Arc::clone(&catalog))
        .after(&mut invocation)
        .await?;
    PricingSettlementInterceptor.after(&mut invocation).await?;
    let commands = invocation
        .usage
        .settlement_commands
        .iter()
        .map(|command| {
            (
                command.billing_meter_code.clone(),
                command.billable_quantity.clone(),
                command.customer_charge_amount.clone(),
            )
        })
        .collect();
    Ok((mode, commands))
}

fn amount(commands: &[(String, String, String)], meter: &str) -> String {
    commands
        .iter()
        .find(|(code, _, _)| code == meter)
        .unwrap_or_else(|| panic!("missing {meter} command: {commands:?}"))
        .2
        .clone()
}

/// 20k prompt ⇒ 最低档 `input_le_32k`（$3.2/$16）。
#[tokio::test]
async fn a_short_context_uses_the_lowest_tier() {
    let (mode, commands) = settle(tiered_rates(), 20_000)
        .await
        .expect("a short context must resolve the lowest tier");
    assert_eq!(BillingMode::Composite, mode);
    assert_eq!("0.064000000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.000160000000", amount(&commands, "llm_output_token"));
}

/// 40k prompt ⇒ `input_32k_128k`（$4.8/$24），按 **真实用量** 选档，
/// 不是按预检时的请求体估算。
#[tokio::test]
async fn a_40k_context_uses_the_middle_tier_even_though_preflight_estimated_small() {
    let (_, commands) = settle(tiered_rates(), 40_000)
        .await
        .expect("the measured context must select the middle tier");
    assert_eq!("0.192000000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.000240000000", amount(&commands, "llm_output_token"));
}

/// 200k prompt ⇒ `input_128k_256k`（$9.6/$48）。
#[tokio::test]
async fn a_200k_context_uses_the_highest_published_tier() {
    let (_, commands) = settle(tiered_rates(), 200_000)
        .await
        .expect("the measured context must select the highest published tier");
    assert_eq!("1.920000000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.000480000000", amount(&commands, "llm_output_token"));
}

/// 超出目录最后一档（300k > 256k）⇒ 用最高档，绝不因为目录缺一档而免单。
#[tokio::test]
async fn a_context_beyond_the_last_tier_still_uses_the_highest_price() {
    let (_, commands) = settle(tiered_rates(), 300_000)
        .await
        .expect("beyond the last published tier, the highest tier must still bill");
    assert_eq!("2.880000000000", amount(&commands, "llm_input_token"));
}

/// 对照：非数值档位（`tier_fast` / `tier_slow`）无法判定上下文区间，继续
/// fail-closed。
#[tokio::test]
async fn an_ambiguous_tier_vocabulary_stays_fail_closed() {
    let rates = vec![
        tier_rate(BillingMeter::LlmInputToken, "tier_fast", "3.200000"),
        tier_rate(BillingMeter::LlmOutputToken, "tier_fast", "16.000000"),
        tier_rate(BillingMeter::LlmInputToken, "tier_slow", "4.800000"),
        tier_rate(BillingMeter::LlmOutputToken, "tier_slow", "24.000000"),
    ];
    let error = settle(rates, 20_000)
        .await
        .expect_err("a non-numeric tier vocabulary must not be guessed");
    assert!(
        error.message.contains("not fully resolved") || error.message.contains("pricing"),
        "the failure must be a pricing gap: {error:?}"
    );
}

/// Alibaba / Baidu 的累计上界词汇：`tier_32k` / `tier_256k` / `tier_1m` 表示
/// `[0,32k)`、`[32k,256k)`、`[256k,1M)`；请求没有档位字段，按真实上下文选档。
#[tokio::test]
async fn a_cumulative_tier_vocabulary_selects_by_upper_bound() {
    let rates = vec![
        tier_rate(BillingMeter::LlmInputToken, "tier_32k", "1.000000"),
        tier_rate(BillingMeter::LlmOutputToken, "tier_32k", "10.000000"),
        tier_rate(BillingMeter::LlmInputToken, "tier_256k", "2.000000"),
        tier_rate(BillingMeter::LlmOutputToken, "tier_256k", "20.000000"),
        tier_rate(BillingMeter::LlmInputToken, "tier_1m", "4.000000"),
        tier_rate(BillingMeter::LlmOutputToken, "tier_1m", "40.000000"),
    ];
    let (_, commands) = settle(rates.clone(), 20_000)
        .await
        .expect("20k fits the first cumulative tier");
    assert_eq!("0.020000000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.000100000000", amount(&commands, "llm_output_token"));

    let (_, commands) = settle(rates.clone(), 100_000)
        .await
        .expect("100k fits the 32k–256k cumulative tier");
    assert_eq!("0.200000000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.000200000000", amount(&commands, "llm_output_token"));

    let (_, commands) = settle(rates.clone(), 500_000)
        .await
        .expect("500k fits the 256k–1M cumulative tier");
    assert_eq!("2.000000000000", amount(&commands, "llm_input_token"));

    // 超最后一档：仍按最高档收，绝不因为目录缺一档而免单。
    let (_, commands) = settle(rates, 2_000_000)
        .await
        .expect("beyond the last cumulative tier, the highest tier still bills");
    assert_eq!("8.000000000000", amount(&commands, "llm_input_token"));
}

/// 对照：无条件费率不受上下文分档逻辑影响。
#[tokio::test]
async fn an_unconditional_chat_rate_still_resolves() {
    let rates = vec![
        ModelPrice::new_for_catalog_key(
            CATALOG_KEY,
            MODEL,
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::usd("3.200000").unwrap(),
        ),
        ModelPrice::new_for_catalog_key(
            CATALOG_KEY,
            MODEL,
            PriceSide::OfficialReference,
            BillingMeter::LlmOutputToken,
            Money::usd("16.000000").unwrap(),
        ),
    ];
    let (_, commands) = settle(rates, 200_000)
        .await
        .expect("an unconditional rate must keep resolving");
    assert_eq!("0.640000000000", amount(&commands, "llm_input_token"));
    assert_eq!("0.000160000000", amount(&commands, "llm_output_token"));
}
