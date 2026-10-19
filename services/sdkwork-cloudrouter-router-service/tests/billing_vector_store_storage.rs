//! Vector-store file ingestion billed as one storage GB-day.
//!
//! OpenAI charges `$0.10 / GB / day`; the file response carries `usage_bytes`,
//! so a 2,000,000,000-byte file must produce one `storage_gb_day` line with
//! quantity 2 and amount $0.20. The classifier pins the route to the catalog
//! tool SKU `openai/vector-stores`.

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
use serde_json::json;
use std::sync::Arc;

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const API_KEY_ID: i64 = 100;
const ACCOUNT_GROUP_ID: i64 = 10;
const ACCOUNT_ID: i64 = 3001;
const VENDOR: &str = "openai";
const CATALOG_KEY: &str = "openai/vector-stores";

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
        ModelVendor::OpenAi,
        VENDOR,
    ));
    catalog.add_model(
        AiModel::new(
            "vector-stores",
            "OpenAI Vector Stores",
            VENDOR,
            vec!["tool"],
        )
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
        "vector-stores",
        VENDOR,
        ACCOUNT_ID,
        "vector-stores",
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
        price_book_code: "models.openai.global.official".to_owned(),
        rate_hash: "hash-vector-stores-request".to_owned(),
        product_code: "models.openai.tool".to_owned(),
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
            "vector-stores",
            PriceSide::OfficialReference,
            BillingMeter::ApiRequest,
            Money::usd("0.002500").unwrap(),
        )
        .with_rate_metadata(metadata.clone()),
    );
    let mut storage_metadata = metadata;
    storage_metadata.rate_hash = "hash-vector-stores-storage".to_owned();
    storage_metadata.charge_timing = "usage_reported".to_owned();
    storage_metadata.quantity_aggregation = "sum".to_owned();
    storage_metadata.operation_code = "inference.generate".to_owned();
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            CATALOG_KEY,
            "vector-stores",
            PriceSide::OfficialReference,
            BillingMeter::StorageGbDay,
            Money::usd("0.100000").unwrap(),
        )
        .with_rate_metadata(storage_metadata),
    );
    catalog
}

async fn invocation() -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(
            Method::POST,
            "/v1/vector_stores/vs_1/files",
        ))
        .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model_catalog_key = Some(CATALOG_KEY.to_owned());
    resource.requested_model = Some("vector-stores".to_owned());
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/vector_stores/vs_1/files")
            .with_request_id("req-vector-storage")
            .with_body(InvocationBody::json(json!({"file_id": "file_1"}))),
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
        provider_model: Some("vector-stores".to_owned()),
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
async fn vector_store_file_ingestion_bills_storage_gb_days() {
    let catalog = Arc::new(catalog());
    let mut invocation = invocation().await;
    assert_eq!(BillingMode::Storage, invocation.billing.mode);
    let identity = resolve_pricing_identity(catalog.as_ref(), &invocation);
    assert_eq!(CATALOG_KEY, identity.catalog_key);
    apply_pricing_identity(&mut invocation, &identity);
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "file_1",
            "object": "vector_store.file",
            "usage_bytes": 2_000_000_000_i64
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
        .collect::<Vec<_>>();
    assert_eq!(1, commands.len(), "one file is one storage line");
    assert_eq!("storage_gb_day", commands[0].billing_meter_code);
    assert_eq!("2.000000000000", commands[0].billable_quantity);
    assert_eq!("0.200000000000", commands[0].customer_charge_amount);
}

/// A storage-metered response with no byte count must not be billed as zero.
///
/// `0` bytes is a legitimate value (an empty file), so silently defaulting a
/// missing `usage_bytes` to zero would turn any upstream shape change into free
/// vector-store ingestion. The extraction stage must fail instead, leaving the
/// invocation unsettled for reconciliation rather than recording a zero charge.
#[tokio::test]
async fn vector_store_file_without_a_byte_count_fails_closed() {
    let mut invocation = invocation().await;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "file_1",
            "object": "vector_store.file",
            "status": "completed"
        }),
    );
    let error = UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect_err("a storage line without a byte count must not become a zero charge");
    assert!(
        error.message.contains("no usage_bytes"),
        "unexpected error: {}",
        error.message
    );
}

/// A present, explicit `0` byte count is a real (empty) file and bills zero
/// storage — the fail-closed guard above must only catch a *missing* field.
#[tokio::test]
async fn an_empty_vector_store_file_is_waived_not_charged() {
    let mut invocation = invocation().await;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({
            "id": "file_1",
            "object": "vector_store.file",
            "status": "completed",
            "usage_bytes": 0
        }),
    );
    UsageExtractionInterceptor
        .after(&mut invocation)
        .await
        .expect("an explicit zero-byte file is measurable");
    assert!(
        invocation.usage.lines.is_empty(),
        "a zero-byte file has no billable storage quantity"
    );
    assert_eq!(
        Some("provider_reported_zero_storage".to_owned()),
        invocation.charging.waived,
        "zero storage must release the reservation instead of failing settlement"
    );
}
