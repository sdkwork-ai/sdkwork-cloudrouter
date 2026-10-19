//! Token Bank 扣费链路的**行为级**回归：预扣 → 结算 → 部分捕获 → 超额 →
//! 余额不足 → 失败释放 → 应收标记。
//!
//! 前面的计费测试锁的是"收多少钱"（`settlement_commands` 的金额）；这一层锁的是
//! "钱怎么从 Token Bank 出去"，也就是商业化最关键的那一段：
//!
//! ```text
//! BillingPolicy → 定价身份 → 预检 → 预扣(hold) → 响应 → 抽取 → 终审 → 结算 → 扣费
//! ```
//!
//! 每一档都用同一个录像桩记录账户侧动作，断言**冻结额/捕获额/超额/释放**与
//! 金额一致。这里刻意不 mock 定价：夹具走真实的 `InMemoryPricingCatalog`，
//! 这样"预扣估算"与"结算实收"都用同一套价格，避免两边各算一套。

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use axum::http::Method;
use chrono::{DateTime, Utc};
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingPolicyInterceptor, BillingSettlementInterceptor,
    BillingTransactionInterceptor, Invocation, InvocationAccount, InvocationBody,
    InvocationClassificationRequest, InvocationDispatch, InvocationError, InvocationErrorKind,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    OpenAiResourceClassifier, PricingFinalizationInterceptor, PricingPreflightInterceptor,
    PricingSettlementInterceptor, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, DomainError, GatewayApiKey, ModelPrice,
    ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    PricingRateMetadata, PricingRateVariant, ProviderAuthProfile, UpstreamAccountGroup,
    UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_cloudrouter_router_service::ports::{
    CustomerChargeMode, GatewayBillingAmount, GatewayBillingContext, GatewayBillingFuture,
    GatewayBillingSettlementMode, GatewayBillingStore, RechargeSettingsModel,
};
use serde_json::{json, Value};

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const API_KEY_ID: i64 = 100;
const ACCOUNT_GROUP_ID: i64 = 10;
const ACCOUNT_ID: i64 = 3001;
const VENDOR: &str = "openai";
const IMAGE_CATALOG_KEY: &str = "openai/gpt-image-2";
const VIDEO_CATALOG_KEY: &str = "openai/sora-2";
const CHAT_CATALOG_KEY: &str = "openai/gpt-4o";

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

/// 账户侧录像桩：只记录动作，不做余额判断（余额不足由用例显式注入）。
#[derive(Default)]
struct RecordingBillingStore {
    holds: Mutex<Vec<GatewayBillingAmount>>,
    settled: Mutex<Vec<GatewayBillingAmount>>,
    postpaid: Mutex<Vec<GatewayBillingAmount>>,
    released: Mutex<Vec<String>>,
    uncollected: Mutex<Vec<String>>,
    fail_precharge: bool,
    fail_postpaid: bool,
}

impl RecordingBillingStore {
    fn failing_precharge() -> Self {
        Self {
            fail_precharge: true,
            ..Self::default()
        }
    }

    fn failing_postpaid() -> Self {
        Self {
            fail_postpaid: true,
            ..Self::default()
        }
    }

    fn holds(&self) -> Vec<GatewayBillingAmount> {
        self.holds.lock().expect("holds lock").clone()
    }

    fn settled(&self) -> Vec<GatewayBillingAmount> {
        self.settled.lock().expect("settled lock").clone()
    }

    fn postpaid(&self) -> Vec<GatewayBillingAmount> {
        self.postpaid.lock().expect("postpaid lock").clone()
    }

    fn released(&self) -> Vec<String> {
        self.released.lock().expect("released lock").clone()
    }

    fn uncollected(&self) -> Vec<String> {
        self.uncollected.lock().expect("uncollected lock").clone()
    }
}

impl GatewayBillingStore for RecordingBillingStore {
    fn settlement_mode(&self) -> GatewayBillingSettlementMode {
        GatewayBillingSettlementMode::Synchronous
    }

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
        if self.fail_precharge {
            return Box::pin(async {
                Err(DomainError::insufficient_balance(
                    "insufficient available balance for hold",
                ))
            });
        }
        Box::pin(async { Ok("hold-flow".to_owned()) })
    }

    fn settle_hold<'a>(
        &'a self,
        _context: GatewayBillingContext,
        _hold_id: String,
        actual: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        self.settled.lock().expect("settled lock").push(actual);
        Box::pin(async { Ok(()) })
    }

    fn release_hold<'a>(
        &'a self,
        _context: GatewayBillingContext,
        hold_id: String,
    ) -> GatewayBillingFuture<'a, ()> {
        self.released.lock().expect("released lock").push(hold_id);
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
        actual: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        if self.fail_postpaid {
            return Box::pin(async {
                Err(DomainError::insufficient_balance(
                    "insufficient account balance",
                ))
            });
        }
        self.postpaid.lock().expect("postpaid lock").push(actual);
        Box::pin(async { Ok(()) })
    }

    fn mark_usage_uncollected<'a>(
        &'a self,
        _context: GatewayBillingContext,
        reason: String,
    ) -> GatewayBillingFuture<'a, ()> {
        self.uncollected
            .lock()
            .expect("uncollected lock")
            .push(reason);
        Box::pin(async { Ok(()) })
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

fn rate_metadata(rate_hash: &str) -> PricingRateMetadata {
    PricingRateMetadata {
        record_identity: None,
        price_book_code: "models.openai.global.official".to_owned(),
        rate_hash: rate_hash.to_owned(),
        product_code: "models.openai.model".to_owned(),
        operation_code: "model.invoke".to_owned(),
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
        conditions: Vec::new(),
        tiers: Vec::new(),
        formula: None,
    }
}

/// 目录夹具：一条图像模型（$1/张）、一条视频模型（$2/秒）、一条 chat 模型
/// （$10/1M 输入、$30/1M 输出）。价格刻意取整，便于把扣费额换算成可读数字。
fn catalog() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        VENDOR,
        ModelVendor::OpenAi,
        VENDOR,
    ));
    for (model, catalog_key, capability) in [
        ("gpt-image-2", IMAGE_CATALOG_KEY, "image"),
        ("sora-2", VIDEO_CATALOG_KEY, "video"),
        ("gpt-4o", CHAT_CATALOG_KEY, "chat"),
    ] {
        catalog.add_model(
            AiModel::new(model, model, VENDOR, vec![capability]).with_catalog_key(catalog_key),
        );
        catalog.add_model_upstream_route(ModelUpstreamRoute::new_for_catalog_key(
            catalog_key,
            model,
            VENDOR,
            ACCOUNT_ID,
            model,
        ));
    }
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
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new(VENDOR, ACCOUNT_ID).with_account_group_binding(
            ACCOUNT_GROUP_ID,
            100,
            100,
        ),
    );

    let price = |catalog_key: &str, model: &str, meter: BillingMeter, price: &str| {
        let rate_hash = format!("hash-{catalog_key}-{meter:?}");
        ModelPrice::new_for_catalog_key(
            catalog_key,
            model,
            PriceSide::OfficialReference,
            meter,
            Money::usd(price).unwrap(),
        )
        .with_rate_metadata(rate_metadata(&rate_hash))
    };
    catalog.add_price(price(
        IMAGE_CATALOG_KEY,
        "gpt-image-2",
        BillingMeter::ImageResult,
        "1.000000",
    ));
    catalog.add_price(price(
        VIDEO_CATALOG_KEY,
        "sora-2",
        BillingMeter::VideoOutputSecond,
        "2.000000",
    ));
    catalog.add_price(price(
        CHAT_CATALOG_KEY,
        "gpt-4o",
        BillingMeter::LlmInputToken,
        "10.000000",
    ));
    catalog.add_price(price(
        CHAT_CATALOG_KEY,
        "gpt-4o",
        BillingMeter::LlmOutputToken,
        "30.000000",
    ));
    catalog
}

/// 生产口径的分类 + 计费策略 + 定价身份，返回带账户的调用。
async fn invocation(method: Method, path: &str, body: Value, catalog_key: &str) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(method.clone(), path))
        .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model = Some(
        catalog_key
            .split_once('/')
            .map(|(_, model)| model.to_owned())
            .unwrap_or_else(|| catalog_key.to_owned()),
    );
    resource.requested_model_catalog_key = Some(catalog_key.to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(method, path)
            .with_request_id(format!("req-token-bank-{catalog_key}"))
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
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
}

/// 预扣 → 响应 → 抽取 → 终审 → 结算，返回结算后的调用与账户录像。
async fn run_flow(
    catalog: &Arc<InMemoryPricingCatalog>,
    store: Arc<RecordingBillingStore>,
    path: &str,
    body: Value,
    catalog_key: &str,
    status: u16,
    response: Value,
) -> (Invocation, Arc<RecordingBillingStore>) {
    let mut invocation = invocation(Method::POST, path, body, catalog_key).await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    PricingPreflightInterceptor::new(Arc::clone(catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
    BillingTransactionInterceptor::new(store.clone())
        .before(&mut invocation)
        .await
        .expect("precharge");
    invocation.dispatch = InvocationDispatch::json_response(status, response);
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");
    PricingFinalizationInterceptor::new(Arc::clone(catalog))
        .after(&mut invocation)
        .await
        .expect("pricing finalization");
    PricingSettlementInterceptor
        .after(&mut invocation)
        .await
        .expect("pricing settlement");
    BillingSettlementInterceptor::new(store.clone())
        .after(&mut invocation)
        .await
        .expect("billing settlement");
    (invocation, store)
}

fn micro(amount: &str) -> DecimalValue {
    DecimalValue::parse(amount).expect("decimal amount")
}

/// 1 张图 = $1 = 70 points = 70_000_000 micro。
#[tokio::test]
async fn image_generation_freezes_then_captures_exactly_one_price() {
    let catalog = Arc::new(catalog());
    let store = Arc::new(RecordingBillingStore::default());
    let (invocation, store) = run_flow(
        &catalog,
        store,
        "/v1/images/generations",
        json!({"model": "gpt-image-2", "prompt": "a cat", "n": 1}),
        IMAGE_CATALOG_KEY,
        200,
        json!({"created": 1, "data": [{"url": "a"}]}),
    )
    .await;

    assert_eq!(1, invocation.usage.settlement_commands.len());
    let holds = store.holds();
    assert_eq!(1, holds.len(), "exactly one prepaid hold");
    assert_eq!(micro("70000000"), micro(&holds[0].amount));
    let settled = store.settled();
    assert_eq!(1, settled.len(), "one atomic capture");
    assert_eq!(
        micro(&holds[0].amount),
        micro(&settled[0].amount),
        "fully reserved usage captures the same amount"
    );
    assert!(store.postpaid().is_empty(), "no overage for a covered hold");
    assert!(store.released().is_empty());
}

/// 请求 1 张、上游产出 2 张：冻结只够 1 张，差额必须走 postpaid 补齐。
#[tokio::test]
async fn produced_images_beyond_the_reservation_are_charged_as_overage() {
    let catalog = Arc::new(catalog());
    let store = Arc::new(RecordingBillingStore::default());
    let (_, store) = run_flow(
        &catalog,
        store,
        "/v1/images/generations",
        json!({"model": "gpt-image-2", "prompt": "a cat", "n": 1}),
        IMAGE_CATALOG_KEY,
        200,
        json!({"created": 1, "data": [{"url": "a"}, {"url": "b"}]}),
    )
    .await;

    let settled = store.settled();
    let postpaid = store.postpaid();
    assert_eq!(
        1,
        settled.len(),
        "the hold is captured only up to its amount"
    );
    assert_eq!(1, postpaid.len(), "the difference is a second debit");
    assert_eq!(micro("70000000"), micro(&settled[0].amount));
    assert_eq!(micro("70000000"), micro(&postpaid[0].amount));
}

/// 预扣时就余额不足：调用在派发前失败，并且错误类型必须是可自愈的 402 类
/// （`InsufficientBalance`），不能退化成上游故障。
#[tokio::test]
async fn insufficient_balance_at_precharge_maps_to_the_payment_required_kind() {
    let catalog = Arc::new(catalog());
    let store = Arc::new(RecordingBillingStore::failing_precharge());
    let mut invocation = invocation(
        Method::POST,
        "/v1/chat/completions",
        json!({"model": "gpt-4o", "messages": [{"role": "user", "content": "hi"}]}),
        CHAT_CATALOG_KEY,
    )
    .await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");

    let error = BillingTransactionInterceptor::new(store.clone())
        .before(&mut invocation)
        .await
        .expect_err("an unfunded wallet must not be dispatched");

    assert_eq!(InvocationErrorKind::InsufficientBalance, error.kind);
    assert!(
        !store.holds().is_empty(),
        "the attempted hold is what reports the shortfall"
    );
    assert!(store.settled().is_empty());
    assert!(store.postpaid().is_empty());
}

/// 上游失败：冻结额原样释放，不写任何消费流水，也不产生超额扣费。
#[tokio::test]
async fn failed_provider_response_releases_the_hold_without_a_ledger_entry() {
    let catalog = Arc::new(catalog());
    let store = Arc::new(RecordingBillingStore::default());
    let mut invocation = invocation(
        Method::POST,
        "/v1/images/generations",
        json!({"model": "gpt-image-2", "prompt": "a cat", "n": 1}),
        IMAGE_CATALOG_KEY,
    )
    .await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
    let interceptor = BillingTransactionInterceptor::new(store.clone());
    interceptor
        .before(&mut invocation)
        .await
        .expect("precharge");
    assert_eq!(1, store.holds().len());

    invocation.dispatch = InvocationDispatch::json_response(500, json!({"error": "upstream"}));
    interceptor
        .on_error(
            &mut invocation,
            &InvocationError::new(InvocationErrorKind::Dispatch, "upstream failed"),
        )
        .await
        .expect("release");

    assert_eq!(vec!["hold-flow".to_owned()], store.released());
    assert!(
        store.settled().is_empty(),
        "no consumption debit on failure"
    );
    assert!(store.postpaid().is_empty());
}

/// hold 已捕获、差额扣费失败：usage 事实必须被标成应收，而不是留给 worker
/// 当成"已结算"（该结论由 `gateway_billing_contract` 的源码锁与
/// `mark_usage_uncollected` 的 SQL 契约共同保证，这里验证拦截器确实调用它）。
#[tokio::test]
async fn overage_debit_failure_records_an_uncollected_receivable() {
    let catalog = Arc::new(catalog());
    let store = Arc::new(RecordingBillingStore::failing_postpaid());
    let mut invocation = invocation(
        Method::POST,
        "/v1/images/generations",
        json!({"model": "gpt-image-2", "prompt": "a cat", "n": 1}),
        IMAGE_CATALOG_KEY,
    )
    .await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
    BillingTransactionInterceptor::new(store.clone())
        .before(&mut invocation)
        .await
        .expect("precharge");
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"created": 1, "data": [{"url": "a"}, {"url": "b"}]}),
    );
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");
    PricingFinalizationInterceptor::new(Arc::clone(&catalog))
        .after(&mut invocation)
        .await
        .expect("pricing finalization");
    PricingSettlementInterceptor
        .after(&mut invocation)
        .await
        .expect("pricing settlement");

    let error = BillingSettlementInterceptor::new(store.clone())
        .after(&mut invocation)
        .await
        .expect_err("the overage cannot be collected");

    assert!(!store.settled().is_empty(), "the hold part was captured");
    let uncollected = store.uncollected();
    assert_eq!(1, uncollected.len(), "the shortfall becomes a receivable");
    assert!(
        uncollected[0].contains("overage debit failed"),
        "unexpected receivable reason: {}",
        uncollected[0]
    );
    assert_eq!(InvocationErrorKind::Pricing, error.kind);
}
