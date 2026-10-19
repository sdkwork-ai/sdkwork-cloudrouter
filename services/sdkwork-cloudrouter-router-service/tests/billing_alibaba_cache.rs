//! Alibaba 缓存读的显式/隐式档位回归。
//!
//! 目录为 `qwen3.7-*` / `qwen3.8-*` 发布两条缓存读费率：
//!
//! | 档位 | 单价（示例） | 触发条件 |
//! | --- | --- | --- |
//! | `explicit_cache_read` | `$0.003`/1M | 请求用 `cache_control` 标记缓存断点 |
//! | `implicit_cache` | `$0.006`/1M | 未标记（供应商自动缓存） |
//!
//! 两档价格不同，而缓存读行原先不带 `tier_code`：预检不出价 ⇒ 抽取层把缓存
//! 命中**折进输入按全价收**（多收客户）。修法：
//!
//! * 请求体出现任意 `cache_control` 标记 ⇒ `explicit_cache_read`，否则
//!   `implicit_cache`；
//! * 只有一条缓存写入费率（`explicit_cache_write`）时由单档位规则注入；
//! * 只有一条缓存读费率时同样走单档位，不依赖显式/隐式判断。
//!
//! `cache_control` 不是本仓契约字段（`additionalProperties` 透传），但它是
//! Alibaba/Anthropic 显式缓存的行业标记；无标记即供应商默认的隐式缓存。

use axum::http::Method;
use chrono::{DateTime, Utc};
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, Invocation,
    InvocationAccount, InvocationBody, InvocationClassificationRequest, InvocationDispatch,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    OpenAiResourceClassifier, PricingFinalizationInterceptor, PricingPreflightInterceptor,
    PricingSettlementInterceptor, UsageExtractionInterceptor,
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
const VENDOR: &str = "alibaba";
const CATALOG_KEY: &str = "alibaba/qwen3.7-flash";
const MODEL: &str = "qwen3.7-flash";

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
        price_book_code: "models.alibaba.global.official".to_owned(),
        rate_hash: format!("hash-{}-{tier}", meter.code()),
        product_code: "models.alibaba.chat".to_owned(),
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

fn flat_rate(meter: BillingMeter, usd_per_million: &str) -> ModelPrice {
    ModelPrice::new_for_catalog_key(
        CATALOG_KEY,
        MODEL,
        PriceSide::OfficialReference,
        meter,
        Money::usd(usd_per_million).unwrap(),
    )
}

fn alibaba_rates() -> Vec<ModelPrice> {
    vec![
        flat_rate(BillingMeter::LlmInputToken, "0.500000"),
        flat_rate(BillingMeter::LlmOutputToken, "2.000000"),
        tier_rate(
            BillingMeter::LlmCacheReadToken,
            "explicit_cache_read",
            "0.003000",
        ),
        tier_rate(
            BillingMeter::LlmCacheReadToken,
            "implicit_cache",
            "0.006000",
        ),
        tier_rate(
            BillingMeter::LlmCacheWriteToken,
            "explicit_cache_write",
            "0.038000",
        ),
    ]
}

fn catalog(rates: Vec<ModelPrice>) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        VENDOR,
        ModelVendor::Alibaba,
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

/// `explicit = true` 时在文本块上带 `cache_control` 标记。
async fn declared_invocation(explicit: bool) -> Invocation {
    let content = if explicit {
        json!([{"type": "text", "text": "hi",
                "cache_control": {"type": "ephemeral"}}])
    } else {
        json!("hi")
    };
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
            .with_request_id("req-alibaba-cache")
            .with_body(InvocationBody::json(json!({
                "model": MODEL,
                "messages": [{"role": "user", "content": content}]
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
        base_url: Some("https://dashscope.example".to_owned()),
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
    explicit: bool,
    usage: Value,
) -> (BillingMode, Vec<(String, String, String)>) {
    let catalog = Arc::new(catalog(rates));
    let mut invocation = declared_invocation(explicit).await;
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
            "id": "chatcmpl-1",
            "object": "chat.completion",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": "ok"},
                         "finish_reason": "stop"}],
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
    (mode, commands)
}

fn amount(commands: &[(String, String, String)], meter: &str) -> String {
    commands
        .iter()
        .find(|(code, _, _)| code == meter)
        .unwrap_or_else(|| panic!("missing {meter} command: {commands:?}"))
        .2
        .clone()
}

fn cached_usage(cached: i64) -> Value {
    json!({
        "prompt_tokens": 2000,
        "completion_tokens": 10,
        "total_tokens": 2010,
        "prompt_tokens_details": {"cached_tokens": cached}
    })
}

/// 无 `cache_control`：供应商默认的隐式缓存，按 `implicit_cache`（$0.006）收。
#[tokio::test]
async fn an_unmarked_request_uses_the_implicit_cache_rate() {
    let (mode, commands) = settle(alibaba_rates(), false, cached_usage(1000)).await;
    assert_eq!(BillingMode::Composite, mode);
    assert_eq!(
        "0.000006000000",
        amount(&commands, "llm_cache_read_token"),
        "1000 cached tokens at the implicit rate $0.006/1M"
    );
    assert_eq!("0.000500000000", amount(&commands, "llm_input_token"));
}

/// 带 `cache_control`：显式缓存，按 `explicit_cache_read`（$0.003）收。
#[tokio::test]
async fn a_marked_request_uses_the_explicit_cache_rate() {
    let (_, commands) = settle(alibaba_rates(), true, cached_usage(1000)).await;
    assert_eq!(
        "0.000003000000",
        amount(&commands, "llm_cache_read_token"),
        "1000 cached tokens at the explicit rate $0.003/1M"
    );
}

/// 缓存写入：目录只有一条 `explicit_cache_write` 费率，单档位规则注入后按
/// $0.038 结算，不再折进输入按 1× 收。
#[tokio::test]
async fn the_single_cache_write_rate_is_applied() {
    let (_, commands) = settle(
        alibaba_rates(),
        false,
        json!({
            "prompt_tokens": 1000,
            "completion_tokens": 10,
            "total_tokens": 2010,
            "cache_creation_input_tokens": 1000,
            "prompt_tokens_details": {"cached_tokens": 0}
        }),
    )
    .await;
    assert_eq!(
        "0.000038000000",
        amount(&commands, "llm_cache_write_token"),
        "1000 cache-write tokens at $0.038/1M"
    );
}

/// 对照：目录只发布一条缓存读费率时，单档位规则注入，不依赖显式/隐式判断。
#[tokio::test]
async fn a_single_cache_read_rate_is_applied_without_a_mode_signal() {
    let rates = vec![
        flat_rate(BillingMeter::LlmInputToken, "0.500000"),
        flat_rate(BillingMeter::LlmOutputToken, "2.000000"),
        tier_rate(
            BillingMeter::LlmCacheReadToken,
            "implicit_cache",
            "0.006000",
        ),
    ];
    let (_, commands) = settle(rates, false, cached_usage(1000)).await;
    assert_eq!("0.000006000000", amount(&commands, "llm_cache_read_token"));
}
