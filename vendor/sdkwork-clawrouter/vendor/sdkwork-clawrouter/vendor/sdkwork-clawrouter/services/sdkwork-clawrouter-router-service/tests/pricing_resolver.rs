use sdkwork_clawrouter_router_service::application::{
    PricingResolver, ResolveModelPriceQuery, ResolvedPriceSource,
};
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, ChannelGroup, DecimalValue, GatewayApiKey, ModelPrice,
    ModelProviderRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    ProviderChannelRoute,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;

fn catalog_with_openai_model() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(AiModel::new(
        "gpt-4o-mini",
        "GPT-4o mini",
        "openai",
        vec!["chat", "tools"],
    ));
    catalog.add_provider_route(ModelProviderRoute::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        "openrouter",
        3001,
        "gpt-4o-mini",
    ));
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.200000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_channel_group(ChannelGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog.add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test"));
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::usd("0.150000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .with_region_code("global"),
    );
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.110000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .with_region_code("global")
        .for_provider("openrouter", 3001),
    );
    catalog
}

#[test]
fn resolves_customer_price_from_channel_group_plan_and_official_reference() {
    let catalog = catalog_with_openai_model();
    let resolver = PricingResolver::new(&catalog);

    let resolved = resolver
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "openai/gpt-4o-mini".to_owned(),
            billing_meter: BillingMeter::LlmInputToken,
            provider_code: Some("openrouter".to_owned()),
            channel_id: None,
            region_code: None,
        })
        .unwrap();

    assert_eq!("standard-group", resolved.group_code);
    assert_eq!("standard", resolved.pricing_plan_code);
    assert_eq!(ModelVendor::OpenAi, resolved.vendor);
    assert_eq!("openrouter", resolved.provider_code.as_deref().unwrap());
    assert_eq!(
        ResolvedPriceSource::DerivedFromOfficialReference,
        resolved.source
    );
    assert_eq!(
        "0.150000",
        resolved.official_reference.unit_price.to_fixed_string(6)
    );
    assert_eq!(
        "0.110000",
        resolved
            .upstream_cost
            .unwrap()
            .unit_price
            .to_fixed_string(6)
    );
    assert_eq!(
        "0.198000",
        resolved.customer_charge.unit_price.to_fixed_string(6)
    );
    assert_eq!("1.000000", resolved.rate_multiplier.to_fixed_string(6));
    assert_eq!("1.320000", resolved.reference_multiplier.to_fixed_string(6));
    assert_eq!(
        "0.198000",
        resolved
            .customer_charge_before_rate
            .unit_price
            .to_fixed_string(6)
    );
    assert_eq!(
        "0.088000",
        resolved.gross_margin_per_unit.unwrap().to_fixed_string(6)
    );
}

#[test]
fn resolves_upstream_cost_for_the_selected_provider_channel() {
    let mut catalog = catalog_with_openai_model();
    catalog.add_provider_route(ModelProviderRoute::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        "openrouter",
        3002,
        "gpt-4o-mini-premium",
    ));
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.125000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .with_region_code("global")
        .for_provider("openrouter", 3002),
    );
    let resolver = PricingResolver::new(&catalog);

    let resolved = resolver
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "openai/gpt-4o-mini".to_owned(),
            billing_meter: BillingMeter::LlmInputToken,
            provider_code: Some("openrouter".to_owned()),
            channel_id: Some(3002),
            region_code: None,
        })
        .unwrap();

    assert_eq!(
        "0.125000",
        resolved
            .upstream_cost
            .unwrap()
            .unit_price
            .to_fixed_string(6)
    );
}

#[test]
fn model_catalog_identity_does_not_supply_pricing_region_without_route_context() {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(AiModel::new(
        "gpt-4o-mini",
        "GPT-4o mini",
        "openai",
        vec!["chat", "tools"],
    ));
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.200000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_channel_group(ChannelGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog.add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test"));
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::VideoOutputSecond,
            Money::new("CNY", "1.200000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .with_region_code("cn"),
    );
    let resolver = PricingResolver::new(&catalog);

    let error = resolver
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "openai/gpt-4o-mini".to_owned(),
            billing_meter: BillingMeter::VideoOutputSecond,
            provider_code: None,
            channel_id: None,
            region_code: None,
        })
        .unwrap_err();

    assert!(
        error
            .to_string()
            .contains("meter video_output_second and region global"),
        "{error}"
    );
}

#[test]
fn base_catalog_key_resolves_selected_channel_region_price_stack() {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "minimax",
        ModelVendor::Unknown,
        "MiniMax",
    ));
    catalog.add_model(
        AiModel::new("MiniMax-M2.7", "MiniMax M2.7", "minimax", vec!["chat"])
            .with_catalog_key("minimax/MiniMax-M2.7"),
    );
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.000000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_channel_group(ChannelGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog.add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test"));
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            "minimax_cn_direct",
            3001,
            "MiniMax-M2.7",
        )
        .with_region_code("cn"),
    );
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            "minimax_global_direct",
            3002,
            "MiniMax-M2.7",
        )
        .with_region_code("global"),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::new("CNY", "0.210000").unwrap(),
        )
        .with_region_code("cn"),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::new("CNY", "0.150000").unwrap(),
        )
        .with_region_code("cn")
        .for_provider("minimax_cn_direct", 3001),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::usd("0.030000").unwrap(),
        )
        .with_region_code("global"),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.020000").unwrap(),
        )
        .with_region_code("global")
        .for_provider("minimax_global_direct", 3002),
    );

    let resolved = PricingResolver::new(&catalog)
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "minimax/MiniMax-M2.7".to_owned(),
            billing_meter: BillingMeter::LlmInputToken,
            provider_code: Some("minimax_cn_direct".to_owned()),
            channel_id: Some(3001),
            region_code: None,
        })
        .unwrap();

    assert_eq!("CNY", resolved.official_reference.unit_price.currency);
    assert_eq!(
        "0.210000",
        resolved.official_reference.unit_price.to_fixed_string(6)
    );
    assert_eq!(
        "0.150000",
        resolved
            .upstream_cost
            .unwrap()
            .unit_price
            .to_fixed_string(6)
    );

    let resolved = PricingResolver::new(&catalog)
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "minimax/MiniMax-M2.7".to_owned(),
            billing_meter: BillingMeter::LlmInputToken,
            provider_code: Some("minimax_global_direct".to_owned()),
            channel_id: Some(3002),
            region_code: None,
        })
        .unwrap();

    assert_eq!("USD", resolved.official_reference.unit_price.currency);
    assert_eq!(
        "0.030000",
        resolved.official_reference.unit_price.to_fixed_string(6)
    );
    assert_eq!(
        "0.020000",
        resolved
            .upstream_cost
            .unwrap()
            .unit_price
            .to_fixed_string(6)
    );
}

#[test]
fn selected_route_region_disambiguates_same_provider_channel_deployments() {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "deepseek",
        ModelVendor::Unknown,
        "DeepSeek",
    ));
    catalog.add_model(
        AiModel::new(
            "deepseek-v4-pro",
            "DeepSeek V4 Pro",
            "deepseek",
            vec!["chat"],
        )
        .with_catalog_key("deepseek/deepseek-v4-pro"),
    );
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.000000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_channel_group(ChannelGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog.add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test"));
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "deepseek/deepseek-v4-pro",
            "deepseek-v4-pro",
            "deepseek_official",
            3001,
            "deepseek-v4-pro",
        )
        .with_region_code("global"),
    );
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "deepseek/deepseek-v4-pro",
            "deepseek-v4-pro",
            "deepseek_official",
            3001,
            "deepseek-v4-pro",
        )
        .with_region_code("cn"),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "deepseek/deepseek-v4-pro",
            "deepseek-v4-pro",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::usd("0.030000").unwrap(),
        )
        .with_region_code("global"),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "deepseek/deepseek-v4-pro",
            "deepseek-v4-pro",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::new("CNY", "0.210000").unwrap(),
        )
        .with_region_code("cn"),
    );

    let resolved = PricingResolver::new(&catalog)
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "deepseek/deepseek-v4-pro".to_owned(),
            billing_meter: BillingMeter::LlmInputToken,
            provider_code: Some("deepseek_official".to_owned()),
            channel_id: Some(3001),
            region_code: Some("cn".to_owned()),
        })
        .unwrap();

    assert_eq!("cn", resolved.official_reference.region_code);
    assert_eq!("CNY", resolved.official_reference.unit_price.currency);
    assert_eq!(
        "0.210000",
        resolved.official_reference.unit_price.to_fixed_string(6)
    );
}

#[test]
fn rejects_selected_channel_that_is_not_a_provider_route_for_the_model() {
    let mut catalog = catalog_with_openai_model();
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.125000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .with_region_code("global")
        .for_provider("openrouter", 9999),
    );
    let resolver = PricingResolver::new(&catalog);

    let error = resolver
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "openai/gpt-4o-mini".to_owned(),
            billing_meter: BillingMeter::LlmInputToken,
            provider_code: Some("openrouter".to_owned()),
            channel_id: Some(9999),
            region_code: None,
        })
        .unwrap_err();

    assert!(error.to_string().contains("channel 9999"));
}

#[test]
fn channel_route_resolves_price_stack_with_its_explicit_region() {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "minimax",
        ModelVendor::Unknown,
        "MiniMax",
    ));
    catalog.add_model(
        AiModel::new("MiniMax-M2.7", "MiniMax M2.7", "minimax", vec!["chat"])
            .with_catalog_key("minimax/MiniMax-M2.7"),
    );
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.000000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_channel_group(ChannelGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog.add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test"));
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("minimax_upstream", 4001).with_region_code("cn"),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::new("CNY", "0.210000").unwrap(),
        )
        .with_region_code("cn"),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::new("CNY", "0.150000").unwrap(),
        )
        .with_region_code("cn")
        .for_provider("minimax_upstream", 4001),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::usd("0.030000").unwrap(),
        )
        .with_region_code("global"),
    );

    let resolved = PricingResolver::new(&catalog)
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "minimax/MiniMax-M2.7".to_owned(),
            billing_meter: BillingMeter::LlmInputToken,
            provider_code: Some("minimax_upstream".to_owned()),
            channel_id: Some(4001),
            region_code: None,
        })
        .unwrap();

    assert_eq!("cn", resolved.official_reference.region_code);
    assert_eq!("CNY", resolved.official_reference.unit_price.currency);
    assert_eq!(
        "0.210000",
        resolved.official_reference.unit_price.to_fixed_string(6)
    );
    assert_eq!(
        "0.150000",
        resolved
            .upstream_cost
            .unwrap()
            .unit_price
            .to_fixed_string(6)
    );
}

#[test]
fn explicit_plan_customer_price_overrides_official_reference_and_keeps_group_multiplier() {
    let mut catalog = catalog_with_openai_model();
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::CustomerCharge,
            BillingMeter::LlmInputToken,
            Money::usd("0.300000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .with_region_code("global")
        .for_pricing_plan("standard"),
    );
    catalog.update_group_rate_multiplier(10, DecimalValue::parse("0.900000").unwrap());
    let resolver = PricingResolver::new(&catalog);

    let resolved = resolver
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "openai/gpt-4o-mini".to_owned(),
            billing_meter: BillingMeter::LlmInputToken,
            provider_code: Some("openrouter".to_owned()),
            channel_id: None,
            region_code: None,
        })
        .unwrap();

    assert_eq!(ResolvedPriceSource::ExplicitCustomerCharge, resolved.source);
    assert_eq!(
        "0.270000",
        resolved.customer_charge.unit_price.to_fixed_string(6)
    );
    assert_eq!("0.900000", resolved.rate_multiplier.to_fixed_string(6));
    assert_eq!(
        "0.300000",
        resolved
            .customer_charge_before_rate
            .unit_price
            .to_fixed_string(6)
    );
    assert_eq!(
        "0.160000",
        resolved.gross_margin_per_unit.unwrap().to_fixed_string(6)
    );
}

#[test]
fn supports_non_token_meter_without_new_pricing_table_shape() {
    let mut catalog = catalog_with_openai_model();
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::ApiResult,
            Money::usd("0.020000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .with_region_code("global"),
    );
    let resolver = PricingResolver::new(&catalog);

    let resolved = resolver
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "openai/gpt-4o-mini".to_owned(),
            billing_meter: BillingMeter::ApiResult,
            provider_code: None,
            channel_id: None,
            region_code: None,
        })
        .unwrap();

    assert_eq!(BillingMeter::ApiResult, resolved.billing_meter);
    assert_eq!(
        "0.026400",
        resolved.customer_charge.unit_price.to_fixed_string(6)
    );
}

#[test]
fn missing_price_returns_a_domain_error_instead_of_fake_success() {
    let catalog = catalog_with_openai_model();
    let resolver = PricingResolver::new(&catalog);

    let error = resolver
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "openai/gpt-4o-mini".to_owned(),
            billing_meter: BillingMeter::VideoOutputSecond,
            provider_code: None,
            channel_id: None,
            region_code: None,
        })
        .unwrap_err();

    assert!(error.to_string().contains("official reference price"));
}

#[test]
fn pricing_resolver_returns_domain_error_when_decimal_math_overflows() {
    let mut catalog = catalog_with_openai_model();
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::ApiResult,
            Money::usd("0.010000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .with_region_code("global"),
    );
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::CustomerCharge,
            BillingMeter::ApiResult,
            Money::usd("170141183460469231731687.303715").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .with_region_code("global")
        .for_pricing_plan("standard"),
    );
    catalog.update_group_rate_multiplier(10, DecimalValue::parse("2.000000").unwrap());
    let resolver = PricingResolver::new(&catalog);

    let error = resolver
        .resolve(ResolveModelPriceQuery {
            api_key_id: 100,
            channel_group_id: None,
            model: "openai/gpt-4o-mini".to_owned(),
            billing_meter: BillingMeter::ApiResult,
            provider_code: None,
            channel_id: None,
            region_code: None,
        })
        .unwrap_err();

    assert!(
        error
            .to_string()
            .contains("decimal multiplication overflow"),
        "{error}"
    );
}
