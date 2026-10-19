//! Billing-shape test for DeepSeek's standalone web tools on the `/v1` ingress.
//!
//! DeepSeek bills Search and Fetch **per successful request**, and defines
//! "successful" as *producing a result*: Search returns `results: []` for a
//! query that matched nothing, and Fetch returns no body for a page it could not
//! read. Both are free upstream, so the relay must not charge the customer for
//! them. These tests pin the three links that make that true:
//!
//! 1. the billing policy attaches a vendor result gate to the api code,
//! 2. usage extraction drops the fixed-request fact when the gate fails, and
//! 3. settlement releases the prepaid reservation instead of demanding a
//!    billable amount (which would otherwise surface as a gateway 502).

use std::sync::{Arc, Mutex};

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    BillingMode, BillingPolicyInterceptor, BillingQuantitySource, BillingResultGate,
    BillingSettlementInterceptor, Invocation, InvocationAuthType, InvocationClassificationRequest,
    InvocationDispatch, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, InvocationUsageLine, OpenAiResourceClassifier, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::BillingMeter;
use sdkwork_cloudrouter_router_service::ports::{
    parse_recharge_settings_model, CustomerChargeMode, GatewayBillingAmount, GatewayBillingContext,
    GatewayBillingFuture, GatewayBillingSettlementMode, GatewayBillingStore, RechargeSettingsModel,
};
use serde_json::json;

fn subject() -> InvocationSubject {
    InvocationSubject {
        auth_type: InvocationAuthType::GatewayApiKey,
        api_key_id: Some(1),
        api_key_name_snapshot: None,
        tenant_id: 10,
        organization_id: 20,
        user_id: 30,
        billing_organization_id: 0,
        billing_owner: Default::default(),
        account_group_id: Some(1),
        account_group_code: Some("official.deepseek.full".to_owned()),
        pricing_plan_code: None,
        roles: Vec::new(),
        scopes: Vec::new(),
    }
}

fn web_tool_invocation(path: &str) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(Method::POST, path))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, path).with_request_id("req-web-tool"),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation
}

/// An invocation that has already passed the billing policy and the pricing
/// preflight, which is what seeds the fixed-request usage fact before dispatch.
async fn chargeable_web_tool(path: &str) -> Invocation {
    let mut invocation = web_tool_invocation(path);
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation
        .usage
        .add_line(InvocationUsageLine::fixed_request());
    invocation
}

#[tokio::test]
async fn web_tools_carry_their_vendor_result_gate_on_the_billing_record() {
    for (path, expected_gate) in [
        ("/v1/tools/search", BillingResultGate::NonEmptyResults),
        ("/v1/tools/fetch", BillingResultGate::NonEmptyContent),
    ] {
        let mut invocation = web_tool_invocation(path);
        BillingPolicyInterceptor
            .before(&mut invocation)
            .await
            .expect("billing policy");

        assert_eq!(BillingMode::ApiRequest, invocation.billing.mode, "{path}");
        assert_eq!(
            BillingQuantitySource::FixedRequest,
            invocation.billing.quantity_source,
            "{path}"
        );
        assert_eq!(expected_gate, invocation.billing.result_gate, "{path}");
        assert!(invocation.billing.pricing_required, "{path}");
        assert!(invocation.billing.settlement_required, "{path}");
    }
}

#[tokio::test]
async fn every_other_request_billed_route_keeps_the_plain_2xx_rule() {
    for path in ["/v1/moderations", "/v1/completions"] {
        let mut invocation = web_tool_invocation(path);
        BillingPolicyInterceptor
            .before(&mut invocation)
            .await
            .expect("billing policy");
        assert_eq!(
            BillingResultGate::Any,
            invocation.billing.result_gate,
            "{path} must not inherit a DeepSeek web-tool gate"
        );
    }
}

#[tokio::test]
async fn empty_search_results_waive_the_per_request_charge() {
    let mut invocation = chargeable_web_tool("/v1/tools/search").await;
    invocation.dispatch = InvocationDispatch::json_response(200, json!({"results": []}));

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert!(
        invocation.usage.lines.is_empty(),
        "an empty result set is a free call upstream, so no billable fact may exist"
    );
    assert_eq!(
        Some("search_returned_no_results"),
        invocation.charging.waived.as_deref()
    );
}

#[tokio::test]
async fn search_hits_keep_the_per_request_charge() {
    let mut invocation = chargeable_web_tool("/v1/tools/search").await;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"results": [{"title": "hit", "url": "https://example.com"}]}),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!(BillingMeter::ApiRequest, invocation.usage.lines[0].meter);
    assert_eq!("1", invocation.usage.lines[0].quantity.billable_quantity);
    assert_eq!(None, invocation.charging.waived);
}

#[tokio::test]
async fn a_fetch_without_a_body_waives_the_per_request_charge() {
    let mut invocation = chargeable_web_tool("/v1/tools/fetch").await;
    invocation.dispatch =
        InvocationDispatch::json_response(200, json!({"title": "Blocked", "content": ""}));

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert!(invocation.usage.lines.is_empty());
    assert_eq!(
        Some("fetch_returned_no_content"),
        invocation.charging.waived.as_deref()
    );
}

#[tokio::test]
async fn a_fetch_with_a_body_keeps_the_per_request_charge() {
    let mut invocation = chargeable_web_tool("/v1/tools/fetch").await;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"title": "Example", "content": "# Example\n\nBody."}),
    );

    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("usage extraction");

    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!(None, invocation.charging.waived);
}

#[derive(Default)]
struct RecordingBillingStore {
    calls: Mutex<Vec<&'static str>>,
}

impl RecordingBillingStore {
    fn calls(&self) -> Vec<&'static str> {
        self.calls.lock().expect("billing store calls").clone()
    }

    fn record(&self, call: &'static str) {
        self.calls.lock().expect("billing store calls").push(call);
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
        self.record("load_cash_to_points_settings");
        Box::pin(async { parse_recharge_settings_model(None, None, None) })
    }

    fn precharge_hold<'a>(
        &'a self,
        _context: GatewayBillingContext,
        _amount: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, String> {
        self.record("precharge_hold");
        Box::pin(async { Ok("hold-1".to_owned()) })
    }

    fn settle_hold<'a>(
        &'a self,
        _context: GatewayBillingContext,
        _hold_id: String,
        _actual: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        self.record("settle_hold");
        Box::pin(async { Ok(()) })
    }

    fn release_hold<'a>(
        &'a self,
        _context: GatewayBillingContext,
        _hold_id: String,
    ) -> GatewayBillingFuture<'a, ()> {
        self.record("release_hold");
        Box::pin(async { Ok(()) })
    }

    fn precharge<'a>(
        &'a self,
        _context: GatewayBillingContext,
        _amount: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        self.record("precharge");
        Box::pin(async { Ok(()) })
    }

    fn refund<'a>(
        &'a self,
        _context: GatewayBillingContext,
        _reserved: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        self.record("refund");
        Box::pin(async { Ok(()) })
    }

    fn charge_postpaid<'a>(
        &'a self,
        _context: GatewayBillingContext,
        _actual: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()> {
        self.record("charge_postpaid");
        Box::pin(async { Ok(()) })
    }

    fn mark_usage_settled<'a>(
        &'a self,
        _context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, ()> {
        self.record("mark_usage_settled");
        Box::pin(async { Ok(()) })
    }
}

async fn held_prepaid_invocation(path: &str) -> Invocation {
    let mut invocation = chargeable_web_tool(path).await;
    invocation.charging.charge_mode = CustomerChargeMode::PrepaidAdjustment;
    invocation.charging.settlement_mode = GatewayBillingSettlementMode::Synchronous;
    invocation.charging.hold_id = Some("hold-1".to_owned());
    invocation.charging.reserved_amount = Some(GatewayBillingAmount {
        amount: "1000".to_owned(),
        currency: "USD".to_owned(),
    });
    invocation
}

fn settlement_interceptor(store: &Arc<RecordingBillingStore>) -> BillingSettlementInterceptor {
    BillingSettlementInterceptor::new(
        Arc::clone(store) as Arc<dyn GatewayBillingStore + Send + Sync>
    )
}

#[tokio::test]
async fn a_waived_web_tool_releases_the_prepaid_hold_without_a_charge() {
    let store = Arc::new(RecordingBillingStore::default());
    let mut invocation = held_prepaid_invocation("/v1/tools/search").await;
    invocation.charging.waived = Some("search_returned_no_results".to_owned());

    settlement_interceptor(&store)
        .after(&mut invocation)
        .await
        .expect("settlement of a waived charge");

    assert_eq!(
        vec!["release_hold", "mark_usage_settled"],
        store.calls(),
        "a waived charge must return the frozen hold and never debit the wallet"
    );
    assert!(invocation.charging.settled);
    assert!(invocation.charging.provider_completed);
}

#[tokio::test]
async fn a_waived_web_tool_refunds_the_legacy_precharge_in_async_mode() {
    let store = Arc::new(RecordingBillingStore::default());
    let mut invocation = held_prepaid_invocation("/v1/tools/fetch").await;
    invocation.charging.settlement_mode = GatewayBillingSettlementMode::Asynchronous;
    invocation.charging.waived = Some("fetch_returned_no_content".to_owned());

    settlement_interceptor(&store)
        .after(&mut invocation)
        .await
        .expect("settlement of a waived charge");

    assert_eq!(
        vec!["refund"],
        store.calls(),
        "async settlement owns the durable debit, so the legacy precharge is refunded in place"
    );
    assert!(invocation.charging.settled);
}

#[tokio::test]
async fn a_non_waived_web_tool_without_a_billable_amount_still_fails_closed() {
    // Guard against the waiver branch swallowing genuine accounting gaps: a
    // successful provider response with no usage fact and no waiver must keep
    // erroring instead of silently settling at zero.
    let store = Arc::new(RecordingBillingStore::default());
    let mut invocation = web_tool_invocation("/v1/tools/search");
    BillingPolicyInterceptor
        .before(&mut invocation)
        .await
        .expect("billing policy");
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"results": [{"title": "hit", "url": "https://example.com"}]}),
    );

    let error = settlement_interceptor(&store)
        .after(&mut invocation)
        .await
        .expect_err("a missing billable amount must fail closed");
    assert!(
        error.message.contains("billable amount"),
        "unexpected error: {}",
        error.message
    );
    assert_eq!(
        vec!["load_cash_to_points_settings"],
        store.calls(),
        "no ledger mutation may happen on the fail-closed path"
    );
}
