//! 异步任务完成后的计价/扣费回归。
//!
//! 创建调用只返回上游 id，用量在完成态才出现。`ReplayAsyncUsageSettler` 用创建期
//! 上下文（method/path/model/account group/plan）+ 完成快照重建调用，跑
//! preflight → extraction → finalization（按实测 token 重定 tier）→ settlement →
//! postpaid 扣费。这里验证最关键的三个性质：
//!
//! 1. 完成态 usage 被正确计价并作为**单笔后扣**落到 Token Bank；
//! 2. 结算请求号是任务幂等键（`async:<kind>:<upstream_id>`），重跑不会重复计费；
//! 3. 没有可计量用量的完成态**失败关闭**，不会静默把任务标成已结算。

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use chrono::Utc;
use sdkwork_cloudrouter_router_service::application::{AsyncUsageSettler, ReplayAsyncUsageSettler};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, AsyncUsageTask, AsyncUsageTaskKind, AsyncUsageTaskStatus, BillingMeter, DecimalValue,
    GatewayApiKey, ModelPrice, ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money,
    PriceSide, PricingPlan, PricingRateMetadata, PricingRateVariant, UpstreamAccountGroup,
    UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_cloudrouter_router_service::ports::{
    CustomerChargeMode, GatewayBillingAmount, GatewayBillingContext, GatewayBillingFuture,
    GatewayBillingSettlementMode, GatewayBillingStore, RechargeSettingsModel,
};
use serde_json::{json, Value};

const CATALOG_KEY: &str = "openai/gpt-4o";
const ACCOUNT_GROUP_ID: i64 = 10;
const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;

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

#[derive(Default)]
struct RecordingBillingStore {
    postpaid: Mutex<Vec<GatewayBillingAmount>>,
    settled_requests: Mutex<Vec<String>>,
}

impl RecordingBillingStore {
    fn postpaid(&self) -> Vec<GatewayBillingAmount> {
        self.postpaid.lock().expect("postpaid lock").clone()
    }

    fn settled_requests(&self) -> Vec<String> {
        self.settled_requests.lock().expect("settled lock").clone()
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
        Box::pin(async { Ok(CustomerChargeMode::Postpaid) })
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
        _amount: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, String> {
        Box::pin(async { Ok("unused-hold".to_owned()) })
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
        _amount: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
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
        self.postpaid.lock().expect("postpaid lock").push(actual);
        Box::pin(async { Ok(()) })
    }

    fn mark_usage_settled<'a>(
        &'a self,
        context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, ()> {
        self.settled_requests
            .lock()
            .expect("settled lock")
            .push(context.request_id);
        Box::pin(async { Ok(()) })
    }
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
        effective_from: chrono::DateTime::<Utc>::MIN_UTC,
        effective_to: None,
        rate_variant: PricingRateVariant::Standard,
        schedule: None,
        conditions: Vec::new(),
        tiers: Vec::new(),
        formula: None,
    }
}

/// $10 / 1M 输入、$30 / 1M 输出（`default_unit_size` 对 token 档为 1_000_000）。
fn catalog() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "openai",
    ));
    catalog.add_model(
        AiModel::new("gpt-4o", "GPT-4o", "openai", vec!["chat"]).with_catalog_key(CATALOG_KEY),
    );
    catalog.add_model_upstream_route(ModelUpstreamRoute::new_for_catalog_key(
        CATALOG_KEY,
        "gpt-4o",
        "openai",
        3001,
        "gpt-4o",
    ));
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
        GatewayApiKey::new(100, ACCOUNT_GROUP_ID, "sk-test", "hash:sk-test").with_owner(
            TENANT_ID,
            ORGANIZATION_ID,
            30,
        ),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openai", 3001).with_account_group_binding(
            ACCOUNT_GROUP_ID,
            100,
            100,
        ),
    );
    for (meter, price) in [
        (BillingMeter::LlmInputToken, "10.000000"),
        (BillingMeter::LlmOutputToken, "30.000000"),
    ] {
        let rate_hash = format!("hash-{meter:?}");
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                CATALOG_KEY,
                "gpt-4o",
                PriceSide::OfficialReference,
                meter,
                Money::usd(price).unwrap(),
            )
            .with_rate_metadata(rate_metadata(&rate_hash)),
        );
    }
    catalog
}

fn task() -> AsyncUsageTask {
    AsyncUsageTask {
        id: 1,
        uuid: "async-task-1".to_owned(),
        tenant_id: TENANT_ID,
        organization_id: ORGANIZATION_ID,
        user_id: Some(30),
        api_key_id: 100,
        request_id: "req-create".to_owned(),
        task_kind: AsyncUsageTaskKind::BackgroundResponse,
        upstream_id: "resp_1".to_owned(),
        catalog_key: Some(CATALOG_KEY.to_owned()),
        supplier_code: "openai".to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        task_status: AsyncUsageTaskStatus::Running,
        attempts: 1,
        next_poll_at: Utc::now(),
        billing_request_id: None,
        usage_snapshot: None,
        metadata: Some(json!({
            "method": "POST",
            "path": "/v1/responses",
            "model": "gpt-4o",
            "accountGroupId": ACCOUNT_GROUP_ID,
            "pricingPlanCode": "standard"
        })),
    }
}

fn completed_snapshot() -> Value {
    json!({
        "id": "resp_1",
        "object": "response",
        "status": "completed",
        "model": "gpt-4o",
        "usage": {
            "input_tokens": 100,
            "output_tokens": 50,
            "total_tokens": 150
        }
    })
}

/// 100 输入 token × $10/1M + 50 输出 token × $30/1M = $0.0025
/// ⇒ 0.0025 USD × 70 points/USD = 0.175 points = **175 000 micro**。
#[tokio::test]
async fn completed_background_response_is_charged_once_as_postpaid() {
    let catalog = Arc::new(catalog());
    let store = Arc::new(RecordingBillingStore::default());
    let settler = ReplayAsyncUsageSettler::new(Arc::clone(&catalog), store.clone());
    let task = task();

    settler
        .settle(&task, &completed_snapshot())
        .await
        .expect("settlement");

    let postpaid = store.postpaid();
    assert_eq!(1, postpaid.len(), "exactly one postpaid debit");
    assert_eq!("175000", postpaid[0].amount);
    assert_eq!("USD", postpaid[0].currency);
    assert_eq!(
        vec![task.billing_request_id()],
        store.settled_requests(),
        "the usage fact is marked with the task idempotency key"
    );
}

/// 重跑（worker 崩溃后的恢复路径）必须复用同一个 request id：账户与 usage 事实
/// 都按它幂等，因此重复结算只会被账户域复用，不会产生第二笔语义不同的扣费。
#[tokio::test]
async fn replaying_a_settlement_reuses_the_task_idempotency_key() {
    let catalog = Arc::new(catalog());
    let store = Arc::new(RecordingBillingStore::default());
    let settler = ReplayAsyncUsageSettler::new(Arc::clone(&catalog), store.clone());
    let task = task();

    settler
        .settle(&task, &completed_snapshot())
        .await
        .expect("first");
    settler
        .settle(&task, &completed_snapshot())
        .await
        .expect("replay");

    let settled = store.settled_requests();
    assert_eq!(2, settled.len());
    assert!(settled
        .iter()
        .all(|request| request == &task.billing_request_id()));
}

/// 完成态没有任何可计量用量：必须失败关闭，让 worker 重新调度/过期，而不是
/// 把任务标成 settled 却一分钱不收。
#[tokio::test]
async fn a_completion_without_usage_fails_closed() {
    let catalog = Arc::new(catalog());
    let store = Arc::new(RecordingBillingStore::default());
    let settler = ReplayAsyncUsageSettler::new(Arc::clone(&catalog), store.clone());

    let error = settler
        .settle(&task(), &json!({"id": "resp_1", "status": "completed"}))
        .await
        .expect_err("no usage must not settle");

    assert!(
        error.to_string().contains("no billable usage"),
        "unexpected error: {error}"
    );
    assert!(store.postpaid().is_empty());
    assert!(store.settled_requests().is_empty());
}
