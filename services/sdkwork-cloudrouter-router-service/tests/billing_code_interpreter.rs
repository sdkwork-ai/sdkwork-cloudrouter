//! Code Interpreter session billing regression.
//!
//! A Responses call that executes code reports `code_interpreter_call` items in
//! `output[]`, not in the token usage frame. OpenAI bills one container session
//! (`$0.03/session`), not each code cell, so the extraction path must collapse
//! any number of code calls in one response into one `code_interpreter_session`
//! line and the preflight must quote that rate.

use axum::http::Method;
use chrono::{DateTime, Utc};
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingPolicyInterceptor, Invocation, InvocationAccount,
    InvocationBody, InvocationClassificationRequest, InvocationDispatch, InvocationInterceptor,
    InvocationRequest, InvocationResourceClassifier, InvocationSubject, OpenAiResourceClassifier,
    PricingFinalizationInterceptor, PricingPreflightInterceptor, PricingSettlementInterceptor,
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
const VENDOR: &str = "openai";
const CATALOG_KEY: &str = "openai/gpt-5.6-sol";
const MODEL: &str = "gpt-5.6-sol";

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
        price_book_code: "models.openai.global.official".to_owned(),
        rate_hash: format!("hash-{}", meter.code()),
        product_code: "models.openai.chat".to_owned(),
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
    for price in [
        rate(BillingMeter::LlmInputToken, "0.000001"),
        rate(BillingMeter::LlmOutputToken, "0.000006"),
        rate(BillingMeter::WebSearchCall, "0.010000"),
        rate(BillingMeter::FileSearchCall, "0.002500"),
        rate(BillingMeter::CodeInterpreterSession, "0.030000"),
    ] {
        catalog.add_price(price);
    }
    catalog
}

async fn invocation(body: Value) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(
            Method::POST,
            "/v1/responses",
        ))
        .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model = Some(MODEL.to_owned());
    resource.requested_model_catalog_key = Some(CATALOG_KEY.to_owned());
    resource.provider_native_model = Some(MODEL.to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/responses")
            .with_request_id("req-code-interpreter")
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

#[tokio::test]
async fn code_interpreter_cells_collapse_into_one_billable_session() {
    let catalog = Arc::new(catalog());
    let mut invocation = invocation(json!({
        "model": MODEL,
        "tools": [{"type": "code_interpreter"}],
        "input": "run code"
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
            "id": "resp_1",
            "object": "response",
            "output": [
                {"type": "code_interpreter_call", "code": "print(1)"},
                {"type": "code_interpreter_call", "code": "print(2)"},
                {"type": "message", "content": [{"type": "output_text", "text": "ok"}]}
            ],
            "usage": {"input_tokens": 1000, "output_tokens": 10}
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
    let session = commands
        .iter()
        .find(|(meter, _, _)| meter == "code_interpreter_session")
        .expect("code interpreter session line");
    assert_eq!(
        ("1".to_owned(), "0.030000000000".to_owned()),
        (session.1.clone(), session.2.clone()),
        "two code cells in one response must bill one session: {commands:?}"
    );
    assert_eq!(
        1,
        commands
            .iter()
            .filter(|(meter, _, _)| meter == "code_interpreter_session")
            .count()
    );
    assert!(commands
        .iter()
        .any(|(meter, _, _)| meter == "llm_input_token"));
    assert!(commands
        .iter()
        .any(|(meter, _, _)| meter == "llm_output_token"));
}
