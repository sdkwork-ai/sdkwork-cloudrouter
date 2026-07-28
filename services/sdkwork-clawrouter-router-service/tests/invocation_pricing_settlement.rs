use axum::http::Method;
use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, BillingMode, BillingQuantitySource, Invocation, InvocationAccount,
    InvocationBilling, InvocationBody, InvocationClassificationRequest, InvocationDispatch,
    InvocationInterceptor, InvocationRequest, InvocationResource, InvocationResourceClassifier,
    InvocationSubject, OpenAiResourceClassifier, PricingFinalizationInterceptor,
    PricingPreflightInterceptor, PricingSettlementInterceptor, ResourceType,
};
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, UpstreamAccountGroup, DecimalValue, GatewayApiKey, ModelPrice,
    ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    ProviderAuthProfile, UpstreamAccountRoute, RoutingCapability,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_clawrouter_router_service::ports::GatewayUsageQuantity;
use serde_json::json;
use std::sync::Arc;

fn catalog_with_chat_prices() -> InMemoryPricingCatalog {
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
    catalog.add_model(
        AiModel::new(
            "management/files",
            "OpenAI Files API",
            "openai",
            vec!["network"],
        )
        .with_catalog_key("openai/management/files"),
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
    catalog.add_provider_route(
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
        UpstreamAccountRoute::new("openrouter", 3001).with_upstream_endpoint(
            Some("https://provider.example/openrouter"),
            Some("vault://provider/openrouter"),
        ),
    );
    add_price(
        &mut catalog,
        BillingMeter::LlmInputToken,
        PriceSide::OfficialReference,
        "0.150000",
    );
    add_price(
        &mut catalog,
        BillingMeter::LlmOutputToken,
        PriceSide::OfficialReference,
        "0.600000",
    );
    add_price(
        &mut catalog,
        BillingMeter::LlmInputToken,
        PriceSide::UpstreamCost,
        "0.110000",
    );
    add_price(
        &mut catalog,
        BillingMeter::LlmOutputToken,
        PriceSide::UpstreamCost,
        "0.480000",
    );
    catalog.add_provider_route(
        ModelUpstreamRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "fallback",
            3002,
            "gpt-4o-mini-fallback",
        )
        .with_upstream_endpoint(
            Some("https://provider.example/fallback"),
            Some("vault://provider/fallback"),
        ),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("fallback", 3002).with_upstream_endpoint(
            Some("https://provider.example/fallback"),
            Some("vault://provider/fallback"),
        ),
    );
    add_provider_price(
        &mut catalog,
        BillingMeter::LlmInputToken,
        "fallback",
        3002,
        "0.050000",
    );
    add_provider_price(
        &mut catalog,
        BillingMeter::LlmOutputToken,
        "fallback",
        3002,
        "0.090000",
    );
    add_price(
        &mut catalog,
        BillingMeter::ApiRequest,
        PriceSide::OfficialReference,
        "0.010000",
    );
    add_price(
        &mut catalog,
        BillingMeter::ApiResult,
        PriceSide::OfficialReference,
        "0.020000",
    );
    add_price_for_resource(
        &mut catalog,
        BillingMeter::ApiRequest,
        PriceSide::OfficialReference,
        "0.005000",
        "openai/management/files",
        "management/files",
    );
    catalog
}

fn add_price(
    catalog: &mut InMemoryPricingCatalog,
    meter: BillingMeter,
    side: PriceSide,
    unit_price: &str,
) {
    add_price_for_resource(
        catalog,
        meter,
        side,
        unit_price,
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
    );
}

fn add_price_for_resource(
    catalog: &mut InMemoryPricingCatalog,
    meter: BillingMeter,
    side: PriceSide,
    unit_price: &str,
    catalog_key: &str,
    model: &str,
) {
    let mut price = ModelPrice::new_for_catalog_key(
        catalog_key,
        model,
        side,
        meter,
        Money::usd(unit_price).unwrap(),
    );
    if side == PriceSide::UpstreamCost {
        price = price.for_provider("openrouter", 3001);
    }
    catalog.add_price(price);
}

fn add_provider_price(
    catalog: &mut InMemoryPricingCatalog,
    meter: BillingMeter,
    supplier_code: &str,
    account_id: i64,
    unit_price: &str,
) {
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            meter,
            Money::usd(unit_price).unwrap(),
        )
        .for_provider(supplier_code, account_id),
    );
}

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

fn chat_invocation() -> Invocation {
    let classification = OpenAiResourceClassifier::default()
        .classify(&InvocationClassificationRequest::new(
            Method::POST,
            "/v1/chat/completions",
        ))
        .expect("classification");
    let (mut resource, billing, routing) = classification.into_parts();
    resource.requested_model = Some("gpt-4o-mini".to_owned());
    resource.requested_model_catalog_key = Some("openai/gpt-4o-mini".to_owned());
    resource.provider_native_model = Some("gpt-4o-mini-upstream".to_owned());

    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/chat/completions")
            .with_request_id("req-price")
            .with_body(InvocationBody::json(json!({
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": "ping"}]
            }))),
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
    });
    invocation.dispatch = InvocationDispatch::json_response(
        200,
        json!({"usage": {"prompt_tokens": 12, "completion_tokens": 8, "total_tokens": 20}}),
    );
    invocation
}

fn fallback_account() -> InvocationAccount {
    InvocationAccount {
        supplier_code: "fallback".to_owned(),
        account_id: 3002,
        region_code: "global".to_owned(),
        credential_id: None,
        credential_rotation: None,
        base_url: Some("https://provider.example/fallback".to_owned()),
        secret_ref: Some("vault://provider/fallback".to_owned()),
        auth_profile: ProviderAuthProfile::default(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: Some("gpt-4o-mini-fallback".to_owned()),
    }
}

#[tokio::test]
async fn pricing_preflight_quotes_token_input_and_output_prices() {
    let catalog = Arc::new(catalog_with_chat_prices());
    let mut invocation = chat_invocation();

    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("pricing");

    let meters = invocation
        .usage
        .pricing_quotes
        .iter()
        .map(|quote| quote.meter.clone())
        .collect::<Vec<_>>();
    assert!(meters.contains(&BillingMeter::LlmInputToken));
    assert!(meters.contains(&BillingMeter::LlmOutputToken));

    let input = invocation
        .usage
        .quote_for_meter(&BillingMeter::LlmInputToken)
        .expect("input quote");
    assert_eq!("openai/gpt-4o-mini", input.catalog_key);
    assert_eq!(Some("openrouter"), input.supplier_code.as_deref());
    assert_eq!(Some(3001), input.account_id);
    assert_eq!("global", input.region_code);
    assert_eq!(
        "0.150000",
        input.official_reference_unit_price.to_fixed_string(6)
    );
    assert_eq!(
        "0.110000",
        input
            .upstream_cost_unit_price
            .as_ref()
            .expect("upstream")
            .to_fixed_string(6)
    );
    assert_eq!(
        "0.150000",
        input.customer_charge_unit_price.to_fixed_string(6)
    );
}

#[tokio::test]
async fn pricing_preflight_creates_fixed_api_request_usage_line() {
    let catalog = Arc::new(catalog_with_chat_prices());
    let mut invocation = chat_invocation();
    invocation.resource.resource_type = ResourceType::File;
    invocation.billing = InvocationBilling {
        mode: BillingMode::ApiRequest,
        meter: Some(BillingMeter::ApiRequest),
        quantity_source: BillingQuantitySource::FixedRequest,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    };

    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("pricing");

    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!(BillingMeter::ApiRequest, invocation.usage.lines[0].meter);
    assert_eq!("1", invocation.usage.lines[0].quantity.billable_quantity);
}

#[tokio::test]
async fn pricing_preflight_prices_api_request_resources_by_route_key_without_model() {
    let catalog = Arc::new(catalog_with_chat_prices());
    let mut invocation = chat_invocation();
    invocation.request =
        InvocationRequest::new(Method::POST, "/v1/files").with_request_id("req-files-api");
    invocation.resource.resource_type = ResourceType::File;
    invocation.resource.route_key = "openai/management/files".to_owned();
    invocation.resource.api_code = "openai.files".to_owned();
    invocation.resource.requested_model = None;
    invocation.resource.requested_model_catalog_key = None;
    invocation.resource.provider_native_model = None;
    invocation.billing = InvocationBilling {
        mode: BillingMode::ApiRequest,
        meter: Some(BillingMeter::ApiRequest),
        quantity_source: BillingQuantitySource::FixedRequest,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    };

    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("pricing");

    let quote = invocation
        .usage
        .quote_for_meter(&BillingMeter::ApiRequest)
        .expect("api request quote");
    assert_eq!("openai/management/files", quote.catalog_key);
    assert_eq!("management/files", quote.requested_model);
    assert_eq!(1, invocation.usage.lines.len());
    assert_eq!(BillingMeter::ApiRequest, invocation.usage.lines[0].meter);
    assert_eq!("1", invocation.usage.lines[0].quantity.billable_quantity);
}

#[tokio::test]
async fn pricing_preflight_uses_route_key_for_model_ignored_api_resources_even_with_body_model() {
    let catalog = Arc::new(catalog_with_chat_prices());
    let mut invocation = chat_invocation();
    invocation.request = InvocationRequest::new(Method::POST, "/v1/files")
        .with_request_id("req-files-api")
        .with_body(InvocationBody::json(json!({
            "model": "gpt-4o-mini",
            "purpose": "assistants"
        })));
    invocation.resource.resource_type = ResourceType::File;
    invocation.resource.route_key = "openai/management/files".to_owned();
    invocation.resource.api_code = "openai.files".to_owned();
    invocation.resource.model_requirement =
        sdkwork_clawrouter_router_service::domain::AiRouteModelRequirement::Ignored;
    invocation.resource.requested_model = Some("gpt-4o-mini".to_owned());
    invocation.resource.requested_model_catalog_key = None;
    invocation.resource.provider_native_model = None;
    invocation.billing = InvocationBilling {
        mode: BillingMode::ApiRequest,
        meter: Some(BillingMeter::ApiRequest),
        quantity_source: BillingQuantitySource::FixedRequest,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    };

    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("pricing");

    let quote = invocation
        .usage
        .quote_for_meter(&BillingMeter::ApiRequest)
        .expect("api request quote");
    assert_eq!("openai/management/files", quote.catalog_key);
    assert_eq!("management/files", quote.requested_model);
}

#[tokio::test]
async fn pricing_preflight_skips_free_calls() {
    let catalog = Arc::new(catalog_with_chat_prices());
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::GET, "/health").with_request_id("req-free"),
        InvocationSubject::anonymous_free(10, 20),
        InvocationResource::free_endpoint(
            "internal/health",
            "internal.health",
            RoutingCapability::Network,
        ),
        InvocationBilling::free(),
    );

    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("pricing");

    assert!(invocation.usage.pricing_quotes.is_empty());
    assert!(invocation.usage.lines.is_empty());
}

#[tokio::test]
async fn settlement_produces_usage_commands_for_each_usage_line() {
    let catalog = Arc::new(catalog_with_chat_prices());
    let mut invocation = chat_invocation();
    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("pricing");
    invocation.usage.add_line(
        sdkwork_clawrouter_router_service::application::InvocationUsageLine::new(
            BillingMeter::LlmInputToken,
            GatewayUsageQuantity::tokens(12).unwrap(),
        ),
    );
    invocation.usage.add_line(
        sdkwork_clawrouter_router_service::application::InvocationUsageLine::new(
            BillingMeter::LlmOutputToken,
            GatewayUsageQuantity::tokens(8).unwrap(),
        ),
    );

    PricingSettlementInterceptor::default()
        .after(&mut invocation)
        .await
        .expect("settlement");

    assert_eq!(2, invocation.usage.settlement_commands.len());
    let input = &invocation.usage.settlement_commands[0];
    assert_eq!("req-price", input.request_id);
    assert_eq!("openai/gpt-4o-mini", input.catalog_key);
    assert_eq!("openrouter", input.supplier_code);
    assert_eq!(3001, input.account_id);
    assert_eq!("llm_input_token", input.billing_meter_code);
    assert_eq!("12", input.billable_quantity);
    assert_eq!(12, input.prompt_tokens);
    assert_eq!(0, input.completion_tokens);
    assert_eq!(1, input.request_count);
    assert_eq!("0.150000", input.base_input_unit_price);
    assert_eq!("0.000001800000", input.customer_charge_amount);

    let output = &invocation.usage.settlement_commands[1];
    assert_eq!("llm_output_token", output.billing_meter_code);
    assert_eq!("8", output.billable_quantity);
    assert_eq!(0, output.prompt_tokens);
    assert_eq!(8, output.completion_tokens);
    assert_eq!(0, output.request_count);
    assert_eq!("0.600000", output.base_output_unit_price);
    assert_eq!("0.000004800000", output.customer_charge_amount);
}

#[tokio::test]
async fn settlement_assigns_unique_usage_types_to_same_request_usage_lines() {
    let catalog = Arc::new(catalog_with_chat_prices());
    let mut invocation = chat_invocation();
    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("pricing");
    let input_quote = invocation
        .usage
        .quote_for_meter(&BillingMeter::LlmInputToken)
        .expect("input quote")
        .clone();
    let output_quote = invocation
        .usage
        .quote_for_meter(&BillingMeter::LlmOutputToken)
        .expect("output quote")
        .clone();
    invocation.usage.add_line(
        sdkwork_clawrouter_router_service::application::InvocationUsageLine::new(
            BillingMeter::LlmInputToken,
            GatewayUsageQuantity::tokens(12).unwrap(),
        )
        .with_pricing_quote(input_quote.clone()),
    );
    invocation.usage.add_line(
        sdkwork_clawrouter_router_service::application::InvocationUsageLine::new(
            BillingMeter::LlmReasoningToken,
            GatewayUsageQuantity::tokens(3).unwrap(),
        )
        .with_pricing_quote(input_quote.clone()),
    );
    invocation.usage.add_line(
        sdkwork_clawrouter_router_service::application::InvocationUsageLine::new(
            BillingMeter::LlmCacheReadToken,
            GatewayUsageQuantity::tokens(2).unwrap(),
        )
        .with_pricing_quote(input_quote),
    );
    invocation.usage.add_line(
        sdkwork_clawrouter_router_service::application::InvocationUsageLine::new(
            BillingMeter::LlmOutputToken,
            GatewayUsageQuantity::tokens(8).unwrap(),
        )
        .with_pricing_quote(output_quote),
    );

    PricingSettlementInterceptor::default()
        .after(&mut invocation)
        .await
        .expect("settlement");

    let commands = &invocation.usage.settlement_commands;
    assert_eq!(4, commands.len());
    assert_eq!(
        vec![
            "llm_input_token",
            "llm_reasoning_token",
            "llm_cache_read_token",
            "llm_output_token",
        ],
        commands
            .iter()
            .map(|command| command.billing_meter_code.as_str())
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec![1, 3_020_001, 3, 2],
        commands
            .iter()
            .map(|command| command.usage_type)
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec![12, 3, 0, 0],
        commands
            .iter()
            .map(|command| command.prompt_tokens)
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec![0, 0, 2, 0],
        commands
            .iter()
            .map(|command| command.cached_tokens)
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec![0, 0, 0, 8],
        commands
            .iter()
            .map(|command| command.completion_tokens)
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec![12, 3, 2, 8],
        commands
            .iter()
            .map(|command| command.total_tokens)
            .collect::<Vec<_>>()
    );
    assert_eq!(
        25,
        commands
            .iter()
            .map(|command| command.total_tokens)
            .sum::<i64>()
    );
    assert_eq!(
        1,
        commands
            .iter()
            .map(|command| command.request_count)
            .sum::<i64>(),
        "one invocation must contribute one request to aggregate analytics"
    );
    let mut unique_usage_types = commands
        .iter()
        .map(|command| command.usage_type)
        .collect::<Vec<_>>();
    unique_usage_types.sort_unstable();
    unique_usage_types.dedup();
    assert_eq!(commands.len(), unique_usage_types.len());
}

#[tokio::test]
async fn settlement_charges_embedding_images_per_image_without_token_projection() {
    let catalog = Arc::new(catalog_with_chat_prices());
    let mut invocation = chat_invocation();
    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("pricing");
    let mut image_quote = invocation
        .usage
        .quote_for_meter(&BillingMeter::LlmInputToken)
        .expect("input quote")
        .clone();
    image_quote.meter = BillingMeter::EmbeddingImage;
    invocation.usage.add_line(
        sdkwork_clawrouter_router_service::application::InvocationUsageLine::new(
            BillingMeter::EmbeddingImage,
            GatewayUsageQuantity::images(2).unwrap(),
        )
        .with_pricing_quote(image_quote),
    );

    PricingSettlementInterceptor::default()
        .after(&mut invocation)
        .await
        .expect("settlement");

    let command = invocation.usage.settlement_commands.first().unwrap();
    assert_eq!("embedding_image", command.billing_meter_code);
    assert_eq!(2, command.image_count);
    assert_eq!(0, command.prompt_tokens);
    assert_eq!(0, command.completion_tokens);
    assert_eq!(0, command.total_tokens);
    assert_eq!(1, command.request_count);
    assert_eq!("0.300000000000", command.customer_charge_amount);
}

#[tokio::test]
async fn pricing_after_requotes_usage_lines_for_final_failover_account() {
    let catalog = Arc::new(catalog_with_chat_prices());
    let mut invocation = chat_invocation();
    PricingPreflightInterceptor::new(Arc::clone(&catalog))
        .before(&mut invocation)
        .await
        .expect("pricing");
    invocation.account = Some(fallback_account());
    invocation.resource.provider_native_model = Some("gpt-4o-mini-fallback".to_owned());
    invocation.usage.add_line(
        sdkwork_clawrouter_router_service::application::InvocationUsageLine::new(
            BillingMeter::LlmInputToken,
            GatewayUsageQuantity::tokens(12).unwrap(),
        ),
    );
    invocation.usage.add_line(
        sdkwork_clawrouter_router_service::application::InvocationUsageLine::new(
            BillingMeter::LlmOutputToken,
            GatewayUsageQuantity::tokens(8).unwrap(),
        ),
    );

    PricingFinalizationInterceptor::new(catalog)
        .after(&mut invocation)
        .await
        .expect("final pricing");
    PricingSettlementInterceptor::default()
        .after(&mut invocation)
        .await
        .expect("settlement");

    let input = &invocation.usage.settlement_commands[0];
    assert_eq!("fallback", input.supplier_code);
    assert_eq!(3002, input.account_id);
    assert!(input
        .pricing_snapshot
        .contains("\"upstreamUnitPrice\":\"0.050000\""));

    let output = &invocation.usage.settlement_commands[1];
    assert_eq!("fallback", output.supplier_code);
    assert_eq!(3002, output.account_id);
    assert!(output
        .pricing_snapshot
        .contains("\"upstreamUnitPrice\":\"0.090000\""));
}

#[tokio::test]
async fn settlement_prefers_line_level_adapter_quotes_over_meter_quotes() {
    let mut invocation = chat_invocation();
    invocation.billing = InvocationBilling {
        mode: BillingMode::ExternalUsageLine,
        meter: None,
        quantity_source: BillingQuantitySource::AdapterUsageLines,
        pricing_required: true,
        settlement_required: true,
        prepaid_required: false,
    };
    let catalog = Arc::new(catalog_with_chat_prices());
    PricingPreflightInterceptor::new(catalog)
        .before(&mut invocation)
        .await
        .expect("pricing");
    let mut quote = invocation
        .usage
        .quote_for_meter(&BillingMeter::ApiResult)
        .expect("api result quote")
        .clone();
    quote.customer_charge_before_rate = Money::usd("0.040000").expect("line-level unit price");
    quote.customer_charge_unit_price = Money::usd("0.040000").expect("line-level unit price");
    quote.pricing_plan_code = "line-level-plan".to_owned();
    invocation.usage.add_line(
        sdkwork_clawrouter_router_service::application::InvocationUsageLine::new(
            BillingMeter::ApiResult,
            GatewayUsageQuantity::results(3).unwrap(),
        )
        .with_pricing_quote(quote),
    );

    PricingSettlementInterceptor::default()
        .after(&mut invocation)
        .await
        .expect("settlement");

    let command = invocation.usage.settlement_commands.first().unwrap();
    assert_eq!("api_result", command.billing_meter_code);
    assert_eq!("3", command.billable_quantity);
    assert_eq!(3, command.result_count);
    assert_eq!("0.040000", command.base_input_unit_price);
    assert_eq!("0.120000000000", command.customer_charge_amount);
    assert!(command.pricing_snapshot.contains("\"line-level-plan\""));
}
