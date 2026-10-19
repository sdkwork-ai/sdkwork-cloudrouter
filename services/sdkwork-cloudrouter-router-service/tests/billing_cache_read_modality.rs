//! 缓存读的**逐行模态**定价回归。
//!
//! OpenAI realtime / gpt-image 的 `llm_cache_read_token` 费率按 `media_type`
//! 分档（text / audio / image 价格不同），而缓存读行原先不带模态维度：
//!
//! ```text
//! 预检：三条候选都带 media_type 条件 ⇒ 全部被过滤 ⇒ 不出价
//! 抽取：见"缓存读无报价" ⇒ 把缓存命中并入输入行按全价收（0.1–0.25× 的折扣丢失）
//! ```
//!
//! 这是**多收客户**的方向。修法：
//!
//! * 预检用合成行逐个 `media_type` 试探，拿到任一可用价即阻止"折进输入"；
//! * 抽取按 `cached_tokens_details` 把缓存命中拆成 audio/image/video/text 多条行，
//!   每行带自己的 `pricing_media_type`；
//! * 结算按行取对应模态的费率。
//!
//! 用例：纯音频缓存、混合模态拆分、无明细按文本、无条件费率对照。

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
const VENDOR: &str = "openai";
const CATALOG_KEY: &str = "openai/gpt-realtime-2";
const MODEL: &str = "gpt-realtime-2";

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

fn media_rate(meter: BillingMeter, media_type: &str, usd_per_million: &str) -> ModelPrice {
    let metadata = PricingRateMetadata {
        record_identity: None,
        price_book_code: "models.openai.global.official".to_owned(),
        rate_hash: format!("hash-{}-{media_type}", meter.code()),
        product_code: "models.openai.chat".to_owned(),
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
            dimension_code: "media_type".to_owned(),
            operator_code: "eq".to_owned(),
            value: json!(media_type),
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

/// 文本输入 $4 / 产出 $24；缓存读按模态分档：text $0.4 / audio $8 / image $5。
fn modality_rates() -> Vec<ModelPrice> {
    vec![
        flat_rate(BillingMeter::LlmInputToken, "4.000000"),
        flat_rate(BillingMeter::LlmOutputToken, "24.000000"),
        media_rate(BillingMeter::LlmCacheReadToken, "text", "0.400000"),
        media_rate(BillingMeter::LlmCacheReadToken, "audio", "8.000000"),
        media_rate(BillingMeter::LlmCacheReadToken, "image", "5.000000"),
    ]
}

fn catalog(rates: Vec<ModelPrice>) -> InMemoryPricingCatalog {
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
            .with_request_id("req-cache-modality")
            .with_body(InvocationBody::json(json!({
                "model": MODEL,
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

async fn settle(
    rates: Vec<ModelPrice>,
    usage: Value,
) -> (
    BillingMode,
    Vec<(String, String)>,
    Vec<(String, String, String)>,
) {
    let catalog = Arc::new(catalog(rates));
    let mut invocation = declared_invocation().await;
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

fn amounts(commands: &[(String, String, String)], meter: &str) -> Vec<String> {
    let mut values = commands
        .iter()
        .filter(|(code, _, _)| code == meter)
        .map(|(_, _, amount)| amount.clone())
        .collect::<Vec<_>>();
    values.sort();
    values
}

/// 纯音频缓存命中：缓存读按 audio 档（$8）结算，不再折进输入按 $4 收。
#[tokio::test]
async fn audio_cache_hits_use_the_audio_cache_read_rate() {
    let (mode, lines, commands) = settle(
        modality_rates(),
        json!({
            "prompt_tokens": 2000,
            "completion_tokens": 10,
            "total_tokens": 2010,
            "prompt_tokens_details": {
                "audio_tokens": 1000,
                "cached_tokens": 1000,
                "cached_tokens_details": {"audio_tokens": 1000}
            }
        }),
    )
    .await;
    assert_eq!(BillingMode::Composite, mode);
    assert!(
        lines
            .iter()
            .any(|(meter, quantity)| meter == "llm_cache_read_token" && quantity == "1000"),
        "cache hits must stay on the cache-read meter, got {lines:?}"
    );
    assert_eq!(
        vec!["0.008000000000".to_owned()],
        amounts(&commands, "llm_cache_read_token"),
        "1000 cached audio tokens at $8/1M"
    );
    assert_eq!(
        vec!["0.004000000000".to_owned()],
        amounts(&commands, "llm_input_token")
    );
}

/// 混合模态：缓存命中拆成 audio 400 / image 200 / text 400，各自按模态价。
#[tokio::test]
async fn mixed_cache_hits_are_split_by_modality() {
    let (_, lines, commands) = settle(
        modality_rates(),
        json!({
            "prompt_tokens": 2000,
            "completion_tokens": 10,
            "total_tokens": 2010,
            "prompt_tokens_details": {
                "audio_tokens": 400,
                "image_tokens": 200,
                "cached_tokens": 1000,
                "cached_tokens_details": {"audio_tokens": 400, "image_tokens": 200}
            }
        }),
    )
    .await;
    let mut cache_quantities = lines
        .iter()
        .filter(|(meter, _)| meter == "llm_cache_read_token")
        .map(|(_, quantity)| quantity.as_str())
        .collect::<Vec<_>>();
    cache_quantities.sort();
    assert_eq!(
        vec!["200", "400", "400"],
        cache_quantities,
        "cache hits must split into one line per modality"
    );
    assert_eq!(
        vec![
            "0.000160000000".to_owned(),
            "0.001000000000".to_owned(),
            "0.003200000000".to_owned(),
        ],
        amounts(&commands, "llm_cache_read_token"),
        "audio 400×$8 + image 200×$5 + text 400×$0.4, sorted"
    );
}

/// 无模态明细：整条缓存读记为 text，按文本缓存价结算。
#[tokio::test]
async fn cache_hits_without_modality_details_use_the_text_rate() {
    let (_, _, commands) = settle(
        modality_rates(),
        json!({
            "prompt_tokens": 2000,
            "completion_tokens": 10,
            "total_tokens": 2010,
            "prompt_tokens_details": {"cached_tokens": 1000}
        }),
    )
    .await;
    assert_eq!(
        vec!["0.000400000000".to_owned()],
        amounts(&commands, "llm_cache_read_token"),
        "1000 cached text tokens at $0.4/1M"
    );
}

/// 对照：无条件缓存读费率照旧解析，模态探测不改变价格。
#[tokio::test]
async fn an_unconditional_cache_read_rate_still_resolves() {
    let rates = vec![
        flat_rate(BillingMeter::LlmInputToken, "4.000000"),
        flat_rate(BillingMeter::LlmOutputToken, "24.000000"),
        flat_rate(BillingMeter::LlmCacheReadToken, "0.400000"),
    ];
    let (_, _, commands) = settle(
        rates,
        json!({
            "prompt_tokens": 2000,
            "completion_tokens": 10,
            "total_tokens": 2010,
            "prompt_tokens_details": {"cached_tokens": 1000}
        }),
    )
    .await;
    assert_eq!(
        vec!["0.000400000000".to_owned()],
        amounts(&commands, "llm_cache_read_token")
    );
}
