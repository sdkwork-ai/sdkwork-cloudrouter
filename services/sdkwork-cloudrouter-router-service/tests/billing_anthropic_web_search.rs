//! Anthropic server-tool billing regression.
//!
//! Anthropic reports web searches separately from token usage in
//! `usage.server_tool_use.web_search_requests`. The vendor price is $10 / 1K
//! searches, so one response with two requests must emit one `web_search_call`
//! line with quantity 2 and amount $0.02.

use axum::http::Method;
use chrono::{DateTime, Utc};
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingPolicyInterceptor, Invocation, InvocationAccount,
    InvocationBody, InvocationClassificationRequest, InvocationDispatch, InvocationInterceptor,
    InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    PricingFinalizationInterceptor, PricingPreflightInterceptor, PricingSettlementInterceptor,
    ProviderNativeResourceClassifier, StreamingUsageAccumulator, StreamingUsageFormat,
    UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, PricingRateMetadata,
    PricingRateVariant, ProviderAuthProfile, UpstreamAccountGroup, UpstreamAccountRoute,
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
const CATALOG_KEY: &str = "anthropic/claude-sonnet-4-5";
const MODEL: &str = "claude-sonnet-4-5";

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

fn rate(meter: BillingMeter, usd: &str) -> ModelPrice {
    let metadata = PricingRateMetadata {
        record_identity: None,
        price_book_code: "models.anthropic.global.official".to_owned(),
        rate_hash: format!("hash-{}", meter.code()),
        product_code: "models.anthropic.chat".to_owned(),
        operation_code: "inference.generate".to_owned(),
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
    };
    ModelPrice::new_for_catalog_key(
        CATALOG_KEY,
        MODEL,
        PriceSide::OfficialReference,
        meter,
        Money::usd(usd).unwrap(),
    )
    .with_rate_metadata(metadata)
}

fn catalog() -> InMemoryPricingCatalog {
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
    for price in [
        rate(BillingMeter::LlmInputToken, "0.000003"),
        rate(BillingMeter::LlmOutputToken, "0.000015"),
        rate(BillingMeter::WebSearchCall, "0.010000"),
    ] {
        catalog.add_price(price);
    }
    catalog
}

async fn invocation(body: Value) -> Invocation {
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
            .with_request_id("req-anthropic-tools")
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
        base_url: Some("https://api.anthropic.example".to_owned()),
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

#[test]
fn anthropic_stream_preserves_server_tool_use_from_message_start() {
    let mut accumulator = StreamingUsageAccumulator::new(StreamingUsageFormat::ServerSentEvents);
    accumulator
        .observe(
            b"event: message_start\n\
              data: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":10,\"output_tokens\":1,\"server_tool_use\":{\"web_search_requests\":2}}}}\n\n",
        )
        .expect("message_start");
    accumulator
        .observe(
            b"event: message_delta\n\
              data: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\"},\"usage\":{\"output_tokens\":5}}\n\n",
        )
        .expect("message_delta");
    let body = accumulator.finish().expect("finish").expect("usage body");
    assert_eq!(
        Some(2),
        body.pointer("/usage/server_tool_use/web_search_requests")
            .and_then(Value::as_i64)
    );
}

#[tokio::test]
async fn anthropic_web_search_requests_are_billed_per_request() {
    let catalog = Arc::new(catalog());
    let mut invocation = invocation(json!({
        "model": MODEL,
        "max_tokens": 64,
        "messages": [{"role": "user", "content": "search"}],
        "tools": [{"type": "web_search_20250305", "name": "web_search"}]
    }))
    .await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
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
            "content": [
                {"type": "server_tool_use", "id": "srvtoolu_1", "name": "web_search", "input": {"query": "rust"}},
                {"type": "web_search_tool_result", "tool_use_id": "srvtoolu_1", "content": []}
            ],
            "usage": {
                "input_tokens": 10,
                "output_tokens": 5,
                "server_tool_use": {"web_search_requests": 2}
            }
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

    let search = invocation
        .usage
        .settlement_commands
        .iter()
        .find(|command| command.billing_meter_code == "web_search_call")
        .expect("web search line");
    assert_eq!("2", search.billable_quantity);
    assert_eq!("0.020000000000", search.customer_charge_amount);
}
