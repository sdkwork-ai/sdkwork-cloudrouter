//! End-to-end billing contract tests for every media/model resource type.
//!
//! Each test drives the full billing chain exactly as production does:
//! billing policy (mode + meter) → usage extraction from the provider
//! response → pricing finalization → settlement commands. The contract
//! asserts that the recorded command's unit price, quantity, and charge are
//! mutually consistent and never silently zero, so a broken write path (a
//! zero-priced usage record while the wallet debits correctly) fails here
//! instead of in front of a user.

use axum::http::Method;
use sdkwork_cloudrouter_router_service::application::{
    AccountBillingMode, AuthenticatedApiKeyContext, BillingMode, BillingQuantitySource, Invocation,
    InvocationAccount, InvocationBilling, InvocationBody, InvocationClassificationRequest,
    InvocationDispatch, InvocationInterceptor, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, OpenAiResourceClassifier, PricingFinalizationInterceptor,
    PricingPreflightInterceptor, PricingSettlementInterceptor, ResourceType,
    UsageExtractionInterceptor,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, ModelPrice, ModelUpstreamRoute,
    ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, ProviderAuthProfile,
    UpstreamAccountGroup, UpstreamAccountRoute,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use serde_json::json;
use std::sync::Arc;

fn subject() -> InvocationSubject {
    InvocationSubject::from_api_key_context(AuthenticatedApiKeyContext {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        api_key_id: 100,
        api_key_name_snapshot: "Test key".to_owned(),
        group_id: 10,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
    })
}

/// Scaffolding shared by every contract test: one model, one upstream route,
/// one plan (1.0 multiplier), and official prices for the given meters.
fn media_catalog(prices: &[(BillingMeter, &str)]) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(
        AiModel::new("gpt-4o-mini", "GPT-4o mini", "openai", vec!["chat"])
            .with_catalog_key("openai/gpt-4o-mini"),
    );
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.000000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new_scoped(
        10,
        10,
        20,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog
        .add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test").with_owner(10, 20, 30));
    catalog.add_model_upstream_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter",
            3001,
            "gpt-4o-mini-upstream",
        )
        .with_upstream_endpoint(
            Some("https://provider.example/openrouter"),
            Some("vault://provider/openrouter"),
        ),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_upstream_endpoint(
                Some("https://provider.example/openrouter"),
                Some("vault://provider/openrouter"),
            )
            .with_account_group_binding(10, 100, 100),
    );
    for (meter, price) in prices {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            meter.clone(),
            Money::usd(price).unwrap(),
        ));
    }
    catalog
}

fn invocation_with(
    path: &str,
    body: serde_json::Value,
    resource_type: ResourceType,
    billing: InvocationBilling,
) -> Invocation {
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(Method::POST, path))
        .expect("classification");
    let (mut resource, _, routing) = classification.into_parts();
    resource.resource_type = resource_type;
    resource.requested_model = Some("gpt-4o-mini".to_owned());
    resource.requested_model_catalog_key = Some("openai/gpt-4o-mini".to_owned());
    resource.provider_native_model = Some("gpt-4o-mini-upstream".to_owned());

    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, path)
            .with_request_id(format!(
                "req-{}",
                path.trim_start_matches('/').replace('/', "-")
            ))
            .with_body(InvocationBody::json(body)),
        subject(),
        resource,
        billing,
    );
    invocation.routing = routing;
    invocation.account = Some(InvocationAccount {
        supplier_code: "openrouter".to_owned(),
        account_id: 3001,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://provider.example/openrouter".to_owned()),
        secret_ref: Some("vault://provider/openrouter".to_owned()),
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: Some("gpt-4o-mini-upstream".to_owned()),
        billing_mode: AccountBillingMode::Prepay,
        account_group_id: None,
        account_group_code: None,
        pricing_plan_code: None,
    });
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}}),
    );
    invocation
}

/// Drives preflight → usage extraction → finalization → settlement and
/// returns the settlement command for the expected meter.
async fn run_billing_contract(
    catalog: Arc<InMemoryPricingCatalog>,
    mut invocation: Invocation,
    expected_meter: &str,
) -> sdkwork_cloudrouter_router_service::ports::GatewayUsageRecordCommand {
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
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
        .expect("settlement");

    let command = invocation
        .usage
        .settlement_commands
        .iter()
        .find(|command| command.billing_meter_code == expected_meter)
        .unwrap_or_else(|| {
            panic!(
                "no settlement command for {expected_meter}; got {:?}",
                invocation
                    .usage
                    .settlement_commands
                    .iter()
                    .map(|command| command.billing_meter_code.as_str())
                    .collect::<Vec<_>>()
            )
        })
        .clone();
    assert_eq!("rated", command.decision_status, "decision must be rated");
    assert_eq!("chargeable", command.billability, "must be chargeable");
    command
}

fn fixed_amount(value: &str) -> DecimalValue {
    DecimalValue::parse(value).expect("valid decimal")
}

#[tokio::test]
async fn image_result_billing_contract() {
    let catalog = Arc::new(media_catalog(&[(BillingMeter::ImageResult, "0.100000")]));
    let invocation = invocation_with(
        "/v1/images/generations",
        json!({"model": "gpt-4o-mini", "n": 3}),
        ResourceType::Image,
        InvocationBilling {
            mode: BillingMode::ResultCount,
            meter: Some(BillingMeter::ImageResult),
            quantity_source: BillingQuantitySource::ResponseBody,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
    );
    // Provider returns 3 generated images.
    let mut invocation = invocation;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"data": [{}, {}, {}], "usage": {"result_count": 3}}),
    );
    let command = run_billing_contract(catalog, invocation, "image_result").await;
    assert_eq!(3, command.image_count);
    assert_eq!(0, command.prompt_tokens);
    assert_eq!(0, command.completion_tokens);
    assert_eq!(
        "0.300000000000",
        fixed_amount(&command.customer_charge_amount).to_fixed_string(12),
        "3 images x 0.10 USD each"
    );
    assert_eq!(
        "0.100000000000",
        fixed_amount(&command.base_input_unit_price).to_fixed_string(12)
    );
}

#[tokio::test]
async fn video_result_billing_contract() {
    let catalog = Arc::new(media_catalog(&[(BillingMeter::VideoResult, "0.050000")]));
    let invocation = invocation_with(
        "/v1/videos/generations",
        json!({"model": "gpt-4o-mini", "n": 2}),
        ResourceType::Video,
        InvocationBilling {
            mode: BillingMode::ResultCount,
            meter: Some(BillingMeter::VideoResult),
            quantity_source: BillingQuantitySource::ResponseBody,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
    );
    let mut invocation = invocation;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"data": [{}, {}], "usage": {"result_count": 2}}),
    );
    let command = run_billing_contract(catalog, invocation, "video_result").await;
    assert_eq!(2, command.result_count);
    assert_eq!(
        "0.100000000000",
        fixed_amount(&command.customer_charge_amount).to_fixed_string(12),
        "2 videos x 0.05 USD each"
    );
}

#[tokio::test]
async fn audio_seconds_billing_contract() {
    let catalog = Arc::new(media_catalog(&[(
        BillingMeter::AudioInputSecond,
        "0.002000",
    )]));
    let invocation = invocation_with(
        "/v1/audio/transcriptions",
        json!({"model": "gpt-4o-mini"}),
        ResourceType::Audio,
        InvocationBilling {
            mode: BillingMode::AudioSecond,
            meter: Some(BillingMeter::AudioInputSecond),
            quantity_source: BillingQuantitySource::ResponseBody,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
    );
    let mut invocation = invocation;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"text": "hello", "usage": {"audio_seconds": "10"}}),
    );
    let command = run_billing_contract(catalog, invocation, "audio_input_second").await;
    assert_eq!("10.000000000000", command.billable_quantity);
    assert_eq!(Some("10.000000000000".to_owned()), command.audio_seconds);
    assert_eq!(
        "0.020000000000",
        fixed_amount(&command.customer_charge_amount).to_fixed_string(12),
        "10 seconds x 0.002 USD"
    );
}

#[tokio::test]
async fn music_output_seconds_billing_contract() {
    let catalog = Arc::new(media_catalog(&[(
        BillingMeter::MusicOutputSecond,
        "0.003000",
    )]));
    let invocation = invocation_with(
        "/v1/chat/completions",
        json!({"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hi"}]}),
        ResourceType::ModelCall,
        InvocationBilling {
            mode: BillingMode::AudioSecond,
            meter: Some(BillingMeter::MusicOutputSecond),
            quantity_source: BillingQuantitySource::ResponseBody,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
    );
    let mut invocation = invocation;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"audio": {"id": "x"}, "usage": {"audio_seconds": "30"}}),
    );
    let command = run_billing_contract(catalog, invocation, "music_output_second").await;
    assert_eq!("30.000000000000", command.billable_quantity);
    assert_eq!(
        "0.090000000000",
        fixed_amount(&command.customer_charge_amount).to_fixed_string(12),
        "30 seconds x 0.003 USD"
    );
}

#[tokio::test]
async fn model_chat_billing_contract_stays_consistent() {
    let catalog = Arc::new(media_catalog(&[
        (BillingMeter::LlmInputToken, "0.150000"),
        (BillingMeter::LlmOutputToken, "0.600000"),
        (BillingMeter::LlmCacheReadToken, "0.050000"),
    ]));
    let invocation = invocation_with(
        "/v1/chat/completions",
        json!({"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "hi"}]}),
        ResourceType::ChatCompletion,
        InvocationBilling {
            mode: BillingMode::Composite,
            meter: Some(BillingMeter::LlmInputToken),
            quantity_source: BillingQuantitySource::Composite,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        },
    );
    let mut invocation = invocation;
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"choices": [{"message": {"content": "ok"}}],
               "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}}),
    );
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing preflight");
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
        .expect("settlement");

    let input = invocation
        .usage
        .settlement_commands
        .iter()
        .find(|command| command.billing_meter_code == "llm_input_token")
        .expect("input command")
        .clone();
    let output = invocation
        .usage
        .settlement_commands
        .iter()
        .find(|command| command.billing_meter_code == "llm_output_token")
        .expect("output command")
        .clone();
    assert_eq!("100", input.billable_quantity);
    assert_eq!(
        "0.000015000000",
        fixed_amount(&input.customer_charge_amount).to_fixed_string(12),
        "100 tokens x 0.15 USD / 1M"
    );
    assert_eq!("50", output.billable_quantity);
    assert_eq!(
        "0.000030000000",
        fixed_amount(&output.customer_charge_amount).to_fixed_string(12),
        "50 tokens x 0.60 USD / 1M"
    );
}
