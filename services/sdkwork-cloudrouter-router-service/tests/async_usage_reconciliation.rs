//! 异步对账的**纵向集成**回归：入队 → 领取 → 轮询 → 重新定价 → 扣费 → 终结。
//!
//! 前面各层分别锁了入队、状态机、传输与结算；这一条把四个真实组件装在一起跑一遍，
//! 只把 HTTP（transport）替换成假实现，证明"创建成功之后一定会被定价并扣费，
//! 且只扣一次"这条商业化主链在接口层面是通的。

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

use axum::http::Method;
use chrono::{Duration, Utc};
use sdkwork_cloudrouter_router_service::application::{
    AsyncUsagePoll, AsyncUsagePollFuture, AsyncUsageRegistrationInterceptor,
    AsyncUsageTaskExecutor, AsyncUsageTaskWorker, BillingPolicyInterceptor, Invocation,
    InvocationAccount, InvocationBilling, InvocationBody, InvocationClassificationRequest,
    InvocationDispatch, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, OpenAiResourceClassifier, ProviderAsyncUsageExecutor,
    ReplayAsyncUsageSettler,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, AsyncUsageTask, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice,
    ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    PricingRateMetadata, PricingRateVariant, ProviderAuthProfile, UpstreamAccountGroup,
    UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::{
    InMemoryAsyncUsageTaskStore, InMemoryPricingCatalog,
};
use sdkwork_cloudrouter_router_service::ports::{
    AsyncPollFuture, AsyncPollRequest, AsyncPollResponse, AsyncUsagePollTransport,
    CustomerChargeMode, GatewayBillingAmount, GatewayBillingContext, GatewayBillingFuture,
    GatewayBillingSettlementMode, GatewayBillingStore, RechargeSettingsModel,
};
use serde_json::json;

const CATALOG_KEY: &str = "openai/gpt-4o";
const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const ACCOUNT_GROUP_ID: i64 = 10;

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
        self.postpaid.lock().expect("postpaid").push(actual);
        Box::pin(async { Ok(()) })
    }

    fn mark_usage_settled<'a>(
        &'a self,
        context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, ()> {
        self.settled_requests
            .lock()
            .expect("settled")
            .push(context.request_id);
        Box::pin(async { Ok(()) })
    }
}

struct CompletedExecutor;

impl AsyncUsageTaskExecutor for CompletedExecutor {
    fn poll<'a>(&'a self, _task: &'a AsyncUsageTask) -> AsyncUsagePollFuture<'a> {
        Box::pin(async {
            Ok(AsyncUsagePoll::Completed {
                usage_snapshot: json!({
                    "id": "resp_1",
                    "object": "response",
                    "status": "completed",
                    "model": "gpt-4o",
                    "usage": {"input_tokens": 100, "output_tokens": 50, "total_tokens": 150}
                }),
                billing_request_id: "async:background_response:resp_1".to_owned(),
            })
        })
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

fn catalog() -> Arc<InMemoryPricingCatalog> {
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
    Arc::new(catalog)
}

/// The creation request as the gateway sees it: a background Responses call.
fn creation_invocation() -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(
            Method::POST,
            "/v1/responses",
        ))
        .expect("classification");
    let (mut resource, mut billing, routing) = classification.into_parts();
    resource.requested_model = Some("gpt-4o".to_owned());
    resource.requested_model_catalog_key = Some(CATALOG_KEY.to_owned());
    billing = InvocationBilling::composite(BillingMeter::LlmInputToken);
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/responses")
            .with_request_id("req-async-create")
            .with_body(InvocationBody::json(
                json!({"model": "gpt-4o", "background": true, "input": "hi"}),
            )),
        InvocationSubject {
            auth_type:
                sdkwork_cloudrouter_router_service::application::InvocationAuthType::GatewayApiKey,
            api_key_id: Some(100),
            api_key_name_snapshot: Some("test".to_owned()),
            tenant_id: TENANT_ID,
            organization_id: ORGANIZATION_ID,
            user_id: 30,
            billing_organization_id: 0,
            billing_owner: Default::default(),
            account_group_id: Some(ACCOUNT_GROUP_ID),
            account_group_code: Some("standard-group".to_owned()),
            pricing_plan_code: Some("standard".to_owned()),
            roles: Vec::new(),
            scopes: Vec::new(),
        },
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: "openai".to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://api.openai.example".to_owned()),
        secret_ref: None,
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: None,
        billing_mode: sdkwork_cloudrouter_router_service::application::AccountBillingMode::Prepay,
        account_group_id: Some(ACCOUNT_GROUP_ID),
        account_group_code: Some("standard-group".to_owned()),
        pricing_plan_code: Some("standard".to_owned()),
    });
    invocation
}

#[tokio::test]
async fn a_background_response_is_enqueued_polled_priced_and_charged_once() {
    let catalog = catalog();
    let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
    let billing = Arc::new(RecordingBillingStore::default());

    // 1. Creation succeeds upstream and the registration interceptor enqueues
    //    a reconciliation task with the pollable path.
    let mut invocation = creation_invocation();
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation.dispatch = InvocationDispatch::json_response(200, json!({"id": "resp_1"}));
    AsyncUsageRegistrationInterceptor::new(store.clone())
        .after(&mut invocation)
        .await
        .expect("registration");

    // 2. The worker claims it, polls the (fake) upstream, re-prices the
    //    completed usage and charges it once.
    let settler = Arc::new(ReplayAsyncUsageSettler::new(
        Arc::clone(&catalog),
        billing.clone(),
    ));
    let worker = AsyncUsageTaskWorker::new(
        store.clone(),
        Arc::new(CompletedExecutor),
        Duration::seconds(30),
        Duration::seconds(5),
        5,
    )
    .with_settler(settler);
    let now = Utc::now() + Duration::seconds(1);
    assert_eq!(1, worker.run_once(now, 10).await.expect("worker pass"));

    // 100 input × $10/1M + 50 output × $30/1M = $0.0025
    // ⇒ 0.175 points = 175 000 micro, charged once as postpaid.
    let postpaid = billing.postpaid.lock().expect("postpaid").clone();
    assert_eq!(1, postpaid.len(), "exactly one charge");
    assert_eq!("175000", postpaid[0].amount);
    assert_eq!("USD", postpaid[0].currency);

    let settled = billing.settled_requests.lock().expect("settled").clone();
    assert_eq!(
        vec!["async:background_response:resp_1".to_owned()],
        settled,
        "the usage fact is marked with the task idempotency key"
    );

    // 3. The task is terminal: a second pass cannot charge it again.
    let second = worker
        .run_once(now + Duration::seconds(120), 10)
        .await
        .expect("second pass");
    assert_eq!(0, second, "settled tasks are not claimed again");
    assert_eq!(1, billing.postpaid.lock().expect("postpaid").len());
}
struct BatchTransport {
    responses: Mutex<Vec<AsyncPollResponse>>,
    paths: Mutex<Vec<String>>,
}

impl BatchTransport {
    fn new(responses: Vec<AsyncPollResponse>) -> Self {
        Self {
            responses: Mutex::new(responses),
            paths: Mutex::new(Vec::new()),
        }
    }
}

impl AsyncUsagePollTransport for BatchTransport {
    fn get(&self, request: AsyncPollRequest) -> AsyncPollFuture<'_> {
        self.paths.lock().expect("paths").push(request.path);
        let response = self.responses.lock().expect("responses").remove(0);
        Box::pin(async move { Ok(response) })
    }
}

fn batch_creation_invocation() -> Invocation {
    let mut invocation = creation_invocation();
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(
            Method::POST,
            "/v1/batches",
        ))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    invocation.request = InvocationRequest::new(Method::POST, "/v1/batches")
        .with_request_id("req-batch-create")
        .with_body(InvocationBody::json(json!({
            "input_file_id": "file_in",
            "endpoint": "/v1/chat/completions",
            "completion_window": "24h"
        })));
    invocation.resource = resource;
    invocation.billing = billing;
    invocation.routing = routing;
    invocation
}

/// 批处理的完整链路：创建入队 → 轮询到 completed → 下载结果文件 → 按
/// `(model, endpoint)` 逐行定价 → 每行一笔后扣。
#[tokio::test]
async fn a_batch_is_enqueued_polled_downloaded_and_charged_per_row() {
    let catalog = catalog();
    let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
    let billing = Arc::new(RecordingBillingStore::default());

    let mut invocation = batch_creation_invocation();
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation.dispatch = InvocationDispatch::json_response(200, json!({"id": "batch_1"}));
    AsyncUsageRegistrationInterceptor::new(store.clone())
        .after(&mut invocation)
        .await
        .expect("registration");

    let jsonl = br#"{"custom_id":"a","response":{"status_code":200,"body":{"model":"gpt-4o","object":"chat.completion","usage":{"prompt_tokens":100,"completion_tokens":50}}},"error":null}
{"custom_id":"b","response":{"status_code":200,"body":{"model":"gpt-4o","object":"response","usage":{"input_tokens":200,"output_tokens":100}}},"error":null}
"#;
    let transport = Arc::new(BatchTransport::new(vec![
        AsyncPollResponse {
            status_code: 200,
            body: Some(json!({
                "id": "batch_1",
                "status": "completed",
                "output_file_id": "file_1"
            })),
            body_bytes: None,
        },
        AsyncPollResponse {
            status_code: 200,
            body: None,
            body_bytes: Some(jsonl.to_vec()),
        },
    ]));
    let executor = ProviderAsyncUsageExecutor::new(Arc::clone(&catalog), transport.clone());
    let settler = Arc::new(ReplayAsyncUsageSettler::new(
        Arc::clone(&catalog),
        billing.clone(),
    ));
    let worker = AsyncUsageTaskWorker::new(
        store.clone(),
        Arc::new(executor),
        Duration::seconds(30),
        Duration::seconds(5),
        5,
    )
    .with_settler(settler);

    assert_eq!(
        1,
        worker
            .run_once(Utc::now() + Duration::seconds(1), 10)
            .await
            .expect("worker pass")
    );

    let postpaid = billing.postpaid.lock().expect("postpaid").clone();
    assert_eq!(
        vec!["175000", "350000"],
        postpaid
            .iter()
            .map(|amount| amount.amount.as_str())
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec![
            "async:openai_batch:batch_1:gpt-4o:chat.completion".to_owned(),
            "async:openai_batch:batch_1:gpt-4o:responses".to_owned()
        ],
        billing.settled_requests.lock().expect("settled").clone()
    );
    assert_eq!(
        vec![
            "/v1/batches/batch_1".to_owned(),
            "/v1/files/file_1/content".to_owned()
        ],
        transport.paths.lock().expect("paths").clone()
    );
}
