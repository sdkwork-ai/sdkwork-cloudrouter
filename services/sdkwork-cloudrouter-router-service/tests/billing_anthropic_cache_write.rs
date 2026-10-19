//! Anthropic 缓存**写入**的 TTL 档位计费回归。
//!
//! sdkwork-models 为每个 Anthropic 模型发布两条 `llm_cache_write_token` 费率：
//!
//! | 档位 | 相对输入价 | 触发条件 |
//! | --- | --- | --- |
//! | `cache_write_5m` | 1.25× | `cache_control` 不写 `ttl`（默认 5 分钟） |
//! | `cache_write_1h` | 2× | `cache_control: {"ttl": "1h"}` |
//!
//! 计费侧原先有两个缺陷叠加：
//!
//! 1. 复合档**没有声明** `llm_cache_write_token`，预检不会为它出价；
//! 2. 即使声明了，也没有把请求的 TTL 映射成 `tier_code`，两条候选都会被
//!    条件过滤。
//!
//! 结果：抽取层走"无价则并入输入"的兜底，缓存写入按 **1× 输入价**结算——
//! 5m 少收 20%，1h 少收 50%。这不是"宁可少收"的边界场景，而是每个使用
//! prompt caching 的 Anthropic 请求都会发生。
//!
//! 修法：复合档补声明缓存写入；`cache_write_tier_code` 只在目录同时提供
//! 5m/1h 两档时按 `cache_control.ttl` 选档。其他词汇（`long_context` /
//! `explicit_cache_write`）不猜，保持原有兜底。

use axum::http::Method;
use chrono::{DateTime, Utc};
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, Invocation,
    InvocationAccount, InvocationBody, InvocationClassificationRequest, InvocationDispatch,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    PricingFinalizationInterceptor, PricingPreflightInterceptor, PricingSettlementInterceptor,
    ProviderNativeResourceClassifier, UsageExtractionInterceptor,
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
const VENDOR: &str = "anthropic";
const CATALOG_KEY: &str = "anthropic/claude-opus-5";
const MODEL: &str = "claude-opus-5";

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

fn price(meter: BillingMeter, usd_per_million: &str) -> ModelPrice {
    ModelPrice::new_for_catalog_key(
        CATALOG_KEY,
        MODEL,
        PriceSide::OfficialReference,
        meter,
        Money::usd(usd_per_million).unwrap(),
    )
}

/// 一条只在 `tier_code = <tier>` 时命中的缓存写入费率。
fn tiered_cache_write(tier: &str, usd_per_million: &str) -> ModelPrice {
    let metadata = PricingRateMetadata {
        record_identity: None,
        price_book_code: "models.anthropic.global.official".to_owned(),
        rate_hash: format!("hash-{tier}"),
        product_code: "models.anthropic.chat".to_owned(),
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
    price(BillingMeter::LlmCacheWriteToken, usd_per_million).with_rate_metadata(metadata)
}

fn catalog(rates: Vec<ModelPrice>) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        VENDOR,
        ModelVendor::Anthropic,
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

/// Anthropic Messages 请求；`ttl = Some("1h")` 时给文本块加 1 小时缓存标记。
async fn declared_invocation(ttl: Option<&str>) -> Invocation {
    let cache_control = match ttl {
        Some(ttl) => json!({"type": "ephemeral", "ttl": ttl}),
        None => json!({"type": "ephemeral"}),
    };
    let body = json!({
        "model": MODEL,
        "max_tokens": 64,
        "messages": [{
            "role": "user",
            "content": [{"type": "text", "text": "hello", "cache_control": cache_control}]
        }]
    });
    let classification = ProviderNativeResourceClassifier
        .classify(
            &InvocationClassificationRequest::new(Method::POST, "/v1/messages")
                .with_supplier_code(VENDOR),
        )
        .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model = Some(MODEL.to_owned());
    resource.requested_model_catalog_key = Some(CATALOG_KEY.to_owned());
    resource.provider_native_model = Some(MODEL.to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/anthropic/v1/messages")
            .with_request_id("req-anthropic-cache")
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
        base_url: Some("https://api.anthropic.com".to_owned()),
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
    ttl: Option<&str>,
    usage: Value,
) -> (
    BillingMode,
    Vec<(String, String)>,
    Vec<(String, String, String)>,
) {
    let catalog = Arc::new(catalog(rates));
    let mut invocation = declared_invocation(ttl).await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    let mode = invocation.billing.mode.clone();
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "msg_1",
            "type": "message",
            "role": "assistant",
            "content": [{"type": "text", "text": "ok"}],
            "usage": usage
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
    let mut lines = invocation
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
    lines.sort();
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
        .collect::<Vec<_>>();
    (mode, lines, commands)
}

fn owned(entries: &[(&str, &str)]) -> Vec<(String, String)> {
    let mut lines: Vec<(String, String)> = entries
        .iter()
        .map(|(meter, quantity)| ((*meter).to_owned(), (*quantity).to_owned()))
        .collect();
    lines.sort();
    lines
}

fn amount(commands: &[(String, String, String)], meter: &str) -> String {
    commands
        .iter()
        .find(|(code, _, _)| code == meter)
        .unwrap_or_else(|| panic!("missing {meter} command: {commands:?}"))
        .2
        .clone()
}

fn anthropic_rates() -> Vec<ModelPrice> {
    vec![
        price(BillingMeter::LlmInputToken, "3.000000"),
        price(BillingMeter::LlmOutputToken, "15.000000"),
        price(BillingMeter::LlmCacheReadToken, "0.300000"),
        tiered_cache_write("cache_write_5m", "3.750000"),
        tiered_cache_write("cache_write_1h", "6.000000"),
    ]
}

/// 默认 TTL（5m）：缓存写入按 1.25× 输入价结算，不再折进输入按 1× 收。
#[tokio::test]
async fn anthropic_default_cache_write_uses_the_5m_rate() {
    let (mode, lines, commands) = settle(
        anthropic_rates(),
        None,
        json!({
            "input_tokens": 100,
            "cache_creation_input_tokens": 1000,
            "cache_read_input_tokens": 0,
            "output_tokens": 10
        }),
    )
    .await;
    assert_eq!(BillingMode::Composite, mode);
    assert_eq!(
        owned(&[
            ("llm_input_token", "100"),
            ("llm_cache_write_token", "1000"),
            ("llm_output_token", "10"),
        ]),
        lines,
        "cache writes must be their own line, not folded into input"
    );
    assert_eq!("0.000300000000", amount(&commands, "llm_input_token"));
    assert_eq!(
        "0.003750000000",
        amount(&commands, "llm_cache_write_token"),
        "5m cache write is 1.25x the input rate"
    );
    assert_eq!("0.000150000000", amount(&commands, "llm_output_token"));
}

/// 显式 `ttl: "1h"`：缓存写入按 2× 输入价结算。
#[tokio::test]
async fn anthropic_one_hour_cache_write_uses_the_1h_rate() {
    let (_, lines, commands) = settle(
        anthropic_rates(),
        Some("1h"),
        json!({
            "input_tokens": 100,
            "cache_creation_input_tokens": 1000,
            "cache_read_input_tokens": 0,
            "output_tokens": 10
        }),
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "100"),
            ("llm_cache_write_token", "1000"),
            ("llm_output_token", "10"),
        ]),
        lines
    );
    assert_eq!(
        "0.006000000000",
        amount(&commands, "llm_cache_write_token"),
        "1h cache write is 2x the input rate"
    );
}

/// 对照：缓存读取按缓存读价结算（Anthropic 该价无档位条件）。
#[tokio::test]
async fn anthropic_cache_reads_use_the_cache_read_rate() {
    let (_, lines, commands) = settle(
        anthropic_rates(),
        None,
        json!({
            "input_tokens": 100,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 500,
            "output_tokens": 10
        }),
    )
    .await;
    assert_eq!(
        owned(&[
            ("llm_input_token", "100"),
            ("llm_cache_read_token", "500"),
            ("llm_output_token", "10"),
        ]),
        lines
    );
    assert_eq!("0.000150000000", amount(&commands, "llm_cache_read_token"));
}

/// 对照：目录只给一条无条件缓存写入费率时，TTL 不参与选档。
#[tokio::test]
async fn an_unconditional_cache_write_rate_ignores_ttl() {
    let rates = vec![
        price(BillingMeter::LlmInputToken, "3.000000"),
        price(BillingMeter::LlmOutputToken, "15.000000"),
        price(BillingMeter::LlmCacheWriteToken, "3.750000"),
    ];
    let (_, _, commands) = settle(
        rates,
        Some("1h"),
        json!({
            "input_tokens": 100,
            "cache_creation_input_tokens": 1000,
            "cache_read_input_tokens": 0,
            "output_tokens": 10
        }),
    )
    .await;
    assert_eq!(
        "0.003750000000",
        amount(&commands, "llm_cache_write_token"),
        "an unconditional rate is the only price and must win regardless of TTL"
    );
}
