use sdkwork_clawrouter_router_service::application::{
    ListModelCatalogQuery, ModelCatalogQueryService, PriceAvailability,
};
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, UpstreamAccountGroup, DecimalValue, GatewayApiKey, ModelPrice,
    ModelUpstreamRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    UpstreamAccountRoute,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;

fn catalog_for_model_list() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_vendor(ModelVendorDefinition::new(
        "anthropic",
        ModelVendor::Anthropic,
        "Anthropic",
    ));
    catalog.add_model(AiModel::new(
        "gpt-4o-mini",
        "GPT-4o mini",
        "openai",
        vec!["chat", "tools", "json_schema"],
    ));
    catalog.add_model(AiModel::new(
        "claude-3-haiku",
        "Claude 3 Haiku",
        "anthropic",
        vec!["chat"],
    ));
    catalog.add_provider_route(ModelUpstreamRoute::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        "openrouter",
        3001,
        "gpt-4o-mini",
    ));
    catalog.add_provider_route(ModelUpstreamRoute::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        "azure_openai",
        2001,
        "gpt-4o-mini",
    ));
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::parse("1.200000").unwrap(),
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog.add_upstream_account_group(
        UpstreamAccountGroup::new(
            11,
            "premium-lab",
            "standard",
            DecimalValue::parse("1.000000").unwrap(),
            DecimalValue::parse("1.100000").unwrap(),
        )
        .with_name("Premium Lab"),
    );
    catalog.add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test"));
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::usd("0.150000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini"),
    );
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmOutputToken,
            Money::usd("0.600000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini"),
    );
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmCacheReadToken,
            Money::usd("0.075000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini"),
    );
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::usd("0.151000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .for_provider("openrouter", 3001),
    );
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.110000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .for_provider("openrouter", 3001),
    );
    catalog.add_price(
        ModelPrice::new(
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.120000").unwrap(),
        )
        .with_catalog_key("openai/gpt-4o-mini")
        .for_provider("azure_openai", 2001),
    );
    catalog
}

#[test]
fn lists_models_with_customer_price_provider_count_and_vendor_filter() {
    let catalog = catalog_for_model_list();
    let service = ModelCatalogQueryService::new(&catalog);

    let page = service
        .list_models(ListModelCatalogQuery {
            api_key_id: Some(100),
            billing_meter: BillingMeter::LlmInputToken,
            vendor_code: Some("openai".to_owned()),
            vendor_codes: Vec::new(),
            modalities: Vec::new(),
            capabilities: Vec::new(),
            categories: Vec::new(),
            groups: Vec::new(),
            search_query: None,
            page_size: None,
            offset: None,
        })
        .unwrap();

    assert_eq!(1, page.items.len());
    let item = &page.items[0];
    assert_eq!("gpt-4o-mini", item.model);
    assert_eq!("openai/gpt-4o-mini", item.catalog_key);
    assert_eq!("GPT-4o mini", item.display_name);
    assert_eq!("openai", item.vendor_code);
    assert_eq!(ModelVendor::OpenAi, item.vendor);
    assert_eq!(vec!["chat", "tools", "json_schema"], item.capabilities);
    assert_eq!(vec!["azure_openai", "openrouter"], item.supplier_codes);
    assert_eq!(
        "0.110000",
        item.lowest_upstream_cost_unit_price.as_deref().unwrap()
    );
    assert_eq!(3, item.official_reference_prices.len());
    assert_reference_price(item, "llm_input_token", "0.150000", "USD");
    assert_reference_price(item, "llm_output_token", "0.600000", "USD");
    assert_reference_price(item, "llm_cache_read_token", "0.075000", "USD");

    match &item.price_availability {
        PriceAvailability::Available(price) => {
            assert_eq!("standard-group", price.group_code);
            assert_eq!("standard", price.pricing_plan_code);
            assert_eq!("0.198000", price.customer_unit_price);
            assert_eq!("0.088000", price.gross_margin_per_unit.as_deref().unwrap());
        }
        PriceAvailability::Unavailable { reason } => {
            panic!("unexpected unavailable price: {reason}")
        }
    }
}

fn assert_reference_price(
    item: &sdkwork_clawrouter_router_service::application::ModelCatalogItem,
    billing_meter: &str,
    unit_price: &str,
    currency: &str,
) {
    let price = item
        .official_reference_prices
        .iter()
        .find(|price| price.billing_meter == billing_meter)
        .unwrap_or_else(|| panic!("missing official reference price for {billing_meter}"));

    assert_eq!(unit_price, price.unit_price);
    assert_eq!(currency, price.currency);
    assert_eq!("global", price.region_code);
}

#[test]
fn list_keeps_unpriced_models_explicitly_unavailable_instead_of_fake_success() {
    let catalog = catalog_for_model_list();
    let service = ModelCatalogQueryService::new(&catalog);

    let page = service
        .list_models(ListModelCatalogQuery {
            api_key_id: Some(100),
            billing_meter: BillingMeter::LlmInputToken,
            vendor_code: None,
            vendor_codes: Vec::new(),
            modalities: Vec::new(),
            capabilities: Vec::new(),
            categories: Vec::new(),
            groups: Vec::new(),
            search_query: None,
            page_size: None,
            offset: None,
        })
        .unwrap();

    assert_eq!(2, page.items.len());
    let claude = page
        .items
        .iter()
        .find(|item| item.model == "claude-3-haiku")
        .unwrap();

    match &claude.price_availability {
        PriceAvailability::Available(price) => {
            panic!("missing pricing must not return fake customer price: {price:?}")
        }
        PriceAvailability::Unavailable { reason } => {
            assert!(reason.contains("official reference price"));
        }
    }
}

#[test]
fn list_models_reads_backend_account_group_bindings_and_applies_catalog_filters() {
    let mut catalog = catalog_for_model_list();
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_resource_scoped_account_group_binding(10, 10, 100, Vec::<String>::new(), vec!["llm"])
            .with_resource_scoped_account_group_binding(11, 20, 100, Vec::<String>::new(), vec!["tools"]),
    );
    let service = ModelCatalogQueryService::new(&catalog);

    let page = service
        .list_models(ListModelCatalogQuery {
            api_key_id: None,
            billing_meter: BillingMeter::LlmInputToken,
            vendor_code: None,
            vendor_codes: vec!["openai".to_owned(), "anthropic".to_owned()],
            modalities: vec!["text".to_owned()],
            capabilities: vec!["tools".to_owned()],
            categories: vec!["Recommended".to_owned(), "Proprietary".to_owned()],
            groups: vec!["premium-lab".to_owned()],
            search_query: Some("gpt".to_owned()),
            page_size: Some(10),
            offset: None,
        })
        .unwrap();

    assert_eq!(1, page.items.len());
    let item = &page.items[0];
    assert_eq!("openai/gpt-4o-mini", item.catalog_key);
    assert_eq!(vec!["premium-lab", "standard-group"], item.groups);
    assert_eq!(vec!["Recommended", "Proprietary"], item.categories);
}

#[test]
fn list_models_matches_resource_scoped_group_binding_against_capabilities() {
    let mut catalog = catalog_for_model_list();
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001).with_resource_scoped_account_group_binding(
            10,
            10,
            100,
            Vec::<String>::new(),
            vec!["llm"],
        ),
    );
    let service = ModelCatalogQueryService::new(&catalog);

    let page = service
        .list_models(ListModelCatalogQuery {
            api_key_id: None,
            billing_meter: BillingMeter::LlmInputToken,
            vendor_code: None,
            vendor_codes: vec!["openai".to_owned()],
            modalities: Vec::new(),
            capabilities: Vec::new(),
            categories: Vec::new(),
            groups: vec!["standard-group".to_owned()],
            search_query: None,
            page_size: Some(10),
            offset: None,
        })
        .unwrap();

    assert_eq!(1, page.items.len());
    assert_eq!("openai/gpt-4o-mini", page.items[0].catalog_key);
    assert_eq!(vec!["standard-group"], page.items[0].groups);
}

#[test]
fn list_models_returns_complete_admin_group_catalog_independent_of_item_filters() {
    let mut catalog = catalog_for_model_list();
    catalog.add_upstream_account_group(
        UpstreamAccountGroup::new(
            12,
            "empty-admin-group",
            "standard",
            DecimalValue::parse("1.000000").unwrap(),
            DecimalValue::parse("1.100000").unwrap(),
        )
        .with_name("Empty Admin Group"),
    );
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("openrouter", 3001)
            .with_resource_scoped_account_group_binding(10, 10, 100, Vec::<String>::new(), vec!["llm"])
            .with_resource_scoped_account_group_binding(11, 20, 100, Vec::<String>::new(), vec!["tools"]),
    );
    let service = ModelCatalogQueryService::new(&catalog);

    let page = service
        .list_models(ListModelCatalogQuery {
            api_key_id: None,
            billing_meter: BillingMeter::LlmInputToken,
            vendor_code: None,
            vendor_codes: vec!["openai".to_owned()],
            modalities: vec!["text".to_owned()],
            capabilities: vec!["tools".to_owned()],
            categories: Vec::new(),
            groups: vec!["premium-lab".to_owned()],
            search_query: Some("gpt".to_owned()),
            page_size: Some(10),
            offset: None,
        })
        .unwrap();

    assert_eq!(1, page.items.len());
    assert_eq!(vec!["premium-lab", "standard-group"], page.items[0].groups);
    assert_eq!(3, page.groups.len());
    assert_eq!("premium-lab", page.groups[0].key);
    assert_eq!("Premium Lab", page.groups[0].label);
    assert_eq!(1, page.groups[0].model_count);
    assert_eq!("standard-group", page.groups[1].key);
    assert_eq!("standard-group", page.groups[1].label);
    assert_eq!(2, page.groups[1].model_count);
    assert_eq!("empty-admin-group", page.groups[2].key);
    assert_eq!("Empty Admin Group", page.groups[2].label);
    assert_eq!(0, page.groups[2].model_count);
}

#[test]
fn list_models_applies_offset_after_filtering() {
    let catalog = catalog_for_model_list();
    let service = ModelCatalogQueryService::new(&catalog);

    let first_page = service
        .list_models(ListModelCatalogQuery {
            api_key_id: None,
            billing_meter: BillingMeter::LlmInputToken,
            vendor_code: None,
            vendor_codes: Vec::new(),
            modalities: Vec::new(),
            capabilities: Vec::new(),
            categories: Vec::new(),
            groups: Vec::new(),
            search_query: None,
            page_size: Some(1),
            offset: None,
        })
        .unwrap();
    let second_page = service
        .list_models(ListModelCatalogQuery {
            api_key_id: None,
            billing_meter: BillingMeter::LlmInputToken,
            vendor_code: None,
            vendor_codes: Vec::new(),
            modalities: Vec::new(),
            capabilities: Vec::new(),
            categories: Vec::new(),
            groups: Vec::new(),
            search_query: None,
            page_size: Some(1),
            offset: Some(1),
        })
        .unwrap();

    assert_eq!(1, first_page.items.len());
    assert_eq!(1, second_page.items.len());
    assert_ne!(
        first_page.items[0].catalog_key,
        second_page.items[0].catalog_key
    );
}
