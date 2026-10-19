//! 预扣（precharge）估算回归：**请求声明的数量**必须进冻结金额。
//!
//! 前两个回归层钉的是"结算时按什么计量、量是多少"。商业化还有第三层：
//! **派发前冻结多少**。预扣发生在响应之前，拿不到 `usage`，只能用请求体
//! 做下界估计。
//!
//! 历史缺陷：只有 token 类有估计逻辑（`max_tokens × n`），其余计量一律
//! 落到 `_ => 1`——于是"余额只够 1 秒"的账号可以成功下单 20 秒视频、
//! 200 字的 TTS、4 张图，超额消费在结算环节才暴露（甚至收不回来）。
//!
//! 这里对每个时长/字符/张数家族断言：**冻结金额 == 请求声明量 × 单价**。
//! 顺便钉住"分钟档不向上取整"——12 秒若取整成 1 分钟会多冻结 5 倍余额。

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor,
    BillingQuantitySource, BillingTransactionInterceptor, Invocation, InvocationAccount,
    InvocationBody, InvocationClassificationRequest, InvocationInterceptor, InvocationPricingQuote,
    InvocationRequest, InvocationResourceClassifier, InvocationSubject, OpenAiResourceClassifier,
    PriceResolutionStatus, PricingAuditSnapshot, ProviderNativeResourceClassifier,
    ResourceBillability,
};
use sdkwork_cloudrouter_router_service::domain::{
    BillingMeter, DecimalValue, Money, ProviderAuthProfile, ResourceDefinition,
};
use sdkwork_cloudrouter_router_service::ports::{
    CustomerChargeMode, GatewayBillingAmount, GatewayBillingContext, GatewayBillingFuture,
    GatewayBillingSettlementMode, GatewayBillingStore, RechargeSettingsModel,
};
use serde_json::{json, Value};

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const API_KEY_ID: i64 = 100;
const ACCOUNT_GROUP_ID: i64 = 10;

/// 1 CNY = 10 points，1 USD = 7 CNY ⇒ **1 USD = 70 points = 70_000_000 micro**。
fn exchange_settings() -> RechargeSettingsModel {
    RechargeSettingsModel {
        base_currency_code: "CNY".to_owned(),
        base_points_per_cny: "10".to_owned(),
        currency_to_cny_rates: BTreeMap::from([
            ("CNY".to_owned(), "1".to_owned()),
            ("USD".to_owned(), "7".to_owned()),
        ]),
    }
}

/// 记账用的计数桩：只捕获被冻结的金额，其余操作一律成功。
#[derive(Default)]
struct RecordingBillingStore {
    holds: Mutex<Vec<GatewayBillingAmount>>,
}

impl RecordingBillingStore {
    fn reserved(&self) -> Vec<GatewayBillingAmount> {
        self.holds.lock().expect("holds lock").clone()
    }
}

impl GatewayBillingStore for RecordingBillingStore {
    fn customer_charge_mode<'a>(
        &'a self,
        _context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, CustomerChargeMode> {
        Box::pin(async { Ok(CustomerChargeMode::PrepaidAdjustment) })
    }

    fn load_cash_to_points_settings<'a>(
        &'a self,
        _context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, RechargeSettingsModel> {
        Box::pin(async { Ok(exchange_settings()) })
    }

    fn precharge_hold<'a>(
        &'a self,
        _context: GatewayBillingContext,
        amount: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, String> {
        self.holds.lock().expect("holds lock").push(amount);
        Box::pin(async { Ok("hold-test".to_owned()) })
    }

    fn settle_hold<'a>(
        &'a self,
        _context: GatewayBillingContext,
        _hold_id: String,
        _actual: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }

    fn release_hold<'a>(
        &'a self,
        _context: GatewayBillingContext,
        _hold_id: String,
    ) -> GatewayBillingFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }

    fn precharge<'a>(
        &'a self,
        _context: GatewayBillingContext,
        amount: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        self.holds.lock().expect("holds lock").push(amount);
        Box::pin(async { Ok(()) })
    }

    fn refund<'a>(
        &'a self,
        _context: GatewayBillingContext,
        _reserved: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }

    fn charge_postpaid<'a>(
        &'a self,
        _context: GatewayBillingContext,
        _actual: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }

    fn settlement_mode(&self) -> GatewayBillingSettlementMode {
        GatewayBillingSettlementMode::Synchronous
    }
}

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

fn vendor_prefix(path: &str) -> Option<(&str, String)> {
    let (head, tail) = path.trim_start_matches('/').split_once('/')?;
    if head == "v1" || head.starts_with("v1beta") {
        return None;
    }
    Some((head, format!("/{tail}")))
}

/// 报价夹具：`unit_size` 恒为 1，单价 1 USD／单位 ⇒ **冻结金额（micro 点）
/// == 数量 × 70_000_000**，把"数量口径"直接换算成可读的金额断言。
fn quote_for(meter: BillingMeter) -> InvocationPricingQuote {
    quote_for_usd(meter, "1.000000")
}

fn quote_for_usd(meter: BillingMeter, usd: &str) -> InvocationPricingQuote {
    let price = Money::usd(usd).expect("valid test price");
    InvocationPricingQuote {
        catalog_key: "provider/api".to_owned(),
        requested_model: "provider-api".to_owned(),
        supplier_code: Some("provider".to_owned()),
        account_id: Some(100),
        region_code: "global".to_owned(),
        meter: meter.clone(),
        unit_size: "1".to_owned(),
        official_reference_unit_price: price.clone(),
        raw_upstream_cost_unit_price: Some(price.clone()),
        procurement_cost_unit_price: Some(price.clone()),
        account_contract_cost_multiplier: Some("1.000000".to_owned()),
        account_group_cost_multiplier: Some("1.000000".to_owned()),
        procurement_cost_multiplier: Some("1.000000".to_owned()),
        customer_charge_before_sale_multiplier: price.clone(),
        customer_charge_unit_price: price,
        sale_multiplier: "1.000000".to_owned(),
        reference_multiplier: "1.000000".to_owned(),
        pricing_plan_code: "standard".to_owned(),
        group_code: "standard-group".to_owned(),
        rate_metadata: None,
        billing: None,
        pricing_audit_snapshot: PricingAuditSnapshot {
            resource: ResourceDefinition::new(
                "provider/api",
                BillingMeter::ApiRequest,
                chrono::Utc::now(),
            ),
            status: PriceResolutionStatus::Quoted,
            billability: ResourceBillability::Chargeable,
            rate_identity: None,
            strategy: None,
            failure: None,
        },
    }
}

async fn invocation_with_quote(
    method: Method,
    path: &str,
    body: Value,
    meter: BillingMeter,
) -> Invocation {
    invocation_with_quotes(method, path, body, vec![quote_for(meter)]).await
}

async fn invocation_with_quotes(
    method: Method,
    path: &str,
    body: Value,
    quotes: Vec<InvocationPricingQuote>,
) -> Invocation {
    let classification = if path == "/v1" || path.starts_with("/v1/") {
        OpenAiResourceClassifier
            .classify(&InvocationClassificationRequest::new(method.clone(), path))
    } else {
        let (vendor, rest) = vendor_prefix(path).expect("vendor-prefixed path");
        ProviderNativeResourceClassifier.classify(
            &InvocationClassificationRequest::new(method.clone(), rest).with_supplier_code(vendor),
        )
    }
    .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let supplier_code = resource
        .supplier_code
        .clone()
        .unwrap_or_else(|| "provider".to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id("precharge-estimate")
            .with_body(InvocationBody::json(body)),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code,
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://vendor.example".to_owned()),
        secret_ref: Some("vault://vendor/credential".to_owned()),
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: None,
        // 预付账号 ⇒ 强制预扣分支。
        billing_mode: AccountBillingMode::Prepay,
        account_group_id: Some(ACCOUNT_GROUP_ID),
        account_group_code: Some("standard-group".to_owned()),
        pricing_plan_code: Some("standard".to_owned()),
    });
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    assert!(
        invocation.billing.settlement_required,
        "{} must be billable for a precharge test",
        invocation.resource.api_code
    );
    for quote in quotes {
        invocation.usage.add_pricing_quote(quote);
    }
    invocation
}

/// 跑一次预扣，返回冻结的金额（Token Bank micro 点）。
async fn reserved_amount(invocation: &mut Invocation) -> String {
    let store = Arc::new(RecordingBillingStore::default());
    BillingTransactionInterceptor::new(store.clone())
        .before(invocation)
        .await
        .expect("precharge");
    let holds = store.reserved();
    assert_eq!(1, holds.len(), "expected exactly one hold, got {holds:?}");
    holds[0].amount.clone()
}

/// 1 USD／单位 ⇒ 每单位 70 points = 70_000_000 micro。断言冻结金额等于
/// 「数量 × 70_000_000」，用 `DecimalValue` 比较以免受 `to_fixed_string`
/// 的尾随 `.0` 影响。
fn assert_micro(quantity: &str, actual: &str) {
    let expected = DecimalValue::parse(quantity)
        .expect("decimal quantity")
        .multiply_i64(70_000_000)
        .expect("within range");
    let actual = DecimalValue::parse(actual.trim()).expect("decimal amount");
    assert_eq!(expected, actual, "expected {quantity} units reserved");
}

#[tokio::test]
async fn video_bills_the_requested_seconds_up_front() {
    // OpenAI 视频接口把时长写成字符串枚举 `"seconds": "20"`。
    let mut invocation = invocation_with_quote(
        Method::POST,
        "/v1/videos",
        json!({"model": "sora-2", "prompt": "a cat", "seconds": "20"}),
        BillingMeter::VideoOutputSecond,
    )
    .await;
    assert_micro("20", &reserved_amount(&mut invocation).await);
}

#[tokio::test]
async fn video_bills_the_numeric_vendor_duration_up_front() {
    // 供应商原生视频接口把时长写成数字 `duration`。
    let mut invocation = invocation_with_quote(
        Method::POST,
        "/kling/v1/videos/text2video",
        json!({"model_name": "kling-v2", "prompt": "a cat", "duration": "10"}),
        BillingMeter::VideoOutputSecond,
    )
    .await;
    assert_micro("10", &reserved_amount(&mut invocation).await);
}

#[tokio::test]
async fn speech_synthesis_bills_the_requested_characters_up_front() {
    let text = "深".repeat(200);
    let mut invocation = invocation_with_quote(
        Method::POST,
        "/v1/audio/speech",
        json!({"model": "tts-1", "input": text, "voice": "alloy"}),
        BillingMeter::TtsInputCharacter,
    )
    .await;
    assert_micro("200", &reserved_amount(&mut invocation).await);
}

#[tokio::test]
async fn speech_synthesis_bills_the_ark_nested_input_up_front() {
    // Ark 把待合成文本包在对象里：`{"input": {"text": ...}}`。
    let text = "音".repeat(120);
    let mut invocation = invocation_with_quote(
        Method::POST,
        "/v1/audio/speech",
        json!({"model": "doubao-tts", "input": {"text": text}}),
        BillingMeter::TtsInputCharacter,
    )
    .await;
    assert_micro("120", &reserved_amount(&mut invocation).await);
}

#[tokio::test]
async fn audio_minutes_keep_the_fraction_instead_of_rounding_up() {
    // 12 秒 = 0.2 分钟。若向上取整成 1 分钟，会多冻结 5 倍余额。
    let mut invocation = invocation_with_quote(
        Method::POST,
        "/elevenlabs/v1/sound-generation",
        json!({"text": "rain", "duration_seconds": 12}),
        BillingMeter::AudioOutputMinute,
    )
    .await;
    assert_micro("0.2", &reserved_amount(&mut invocation).await);
}

#[tokio::test]
async fn music_bills_millisecond_declarations_as_seconds_up_front() {
    // MiniMax 的请求时长是毫秒：30000 ms = 30 秒。
    let mut invocation = invocation_with_quote(
        Method::POST,
        "/minimax/v1/music_generation",
        json!({"model": "music-01", "lyrics": "...", "music_duration": 30000}),
        BillingMeter::MusicOutputSecond,
    )
    .await;
    assert_micro("30", &reserved_amount(&mut invocation).await);
}

#[tokio::test]
async fn image_requests_bill_every_requested_variant_up_front() {
    let mut invocation = invocation_with_quote(
        Method::POST,
        "/v1/images/generations",
        json!({"model": "gpt-image-2", "prompt": "a cat", "n": 4}),
        BillingMeter::ImageResult,
    )
    .await;
    assert_micro("4", &reserved_amount(&mut invocation).await);
}

#[tokio::test]
async fn requests_without_a_declared_quantity_still_freeze_one_unit() {
    // 控制组：请求里读不到数量时行为不变（1 个单位），避免过度冻结。
    let mut invocation = invocation_with_quote(
        Method::POST,
        "/v1/chat/completions",
        json!({"model": "gpt-4o", "messages": [{"role": "user", "content": "hi"}]}),
        BillingMeter::ApiRequest,
    )
    .await;
    assert_micro("1", &reserved_amount(&mut invocation).await);
}

#[tokio::test]
async fn token_requests_keep_the_max_tokens_upper_bound() {
    // token 类的下界仍是 `max_tokens × n`：1000 输入 token 的上界算法不变。
    let mut invocation = invocation_with_quote(
        Method::POST,
        "/v1/chat/completions",
        json!({"model": "gpt-4o", "max_tokens": 64, "messages": [{"role": "user", "content": "hi"}]}),
        BillingMeter::LlmOutputToken,
    )
    .await;
    assert_micro("64", &reserved_amount(&mut invocation).await);
}

/// 关键设计点：视频秒的**结算量**来自响应（`ResponseBody`），但预扣发生在
/// 响应之前，必须只看请求也能定下界。预扣不得依赖 `quantity_source` 的声明。
#[tokio::test]
async fn precharge_reads_the_request_even_when_settlement_measures_the_response() {
    let mut invocation = invocation_with_quote(
        Method::POST,
        "/v1/videos",
        json!({"model": "sora-2", "prompt": "a cat", "seconds": "8"}),
        BillingMeter::VideoOutputSecond,
    )
    .await;
    assert_eq!(
        BillingQuantitySource::ResponseBody,
        invocation.billing.quantity_source,
        "视频秒的结算量确实取自响应"
    );
    assert_eq!(
        BillingMode::VideoSecond,
        invocation.billing.mode,
        "视频按秒计费"
    );
    assert_micro("8", &reserved_amount(&mut invocation).await);
}

/// 同一批 prompt token 的 input / cache-read / cache-write 三档互斥，不能相加。
/// 三档都出现时冻结额应等于其中**最高价**那一档（这里 input $10 最高），
/// 与只有 input+output 的基线完全一致。
#[tokio::test]
async fn input_and_cache_rates_share_one_precharge_pool() {
    let chat = json!({
        "model": "claude-opus-5",
        "max_tokens": 64,
        "messages": [{"role": "user", "content": "hi"}]
    });
    let baseline = reserved_for_quotes(
        Method::POST,
        "/v1/chat/completions",
        chat.clone(),
        vec![
            quote_for_usd(BillingMeter::LlmInputToken, "10.000000"),
            quote_for_usd(BillingMeter::LlmOutputToken, "15.000000"),
        ],
    )
    .await;
    let with_cache = reserved_for_quotes(
        Method::POST,
        "/v1/chat/completions",
        chat,
        vec![
            quote_for_usd(BillingMeter::LlmInputToken, "10.000000"),
            quote_for_usd(BillingMeter::LlmOutputToken, "15.000000"),
            quote_for_usd(BillingMeter::LlmCacheReadToken, "0.500000"),
            quote_for_usd(BillingMeter::LlmCacheWriteToken, "2.000000"),
        ],
    )
    .await;
    assert_same_amount(
        &baseline,
        &with_cache,
        "cache rates cheaper than input must not inflate the input-side hold",
    );
}

/// 缓存写入比输入贵时（Anthropic 1h = 2×），输入侧按缓存写入价冻结。
/// 三档同时存在的结果必须等于"只报缓存写入 + 输出"的结果——取最高价，不求和。
#[tokio::test]
async fn a_cache_write_premium_becomes_the_input_pool_ceiling() {
    let chat = json!({
        "model": "claude-opus-5",
        "max_tokens": 64,
        "messages": [{"role": "user", "content": "hi"}]
    });
    let output = quote_for_usd(BillingMeter::LlmOutputToken, "15.000000");
    let all = reserved_for_quotes(
        Method::POST,
        "/v1/chat/completions",
        chat.clone(),
        vec![
            quote_for_usd(BillingMeter::LlmInputToken, "10.000000"),
            output.clone(),
            quote_for_usd(BillingMeter::LlmCacheWriteToken, "20.000000"),
        ],
    )
    .await;
    let only_premium = reserved_for_quotes(
        Method::POST,
        "/v1/chat/completions",
        chat,
        vec![
            quote_for_usd(BillingMeter::LlmCacheWriteToken, "20.000000"),
            output,
        ],
    )
    .await;
    assert_same_amount(
        &only_premium,
        &all,
        "the premium cache-write rate is the input-side ceiling",
    );
}

async fn reserved_for_quotes(
    method: Method,
    path: &str,
    body: Value,
    quotes: Vec<InvocationPricingQuote>,
) -> String {
    let mut invocation = invocation_with_quotes(method, path, body, quotes).await;
    reserved_amount(&mut invocation).await
}

fn assert_same_amount(expected: &str, actual: &str, message: &str) {
    let expected = DecimalValue::parse(expected.trim()).expect("decimal amount");
    let actual = DecimalValue::parse(actual.trim()).expect("decimal amount");
    assert_eq!(
        expected, actual,
        "{message}: expected {expected:?}, got {actual:?}"
    );
}
