//! Gemini `:batchEmbedContents` has no response usage frame.
//!
//! Google bills embedding input tokens, so the request text is estimated before
//! dispatch and settled on `embedding_input_token`. This locks the classifier
//! arm, the `RequestBody` extraction branch, and the estimated quantity.

use axum::http::Method;
use chrono::{DateTime, Utc};
use sdkwork_cloudrouter_router_service::application::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode,
    AuthenticatedApiKeyContext, BillingMode, BillingPolicyInterceptor, Invocation,
    InvocationAccount, InvocationBody, InvocationClassificationRequest, InvocationDispatch,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    PricingFinalizationInterceptor, PricingPreflightInterceptor, PricingSettlementInterceptor,
    ProviderNativeResourceClassifier, UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, PricingRateMetadata,
    PricingRateVariant, ProviderAuthProfile, UpstreamAccountGroup, UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::json;
use std::sync::Arc;

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const API_KEY_ID: i64 = 100;
const ACCOUNT_GROUP_ID: i64 = 10;
const ACCOUNT_ID: i64 = 3001;
const VENDOR: &str = "google";
const MODEL: &str = "gemini-embedding-2";
const CATALOG_KEY: &str = "google/gemini-embedding-2";

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
        ModelVendor::Google,
        VENDOR,
    ));
    catalog.add_model(
        AiModel::new(MODEL, MODEL, VENDOR, vec!["embedding"]).with_catalog_key(CATALOG_KEY),
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
    let metadata = PricingRateMetadata {
        record_identity: None,
        price_book_code: "models.google.global.official".to_owned(),
        rate_hash: "hash-batch-embed".to_owned(),
        product_code: "models.google.embedding".to_owned(),
        operation_code: "embedding.create".to_owned(),
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
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            CATALOG_KEY,
            MODEL,
            PriceSide::OfficialReference,
            BillingMeter::EmbeddingInputToken,
            Money::usd("1.000000").unwrap(),
        )
        .with_rate_metadata(metadata),
    );
    catalog
}

async fn invocation() -> Invocation {
    let classification = ProviderNativeResourceClassifier
        .classify(
            &InvocationClassificationRequest::new(
                Method::POST,
                "/google/v1beta/models/gemini-embedding-2:batchEmbedContents",
            )
            .with_supplier_code("google"),
        )
        .expect("classification");
    let (resource, billing, routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(
            Method::POST,
            "/google/v1beta/models/gemini-embedding-2:batchEmbedContents",
        )
        .with_request_id("req-batch-embed")
        .with_body(InvocationBody::json(json!({
            "requests": [
                {"content": {"parts": [{"text": "hello"}]}},
                {"content": {"parts": [{"text": "world"}]}}
            ]
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
        base_url: Some("https://generativelanguage.example".to_owned()),
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
async fn batch_embed_contents_estimates_request_tokens_and_settles() {
    let catalog = Arc::new(catalog());
    let mut invocation = invocation().await;
    assert_eq!(BillingMode::Token, invocation.billing.mode);
    assert_eq!(
        Some(BillingMeter::EmbeddingInputToken),
        invocation.billing.meter.clone()
    );
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    assert_eq!(CATALOG_KEY, identity.catalog_key);
    apply_pricing_identity(&mut invocation, &identity);
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
    invocation.dispatch = InvocationDispatch::json_response(200, json!({"embeddings": [{}, {}]}));
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
    assert_eq!("embedding_input_token", commands[0].billing_meter_code);
    assert_eq!("2", commands[0].billable_quantity);
    assert_eq!("0.000002000000", commands[0].customer_charge_amount);
}
