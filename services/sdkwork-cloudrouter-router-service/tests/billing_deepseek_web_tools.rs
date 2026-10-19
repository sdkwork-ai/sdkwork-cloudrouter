//! DeepSeek standalone web tools are billed per successful request.
//!
//! Official price: 5 CNY / 1,000 successful requests (global $0.75 / 1K). The
//! catalog publishes the rate on the `deepseek/web_tools` tool SKU; the
//! classifier pins both `/v1/tools/search` and `/v1/tools/fetch` to it.

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
const VENDOR: &str = "deepseek";
const CATALOG_KEY: &str = "deepseek/web_tools";

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

fn catalog() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        VENDOR,
        ModelVendor::DeepSeek,
        VENDOR,
    ));
    catalog.add_model(
        AiModel::new("web_tools", "DeepSeek Web Tools", VENDOR, vec!["tool"])
            .with_catalog_key(CATALOG_KEY),
    );
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
        "web_tools",
        VENDOR,
        ACCOUNT_ID,
        "web_tools",
    ));
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new(VENDOR, ACCOUNT_ID).with_account_group_binding(
            ACCOUNT_GROUP_ID,
            100,
            100,
        ),
    );
    let metadata = PricingRateMetadata {
        record_identity: None,
        price_book_code: "models.deepseek.global.official".to_owned(),
        rate_hash: "hash-deepseek-web-tools".to_owned(),
        product_code: "models.deepseek.tool".to_owned(),
        operation_code: "model.invoke".to_owned(),
        billability: "chargeable".to_owned(),
        charge_timing: "request_accepted".to_owned(),
        calculation_mode: "per_unit".to_owned(),
        quantity_aggregation: "distinct_invocation".to_owned(),
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
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            CATALOG_KEY,
            "web_tools",
            PriceSide::OfficialReference,
            BillingMeter::ApiRequest,
            Money::usd("0.000750").unwrap(),
        )
        .with_rate_metadata(metadata),
    );
    catalog
}

async fn invocation(path: &str, body: Value) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(
            Method::POST,
            path.to_owned(),
        ))
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, path.to_owned())
            .with_request_id("req-deepseek-web-tools")
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
        base_url: Some("https://api.deepseek.example".to_owned()),
        secret_ref: None,
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: Some("web_tools".to_owned()),
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

async fn settle(path: &str, request: Value, response: Value) -> (String, String, String) {
    let catalog = Arc::new(catalog());
    let mut invocation = invocation(path, request).await;
    assert_eq!(BillingMode::ApiRequest, invocation.billing.mode);
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    assert_eq!(CATALOG_KEY, identity.catalog_key);
    apply_pricing_identity(&mut invocation, &identity);
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
    invocation.dispatch = InvocationDispatch::json_response(200, response);
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
        .collect::<Vec<_>>();
    assert_eq!(1, commands.len());
    (
        commands[0].billing_meter_code.clone(),
        commands[0].billable_quantity.clone(),
        commands[0].customer_charge_amount.clone(),
    )
}

#[tokio::test]
async fn empty_search_results_are_waived_even_when_the_route_is_priced() {
    let catalog = Arc::new(catalog());
    let mut invocation = invocation("/v1/tools/search", json!({"query": "no hits"})).await;
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    apply_pricing_identity(&mut invocation, &identity);
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
    invocation.dispatch = InvocationDispatch::json_response(200, json!({"results": []}));
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

    assert_eq!(
        Some("search_returned_no_results".to_owned()),
        invocation.charging.waived
    );
    assert!(
        invocation.usage.settlement_commands.is_empty(),
        "an empty search result must not be charged"
    );
}

#[tokio::test]
async fn web_search_and_fetch_bill_one_successful_request() {
    let (meter, quantity, amount) = settle(
        "/v1/tools/search",
        json!({"query": "cloud router"}),
        json!({"results": [{"title": "a", "url": "https://example.com"}]}),
    )
    .await;
    assert_eq!(
        ("api_request".to_owned(), "1".to_owned()),
        (meter, quantity)
    );
    assert_eq!("0.000750000000", amount);

    let (meter, quantity, amount) = settle(
        "/v1/tools/fetch",
        json!({"url": "https://example.com"}),
        json!({"content": "hello"}),
    )
    .await;
    assert_eq!(
        ("api_request".to_owned(), "1".to_owned()),
        (meter, quantity)
    );
    assert_eq!("0.000750000000", amount);
}
