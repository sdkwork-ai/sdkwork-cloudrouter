use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, ProviderRouteSelectionErrorKind, ProviderRouteSelector,
    SelectProviderChannelRouteQuery, SelectProviderRouteQuery,
};
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, ChannelGroup, DecimalValue, GatewayApiKey,
    GatewayApiKeyChannelGroupBinding, ModelMappingBindingType, ModelMappingRule, ModelPrice,
    ModelProviderRoute, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan,
    ProviderChannelRoute, ResolveModelMappingContext, RouteCandidate, RoutingCapability,
    RoutingFallbackMode, RoutingPolicy, RoutingPolicyScope, RoutingRule,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_clawrouter_router_service::ports::PricingCatalog;

fn base_catalog() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(
        AiModel::new(
            "gpt-4o-mini",
            "GPT-4o mini",
            "openai",
            vec!["chat", "tools"],
        )
        .with_catalog_key("openai/gpt-4o-mini"),
    );
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
    catalog
        .add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test").with_owner(10, 20, 30));
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("0.150000").unwrap(),
    ));
    catalog
}

fn add_callable_route(
    catalog: &mut InMemoryPricingCatalog,
    channel_id: i64,
    provider_code: &str,
    provider_model: &str,
    unit_price: &str,
) {
    add_callable_route_for_api(
        catalog,
        channel_id,
        provider_code,
        provider_model,
        "openai.chat_completions",
        unit_price,
    );
}

fn add_callable_route_for_api(
    catalog: &mut InMemoryPricingCatalog,
    channel_id: i64,
    provider_code: &str,
    provider_model: &str,
    api_code: &str,
    unit_price: &str,
) {
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            provider_code,
            channel_id,
            provider_model,
        )
        .with_api_code(api_code)
        .with_provider_endpoint(
            Some(format!("http://provider-proxy.internal/{provider_code}")),
            Some(format!("vault://providers/{provider_code}/account/main")),
        ),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd(unit_price).unwrap(),
        )
        .for_provider(provider_code, channel_id),
    );
}

fn add_callable_credential_route(
    catalog: &mut InMemoryPricingCatalog,
    channel_id: i64,
    credential_id: i64,
    provider_code: &str,
    provider_model: &str,
    credential_rotation: &str,
    credential_priority: i32,
    credential_weight: i32,
    unit_price: &str,
) {
    let secret_ref = format!("vault://providers/{provider_code}/account/{credential_id}");
    let base_url = format!("http://provider-proxy.internal/{provider_code}/{credential_id}");
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            provider_code,
            channel_id,
            provider_model,
        )
        .with_api_code("openai.chat_completions")
        .with_credential(
            Some(credential_id),
            credential_rotation.to_owned(),
            credential_priority,
            credential_weight,
        )
        .with_provider_endpoint(Some(base_url.clone()), Some(secret_ref.clone())),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new(provider_code, channel_id)
            .with_credential(
                Some(credential_id),
                credential_rotation.to_owned(),
                credential_priority,
                credential_weight,
            )
            .with_provider_endpoint(Some(base_url), Some(secret_ref)),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd(unit_price).unwrap(),
        )
        .for_provider(provider_code, channel_id),
    );
}

fn add_target_catalog_model(catalog: &mut InMemoryPricingCatalog) {
    catalog.add_vendor(ModelVendorDefinition::new(
        "anthropic",
        ModelVendor::Anthropic,
        "Anthropic",
    ));
    catalog.add_model(
        AiModel::new(
            "claude-3-5-sonnet",
            "Claude 3.5 Sonnet",
            "anthropic",
            vec!["chat", "tools"],
        )
        .with_catalog_key("anthropic/claude-3-5-sonnet"),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "anthropic/claude-3-5-sonnet",
        "claude-3-5-sonnet",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("0.300000").unwrap(),
    ));
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "anthropic/claude-3-5-sonnet",
            "claude-3-5-sonnet",
            "anthropic-direct",
            4001,
            "claude-3-5-sonnet",
        )
        .with_api_code("openai.chat_completions")
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/anthropic"),
            Some("vault://providers/anthropic/account/main"),
        ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("anthropic-direct", 4001).with_provider_endpoint(
            Some("http://provider-proxy.internal/anthropic"),
            Some("vault://providers/anthropic/account/main"),
        ),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "anthropic/claude-3-5-sonnet",
            "claude-3-5-sonnet",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.250000").unwrap(),
        )
        .for_provider("anthropic-direct", 4001),
    );
}

fn add_callable_channel_route(
    catalog: &mut InMemoryPricingCatalog,
    channel_id: i64,
    provider_code: &str,
) {
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new(provider_code, channel_id).with_provider_endpoint(
            Some(format!("http://provider-proxy.internal/{provider_code}")),
            Some(format!("vault://providers/{provider_code}/account/main")),
        ),
    );
}

fn add_group_policy_rule(
    catalog: &mut InMemoryPricingCatalog,
    policy_id: i64,
    profile_id: i64,
    rule_id: i64,
    rule_match: &str,
    target_model: &str,
    candidate_channels: Vec<RouteCandidate>,
    fallback_chain: Vec<RouteCandidate>,
) {
    catalog.add_routing_policy(RoutingPolicy::new(
        policy_id,
        10,
        20,
        &format!("group-policy-{policy_id}"),
        RoutingPolicyScope::ChannelGroup,
        Some(10),
        Some(profile_id),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            rule_id,
            10,
            20,
            profile_id,
            &format!("rule-{rule_id}"),
            1,
            rule_match,
            target_model,
        )
        .with_candidate_channels(candidate_channels)
        .with_fallback_chain(fallback_chain),
    );
}

fn add_group_policy_rule_for_group(
    catalog: &mut InMemoryPricingCatalog,
    group_id: i64,
    policy_id: i64,
    profile_id: i64,
    rule_id: i64,
    rule_match: &str,
    target_model: &str,
    candidate_channels: Vec<RouteCandidate>,
    fallback_chain: Vec<RouteCandidate>,
) {
    catalog.add_routing_policy(RoutingPolicy::new(
        policy_id,
        10,
        20,
        &format!("group-policy-{policy_id}"),
        RoutingPolicyScope::ChannelGroup,
        Some(group_id),
        Some(profile_id),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            rule_id,
            10,
            20,
            profile_id,
            &format!("rule-{rule_id}"),
            1,
            rule_match,
            target_model,
        )
        .with_candidate_channels(candidate_channels)
        .with_fallback_chain(fallback_chain),
    );
}

fn authenticated_context() -> AuthenticatedApiKeyContext {
    AuthenticatedApiKeyContext {
        api_key_id: 100,
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        api_key_name_snapshot: "sk-test".to_owned(),
        group_id: 10,
        group_code: "standard-group".to_owned(),
        pricing_plan_code: "standard".to_owned(),
    }
}

fn select_query() -> SelectProviderRouteQuery {
    SelectProviderRouteQuery {
        context: authenticated_context(),
        catalog_key: "openai/gpt-4o-mini".to_owned(),
        requested_model: "gpt-4o-mini".to_owned(),
        api_code: "openai.chat_completions".to_owned(),
        capability: RoutingCapability::Chat,
        billing_meter: BillingMeter::LlmInputToken,
    }
}

fn select_channel_route_query(route_key: &str) -> SelectProviderChannelRouteQuery {
    SelectProviderChannelRouteQuery {
        context: authenticated_context(),
        route_key: route_key.to_owned(),
        api_code: channel_route_api_code(route_key).to_owned(),
        capability: RoutingCapability::Chat,
    }
}

fn channel_route_api_code(route_key: &str) -> &str {
    match route_key {
        "openai/management/files" => "openai.files",
        _ => route_key,
    }
}

#[test]
fn selector_prefers_channel_group_policy_over_global_policy() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-main",
        "gpt-4o-mini-main",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "openrouter-premium",
        "gpt-4o-mini-premium",
        "0.125000",
    );
    catalog.add_routing_policy(RoutingPolicy::new(
        1,
        0,
        0,
        "global-policy",
        RoutingPolicyScope::Global,
        None,
        Some(101),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            102,
            0,
            0,
            101,
            "global-rule",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)]),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3002, 100)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!(Some(2), selection.policy_id);
    assert_eq!(Some(202), selection.rule_id);
}

#[test]
fn selector_prefers_policy_matching_the_request_capability() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-chat",
        "gpt-4o-mini-chat",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "openrouter-embedding",
        "gpt-4o-mini-embedding",
        "0.125000",
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            1,
            10,
            20,
            "group-embedding-policy",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(101),
        )
        .with_capability(RoutingCapability::Embedding),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            102,
            10,
            20,
            101,
            "embedding-rule",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3002, 100)]),
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            2,
            10,
            20,
            "group-chat-policy",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(201),
        )
        .with_capability(RoutingCapability::Chat),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            202,
            10,
            20,
            201,
            "chat-rule",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)]),
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(SelectProviderRouteQuery {
            capability: RoutingCapability::Chat,
            ..select_query()
        })
        .unwrap();

    assert_eq!(3001, selection.route.channel_id);
    assert_eq!(Some(2), selection.policy_id);
    assert_eq!(Some(202), selection.rule_id);
}

#[test]
fn selector_prefers_capability_specific_policy_over_generic_policy_in_same_scope() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "generic-openrouter",
        "gpt-4o-mini-generic",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "chat-openrouter",
        "gpt-4o-mini-chat",
        "0.125000",
    );
    add_group_policy_rule(
        &mut catalog,
        1,
        101,
        102,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            2,
            10,
            20,
            "group-chat-policy",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(201),
        )
        .with_capability(RoutingCapability::Chat),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            202,
            10,
            20,
            201,
            "chat-rule",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3002, 100)]),
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(SelectProviderRouteQuery {
            capability: RoutingCapability::Chat,
            ..select_query()
        })
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!(Some(2), selection.policy_id);
    assert_eq!(Some(202), selection.rule_id);
}

#[test]
fn selector_rejects_group_policy_without_requested_capability_instead_of_global_fallback() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "global-openrouter",
        "gpt-4o-mini-global",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "embedding-openrouter",
        "gpt-4o-mini-embedding",
        "0.125000",
    );
    catalog.add_routing_policy(RoutingPolicy::new(
        1,
        0,
        0,
        "global-chat-policy",
        RoutingPolicyScope::Global,
        None,
        Some(101),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            102,
            0,
            0,
            101,
            "global-chat-rule",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)]),
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            2,
            10,
            20,
            "group-embedding-policy",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(201),
        )
        .with_capability(RoutingCapability::Embedding),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            202,
            10,
            20,
            201,
            "embedding-rule",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3002, 100)]),
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select(SelectProviderRouteQuery {
            capability: RoutingCapability::Chat,
            ..select_query()
        })
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
    assert!(error
        .to_string()
        .contains("channel group policy scope has no routing policy for capability Chat"));
}

#[test]
fn selector_uses_configured_fallback_chain_without_legacy_cross_pool_fallback() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-main",
        "gpt-4o-mini-main",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "openrouter-fallback",
        "gpt-4o-mini-fallback",
        "0.130000",
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(9999, 100)],
        vec![RouteCandidate::new(3002, 50)],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-fallback", selection.route.provider_code);
}

#[test]
fn selector_plan_includes_primary_and_enabled_fallback_candidates() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-main",
        "gpt-4o-mini-main",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "openrouter-fallback",
        "gpt-4o-mini-fallback",
        "0.130000",
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![RouteCandidate::new(3002, 50)],
    );

    let plan = ProviderRouteSelector::new(&catalog)
        .select_plan(select_query())
        .unwrap();

    let channel_ids = plan
        .routes
        .iter()
        .map(|selection| selection.route.channel_id)
        .collect::<Vec<_>>();
    assert_eq!(vec![3001, 3002], channel_ids);
    assert_eq!(Some(2), plan.policy_id);
    assert_eq!(Some(202), plan.rule_id);
}

#[test]
fn selector_plan_deduplicates_same_channel_credential_resource_expansions() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-main",
        "gpt-4o-mini-main",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "openrouter-fallback",
        "gpt-4o-mini-fallback",
        "0.130000",
    );
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            "openrouter-fallback",
            3002,
            "gpt-4o-mini-fallback",
        )
        .with_api_code("openai.chat_completions")
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/openrouter-fallback"),
            Some("vault://providers/openrouter-fallback/account/main"),
        ),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![RouteCandidate::new(3002, 50)],
    );

    let plan = ProviderRouteSelector::new(&catalog)
        .select_plan(select_query())
        .unwrap();

    let channel_ids = plan
        .routes
        .iter()
        .map(|selection| selection.route.channel_id)
        .collect::<Vec<_>>();
    assert_eq!(vec![3001, 3002], channel_ids);
}

#[test]
fn selector_round_robins_same_channel_credentials_between_requests() {
    let mut catalog = base_catalog();
    add_callable_credential_route(
        &mut catalog,
        3001,
        300101,
        "openrouter-main",
        "gpt-4o-mini-main",
        "round_robin",
        10,
        100,
        "0.110000",
    );
    add_callable_credential_route(
        &mut catalog,
        3001,
        300102,
        "openrouter-main",
        "gpt-4o-mini-main",
        "round_robin",
        10,
        100,
        "0.110000",
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let first = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap();
    let second = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap();

    let selected = [first.route.credential_id, second.route.credential_id];
    assert_ne!(selected[0], selected[1]);
    assert!(selected.contains(&Some(300101)), "{selected:?}");
    assert!(selected.contains(&Some(300102)), "{selected:?}");
}

#[test]
fn selector_weighted_round_robin_repeats_credentials_by_weight() {
    let mut catalog = base_catalog();
    add_callable_credential_route(
        &mut catalog,
        3001,
        300101,
        "openrouter-main",
        "gpt-4o-mini-main",
        "weighted_round_robin",
        10,
        3,
        "0.110000",
    );
    add_callable_credential_route(
        &mut catalog,
        3001,
        300102,
        "openrouter-main",
        "gpt-4o-mini-main",
        "weighted_round_robin",
        10,
        1,
        "0.110000",
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let selected = (0..4)
        .map(|_| {
            ProviderRouteSelector::new(&catalog)
                .select(select_query())
                .unwrap()
                .route
                .credential_id
                .unwrap()
        })
        .collect::<Vec<_>>();

    let primary_count = selected.iter().filter(|id| **id == 300101).count();
    let secondary_count = selected.iter().filter(|id| **id == 300102).count();
    assert_eq!(3, primary_count, "{selected:?}");
    assert_eq!(1, secondary_count, "{selected:?}");
}

#[test]
fn selector_plan_respects_policy_fallback_mode_none() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-main",
        "gpt-4o-mini-main",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "openrouter-fallback",
        "gpt-4o-mini-fallback",
        "0.130000",
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            2,
            10,
            20,
            "group-policy-no-fallback",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(201),
        )
        .with_fallback_mode(RoutingFallbackMode::None),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            202,
            10,
            20,
            201,
            "rule-with-disabled-fallback",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)])
        .with_fallback_chain(vec![RouteCandidate::new(3002, 50)]),
    );

    let plan = ProviderRouteSelector::new(&catalog)
        .select_plan(select_query())
        .unwrap();

    let channel_ids = plan
        .routes
        .iter()
        .map(|selection| selection.route.channel_id)
        .collect::<Vec<_>>();
    assert_eq!(vec![3001], channel_ids);
}

#[test]
fn selector_rejects_rule_fallback_chain_when_policy_fallback_mode_is_none() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-primary",
        "gpt-4o-mini-main",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "openrouter-fallback",
        "gpt-4o-mini-fallback",
        "0.130000",
    );
    catalog.add_routing_policy(
        RoutingPolicy::new(
            2,
            10,
            20,
            "group-policy-no-fallback",
            RoutingPolicyScope::ChannelGroup,
            Some(10),
            Some(201),
        )
        .with_fallback_mode(RoutingFallbackMode::None),
    );
    catalog.add_routing_rule(
        RoutingRule::new(
            202,
            10,
            20,
            201,
            "rule-with-disabled-fallback",
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            "openai/gpt-4o-mini",
        )
        .with_candidate_channels(vec![RouteCandidate::new(9999, 100)])
        .with_fallback_chain(vec![RouteCandidate::new(3002, 50)]),
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
    assert!(error.to_string().contains("fallback mode none"));
}

#[test]
fn selector_rejects_matched_policy_rule_when_candidate_channel_is_not_callable() {
    let mut catalog = base_catalog();
    catalog.add_provider_route(ModelProviderRoute::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        "openrouter-main",
        3001,
        "gpt-4o-mini-main",
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.110000").unwrap(),
        )
        .for_provider("openrouter-main", 3001),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
    assert!(error.to_string().contains("callable priced candidate"));
}

#[test]
fn selector_reports_pricing_unavailable_when_callable_candidate_has_no_price() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-main",
        "gpt-4o-mini-main",
        "0.110000",
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select(SelectProviderRouteQuery {
            billing_meter: BillingMeter::LlmOutputToken,
            ..select_query()
        })
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::PricingUnavailable,
        error.kind()
    );
    assert!(error.to_string().contains("official reference price"));
}

#[test]
fn selector_prices_candidate_routes_with_canonical_catalog_key_and_region_context() {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "minimax",
        ModelVendor::MiniMax,
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
        Money::cny("0.000000").unwrap(),
    ));
    catalog.add_channel_group(ChannelGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog
        .add_api_key(GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test").with_owner(10, 20, 30));
    catalog.add_provider_route(
        ModelProviderRoute::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            "minimax_cn_direct",
            4001,
            "MiniMax-M2.7",
        )
        .with_region_code("cn")
        .with_provider_endpoint(
            Some("http://provider-proxy.internal/minimax-cn"),
            Some("vault://providers/minimax/account/cn"),
        ),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::cny("0.210000").unwrap(),
        )
        .with_region_code("cn"),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "minimax/MiniMax-M2.7",
            "MiniMax-M2.7",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::cny("0.150000").unwrap(),
        )
        .with_region_code("cn")
        .for_provider("minimax_cn_direct", 4001),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"minimax/MiniMax-M2.7"}"#,
        "minimax/MiniMax-M2.7",
        vec![RouteCandidate::new(4001, 100).with_region_code("cn")],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(SelectProviderRouteQuery {
            context: authenticated_context(),
            catalog_key: "minimax/MiniMax-M2.7".to_owned(),
            requested_model: "MiniMax-M2.7".to_owned(),
            api_code: "openai.chat_completions".to_owned(),
            capability: RoutingCapability::Chat,
            billing_meter: BillingMeter::LlmInputToken,
        })
        .unwrap();

    assert_eq!(4001, selection.route.channel_id);
    assert_eq!("minimax_cn_direct", selection.route.provider_code);
    assert_eq!("MiniMax-M2.7", selection.route.provider_model);
}

#[test]
fn selector_rejects_matched_policy_without_matching_rule() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-main",
        "gpt-4o-mini-main",
        "0.110000",
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/other-model"}"#,
        "openai/other-model",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
    assert!(error.to_string().contains("has no routing rule"));
}

#[test]
fn selector_requires_explicit_routing_policy_scope() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-main",
        "gpt-4o-mini-main",
        "0.110000",
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
    assert!(error
        .to_string()
        .contains("routing policy scope is required"));
}

#[test]
fn selector_selects_channel_route_by_route_key_without_model_pricing() {
    let mut catalog = base_catalog();
    add_callable_channel_route(&mut catalog, 3001, "openrouter-main");
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap();

    assert_eq!(3001, selection.route.channel_id);
    assert_eq!("openrouter-main", selection.route.provider_code);
    assert_eq!(Some(2), selection.policy_id);
    assert_eq!(Some(202), selection.rule_id);
}

#[test]
fn selector_synthetic_model_route_preserves_channel_route_region_context() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("minimax-upstream", 4001)
            .with_region_code("cn")
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/minimax-upstream"),
                Some("vault://providers/minimax-upstream/account/main"),
            ),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::new("CNY", "0.210000").unwrap(),
        )
        .with_region_code("cn"),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"model":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(4001, 100)],
        vec![],
    );

    let plan = ProviderRouteSelector::new(&catalog)
        .select_plan(select_query())
        .unwrap();

    assert_eq!(1, plan.routes.len());
    assert_eq!("cn", plan.routes[0].route.region_code);
    assert_eq!("minimax-upstream", plan.routes[0].route.provider_code);
    assert_eq!(4001, plan.routes[0].route.channel_id);
}

#[test]
fn selector_region_scoped_candidate_selects_matching_same_channel_deployment() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3001)
            .with_region_code("global")
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-global"),
                Some("vault://providers/openrouter/account/main"),
            ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3001)
            .with_region_code("cn")
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-cn"),
                Some("vault://providers/openrouter/account/main"),
            ),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::usd("0.210000").unwrap(),
        )
        .with_region_code("cn"),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"model":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100).with_region_code("cn")],
        vec![],
    );

    let plan = ProviderRouteSelector::new(&catalog)
        .select_plan(select_query())
        .unwrap();

    assert_eq!(1, plan.routes.len());
    assert_eq!("cn", plan.routes[0].route.region_code);
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter-cn"),
        plan.routes[0].route.base_url.as_deref()
    );
}

#[test]
fn selector_unscoped_candidate_evaluates_all_same_channel_region_deployments() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3001)
            .with_region_code("global")
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-global"),
                Some("vault://providers/openrouter/account/main"),
            ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3001)
            .with_region_code("cn")
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-cn"),
                Some("vault://providers/openrouter/account/main"),
            ),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-4o-mini",
            "gpt-4o-mini",
            PriceSide::OfficialReference,
            BillingMeter::LlmOutputToken,
            Money::usd("0.210000").unwrap(),
        )
        .with_region_code("cn"),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"model":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let plan = ProviderRouteSelector::new(&catalog)
        .select_plan(SelectProviderRouteQuery {
            billing_meter: BillingMeter::LlmOutputToken,
            ..select_query()
        })
        .unwrap();

    assert_eq!(1, plan.routes.len());
    assert_eq!("cn", plan.routes[0].route.region_code);
    assert_eq!(
        Some("http://provider-proxy.internal/openrouter-cn"),
        plan.routes[0].route.base_url.as_deref()
    );
}

#[test]
fn selector_routes_group_bound_channel_route_by_route_key_without_explicit_policy_rule() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-group-bound", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-group-bound"),
                Some("vault://providers/openrouter-group-bound/account/main"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["llm"]),
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-group-bound", selection.route.provider_code);
    assert_eq!(None, selection.policy_id);
    assert_eq!(None, selection.rule_id);
}

#[test]
fn selector_prefers_channel_group_channel_route_over_global_policy() {
    let mut catalog = base_catalog();
    add_callable_channel_route(&mut catalog, 3001, "openrouter-global");
    add_callable_channel_route(&mut catalog, 3002, "openrouter-group");
    catalog.add_routing_policy(RoutingPolicy::new(
        1,
        0,
        0,
        "global-management-policy",
        RoutingPolicyScope::Global,
        None,
        Some(101),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            102,
            0,
            0,
            101,
            "global-files-rule",
            1,
            r#"{"routeKey":"openai/management/files"}"#,
            "",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)]),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3002, 100)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!(Some(2), selection.policy_id);
    assert_eq!(Some(202), selection.rule_id);
}

#[test]
fn selector_restricts_channel_route_candidates_to_group_channel_bindings() {
    let mut catalog = base_catalog();
    add_callable_channel_route(&mut catalog, 3001, "openrouter-unbound");
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-group-bound", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-group-bound"),
                Some("vault://providers/openrouter-group-bound/account/main"),
            )
            .with_group_binding(10, 1, 100),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![
            RouteCandidate::new(3001, 100),
            RouteCandidate::new(3002, 50),
        ],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-group-bound", selection.route.provider_code);
    assert_eq!(Some(2), selection.policy_id);
    assert_eq!(Some(202), selection.rule_id);
}

#[test]
fn selector_restricts_model_route_candidates_to_group_channel_bindings() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-unbound",
        "gpt-4o-mini-unbound",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "openrouter-group-bound",
        "gpt-4o-mini-bound",
        "0.120000",
    );
    add_callable_channel_route(&mut catalog, 3001, "openrouter-unbound");
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-group-bound", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-group-bound"),
                Some("vault://providers/openrouter-group-bound/account/main"),
            )
            .with_group_binding(10, 1, 100),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![
            RouteCandidate::new(3001, 100),
            RouteCandidate::new(3002, 50),
        ],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-group-bound", selection.route.provider_code);
    assert_eq!(Some(2), selection.policy_id);
    assert_eq!(Some(202), selection.rule_id);
}

#[test]
fn selector_routes_catalog_model_through_group_bound_channel_route_without_model_route() {
    let mut catalog = base_catalog();
    catalog.add_model(
        AiModel::new("gpt-5.5", "GPT-5.5", "openai", vec!["chat"])
            .with_catalog_key("openai/gpt-5.5"),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-5.5",
        "gpt-5.5",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("1.250000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openai/gpt-5.5",
            "gpt-5.5",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.900000").unwrap(),
        )
        .for_provider("openrouter-group-bound", 3002),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-group-bound", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-group-bound"),
                Some("vault://providers/openrouter-group-bound/account/main"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["llm"]),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-5.5"}"#,
        "openai/gpt-5.5",
        vec![RouteCandidate::new(3002, 100)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(SelectProviderRouteQuery {
            context: authenticated_context(),
            catalog_key: "openai/gpt-5.5".to_owned(),
            requested_model: "openai/gpt-5.5".to_owned(),
            api_code: "openai.chat_completions".to_owned(),
            capability: RoutingCapability::Chat,
            billing_meter: BillingMeter::LlmInputToken,
        })
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-group-bound", selection.route.provider_code);
    assert_eq!(
        "gpt-5.5", selection.route.provider_model,
        "account-pool fallback must send the provider-native model id without vendor/region"
    );
    assert_eq!(Some(2), selection.policy_id);
    assert_eq!(Some(202), selection.rule_id);
}

#[test]
fn selector_routes_slash_native_catalog_model_through_resource_scoped_channel_route() {
    let mut catalog = base_catalog();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openrouter",
        ModelVendor::Unknown,
        "OpenRouter",
    ));
    catalog.add_model(
        AiModel::new(
            "anthropic/claude-3-opus",
            "Claude 3 Opus via OpenRouter",
            "openrouter",
            vec!["chat"],
        )
        .with_catalog_key("openrouter/anthropic/claude-3-opus"),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openrouter/anthropic/claude-3-opus",
        "anthropic/claude-3-opus",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("1.500000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "openrouter/anthropic/claude-3-opus",
            "anthropic/claude-3-opus",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("1.000000").unwrap(),
        )
        .for_provider("openrouter", 3101),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3101)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter"),
                Some("vault://providers/openrouter/account/main"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["llm"]),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openrouter/anthropic/claude-3-opus"}"#,
        "openrouter/anthropic/claude-3-opus",
        vec![RouteCandidate::new(3101, 100)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(SelectProviderRouteQuery {
            context: authenticated_context(),
            catalog_key: "openrouter/anthropic/claude-3-opus".to_owned(),
            requested_model: "openrouter/anthropic/claude-3-opus".to_owned(),
            api_code: "openai.chat_completions".to_owned(),
            capability: RoutingCapability::Chat,
            billing_meter: BillingMeter::LlmInputToken,
        })
        .unwrap();

    assert_eq!(3101, selection.route.channel_id);
    assert_eq!("openrouter", selection.route.provider_code);
    assert_eq!(
        "anthropic/claude-3-opus", selection.route.provider_model,
        "slash-containing provider-native ids must be sent upstream without catalog vendor/region"
    );
}

#[test]
fn selector_routes_regional_catalog_model_through_group_bound_channel_route_region_scope() {
    let mut catalog = base_catalog();
    catalog.add_vendor(ModelVendorDefinition::new(
        "alibaba",
        ModelVendor::Alibaba,
        "Alibaba",
    ));
    catalog.add_model(
        AiModel::new(
            "qwen3.6-max-preview",
            "Qwen3.6 Max Preview",
            "alibaba",
            vec!["chat"],
        )
        .with_catalog_key("alibaba/qwen3.6-max-preview"),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "alibaba/qwen3.6-max-preview",
        "qwen3.6-max-preview",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("1.500000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "alibaba/qwen3.6-max-preview",
            "qwen3.6-max-preview",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("1.000000").unwrap(),
        )
        .for_provider("dashscope", 3101),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("dashscope", 3101)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/dashscope"),
                Some("vault://providers/dashscope/account/main"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["llm"]),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"alibaba/qwen3.6-max-preview"}"#,
        "alibaba/qwen3.6-max-preview",
        vec![RouteCandidate::new(3101, 100)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(SelectProviderRouteQuery {
            context: authenticated_context(),
            catalog_key: "alibaba/qwen3.6-max-preview".to_owned(),
            requested_model: "alibaba/qwen3.6-max-preview".to_owned(),
            api_code: "openai.chat_completions".to_owned(),
            capability: RoutingCapability::Chat,
            billing_meter: BillingMeter::LlmInputToken,
        })
        .unwrap();

    assert_eq!(3101, selection.route.channel_id);
    assert_eq!("dashscope", selection.route.provider_code);
    assert_eq!(
        "qwen3.6-max-preview", selection.route.provider_model,
        "account-pool fallback must send the provider-native model id without vendor/region"
    );
    assert_eq!(Some(2), selection.policy_id);
    assert_eq!(Some(202), selection.rule_id);
}

#[test]
fn selector_routes_group_bound_channel_route_without_explicit_policy_rule() {
    let mut catalog = base_catalog();
    catalog.add_vendor(ModelVendorDefinition::new(
        "alibaba",
        ModelVendor::Alibaba,
        "Alibaba",
    ));
    catalog.add_model(
        AiModel::new(
            "qwen3.6-max-preview",
            "Qwen3.6 Max Preview",
            "alibaba",
            vec!["chat"],
        )
        .with_catalog_key("alibaba/qwen3.6-max-preview"),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "alibaba/qwen3.6-max-preview",
        "qwen3.6-max-preview",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("1.500000").unwrap(),
    ));
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            "alibaba/qwen3.6-max-preview",
            "qwen3.6-max-preview",
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("1.000000").unwrap(),
        )
        .for_provider("dashscope", 3101),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("dashscope", 3101)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/dashscope"),
                Some("vault://providers/dashscope/account/main"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["llm"]),
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(SelectProviderRouteQuery {
            context: authenticated_context(),
            catalog_key: "alibaba/qwen3.6-max-preview".to_owned(),
            requested_model: "alibaba/qwen3.6-max-preview".to_owned(),
            api_code: "openai.chat_completions".to_owned(),
            capability: RoutingCapability::Chat,
            billing_meter: BillingMeter::LlmInputToken,
        })
        .unwrap();

    assert_eq!(3101, selection.route.channel_id);
    assert_eq!("dashscope", selection.route.provider_code);
    assert_eq!(
        "qwen3.6-max-preview", selection.route.provider_model,
        "group-bound account-pool fallback must send the provider-native model id without vendor/region"
    );
    assert_eq!(None, selection.policy_id);
    assert_eq!(None, selection.rule_id);
}

#[test]
fn selector_explains_when_channel_route_exists_but_channel_group_has_no_matching_binding() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter"),
                Some("vault://providers/openrouter/account/main"),
            )
            .with_resource_scoped_group_binding(99, 1, 100, Vec::<String>::new(), vec!["llm"]),
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select(SelectProviderRouteQuery {
            context: authenticated_context(),
            catalog_key: "openai/gpt-4o-mini".to_owned(),
            requested_model: "openai/gpt-4o-mini".to_owned(),
            api_code: "openai.chat_completions".to_owned(),
            capability: RoutingCapability::Chat,
            billing_meter: BillingMeter::LlmInputToken,
        })
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
    let message = error.to_string();
    assert_eq!(
        "provider route is not available for model: openai/gpt-4o-mini",
        message
    );
    assert!(!message.contains("api_key_id"), "{message}");
    assert!(!message.contains("channel_group_id"), "{message}");
    assert!(!message.contains("channel_routes_loaded"), "{message}");
    assert!(!message.contains("any_group_bindings"), "{message}");
    assert!(
        !message.contains("matching_group_bound_channels"),
        "{message}"
    );
}

#[test]
fn selector_restricts_model_route_group_bindings_by_api_scope() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-other-model",
        "gpt-4o-mini-other",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "openrouter-bound-model",
        "gpt-4o-mini-bound",
        "0.120000",
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-other-model", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-other-model"),
                Some("vault://providers/openrouter-other-model/account/main"),
            )
            .with_resource_scoped_group_binding(
                10,
                1,
                100,
                vec!["api.openai.responses"],
                vec!["llm"],
            ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-bound-model", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-bound-model"),
                Some("vault://providers/openrouter-bound-model/account/main"),
            )
            .with_resource_scoped_group_binding(
                10,
                50,
                1,
                vec!["api.openai.chat_completions"],
                vec!["llm"],
            ),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100), RouteCandidate::new(3002, 1)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-bound-model", selection.route.provider_code);
}

#[test]
fn selector_restricts_channel_group_bindings_by_capability_scope() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-image-only", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-image-only"),
                Some("vault://providers/openrouter-image-only/account/main"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["image"]),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-llm", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-llm"),
                Some("vault://providers/openrouter-llm/account/main"),
            )
            .with_resource_scoped_group_binding(10, 50, 1, Vec::<String>::new(), vec!["llm"]),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3001, 100), RouteCandidate::new(3002, 1)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-llm", selection.route.provider_code);
}

#[test]
fn selector_restricts_channel_group_bindings_by_api_scope() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-files-other-api", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-files-other-api"),
                Some("vault://providers/openrouter-files-other-api/account/main"),
            )
            .with_resource_scoped_group_binding(
                10,
                1,
                100,
                vec!["api.openai.responses"],
                vec!["llm"],
            ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-files-api", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-files-api"),
                Some("vault://providers/openrouter-files-api/account/main"),
            )
            .with_resource_scoped_group_binding(10, 50, 1, vec!["api.openai.files"], vec!["llm"]),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3001, 100), RouteCandidate::new(3002, 1)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-files-api", selection.route.provider_code);
}

#[test]
fn selector_rejects_route_key_alias_when_standard_api_code_scope_does_not_match() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-route-key-alias", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-route-key-alias"),
                Some("vault://providers/openrouter-route-key-alias/account/main"),
            )
            .with_resource_scoped_group_binding(
                10,
                1,
                100,
                vec!["openai.management.files"],
                vec!["network"],
            ),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select_channel_route(SelectProviderChannelRouteQuery {
            capability: RoutingCapability::Network,
            ..select_channel_route_query("openai/management/files")
        })
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
}

#[test]
fn selector_routes_provider_native_channel_by_exact_standard_api_code_only() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("kling-generic-image", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/kling-generic-image"),
                Some("vault://providers/kling/account/generic-image"),
            )
            .with_resource_scoped_group_binding(
                10,
                1,
                100,
                vec!["kling.image_generation"],
                vec!["image"],
            ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("kling-video", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/kling-video"),
                Some("vault://providers/kling/account/video"),
            )
            .with_resource_scoped_group_binding(
                10,
                50,
                1,
                vec!["api.kling.text_to_video"],
                vec!["video"],
            ),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"kling.text_to_video"}"#,
        "",
        vec![RouteCandidate::new(3001, 100), RouteCandidate::new(3002, 1)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(SelectProviderChannelRouteQuery {
            context: authenticated_context(),
            route_key: "kling.text_to_video".to_owned(),
            api_code: "kling.text_to_video".to_owned(),
            capability: RoutingCapability::Video,
        })
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("kling-video", selection.route.provider_code);
}

#[test]
fn selector_matches_modeless_channel_route_when_api_scope_matches() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-files-api", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-files-api"),
                Some("vault://providers/openrouter-files-api/account/main"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, vec!["openai.files"], vec!["network"]),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(SelectProviderChannelRouteQuery {
            capability: RoutingCapability::Network,
            ..select_channel_route_query("openai/management/files")
        })
        .unwrap();

    assert_eq!(3001, selection.route.channel_id);
    assert_eq!("openrouter-files-api", selection.route.provider_code);
}

#[test]
fn selector_allows_capability_scoped_channel_route_when_api_scope_is_unrestricted() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-network", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-network"),
                Some("vault://providers/openrouter-network/account/main"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, Vec::<String>::new(), vec!["network"]),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(SelectProviderChannelRouteQuery {
            capability: RoutingCapability::Network,
            ..select_channel_route_query("openai/management/files")
        })
        .unwrap();

    assert_eq!(3001, selection.route.channel_id);
    assert_eq!("openrouter-network", selection.route.provider_code);
}

#[test]
fn selector_matches_channel_group_bindings_by_standard_api_code() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-files-other-api", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-files-other-api"),
                Some("vault://providers/openrouter-files-other-api/account/main"),
            )
            .with_resource_scoped_group_binding(10, 1, 100, vec!["openai.responses"], vec!["llm"]),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-files-api", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-files-api"),
                Some("vault://providers/openrouter-files-api/account/main"),
            )
            .with_resource_scoped_group_binding(10, 50, 1, vec!["openai.files"], vec!["llm"]),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3001, 100), RouteCandidate::new(3002, 1)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-files-api", selection.route.provider_code);
}

#[test]
fn selector_restricts_model_group_bindings_by_api_scope() {
    let mut catalog = base_catalog();
    add_callable_route_for_api(
        &mut catalog,
        3001,
        "openrouter-responses-only",
        "gpt-4o-mini-responses",
        "openai.responses",
        "0.110000",
    );
    add_callable_route(
        &mut catalog,
        3002,
        "openrouter-chat-completions",
        "gpt-4o-mini-chat",
        "0.120000",
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-responses-only", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-responses-only"),
                Some("vault://providers/openrouter-responses-only/account/main"),
            )
            .with_resource_scoped_group_binding(
                10,
                1,
                100,
                vec!["api.openai.responses"],
                vec!["llm"],
            ),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-chat-completions", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-chat-completions"),
                Some("vault://providers/openrouter-chat-completions/account/main"),
            )
            .with_resource_scoped_group_binding(
                10,
                50,
                1,
                vec!["api.openai.chat_completions"],
                vec!["llm"],
            ),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100), RouteCandidate::new(3002, 1)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-chat-completions", selection.route.provider_code);
}

#[test]
fn selector_prefers_channel_model_route_matching_request_api_on_same_channel() {
    let mut catalog = base_catalog();
    add_callable_route_for_api(
        &mut catalog,
        3001,
        "openrouter-responses-only",
        "gpt-4o-mini-responses",
        "openai.responses",
        "0.110000",
    );
    add_callable_route_for_api(
        &mut catalog,
        3001,
        "openrouter-responses-only",
        "gpt-4o-mini-chat",
        "openai.chat_completions",
        "0.110000",
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-responses-only", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-responses-only"),
                Some("vault://providers/openrouter-responses-only/account/main"),
            )
            .with_resource_scoped_group_binding(
                10,
                1,
                100,
                vec!["api.openai.chat_completions"],
                vec!["llm"],
            ),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap();

    assert_eq!(3001, selection.route.channel_id);
    assert_eq!("gpt-4o-mini-chat", selection.route.provider_model);
    assert_eq!(
        Some("openai.chat_completions"),
        selection.route.api_code.as_deref()
    );
}

#[test]
fn selector_prefers_bound_channel_route_priority_over_rule_candidate_weight() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-low-priority", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-low-priority"),
                Some("vault://providers/openrouter-low-priority/account/main"),
            )
            .with_group_binding(10, 20, 100),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-high-priority", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-high-priority"),
                Some("vault://providers/openrouter-high-priority/account/main"),
            )
            .with_group_binding(10, 5, 10),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3001, 100), RouteCandidate::new(3002, 1)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-high-priority", selection.route.provider_code);
}

#[test]
fn selector_uses_bound_channel_route_weight_when_priorities_match() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-lower-weight", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-lower-weight"),
                Some("vault://providers/openrouter-lower-weight/account/main"),
            )
            .with_group_binding(10, 5, 10),
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-higher-weight", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-higher-weight"),
                Some("vault://providers/openrouter-higher-weight/account/main"),
            )
            .with_group_binding(10, 5, 90),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3001, 100), RouteCandidate::new(3002, 1)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap();

    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-higher-weight", selection.route.provider_code);
}

#[test]
fn selector_rejects_channel_route_when_group_bindings_exist_but_not_for_channel_group() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-other-group", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-other-group"),
                Some("vault://providers/openrouter-other-group/account/main"),
            )
            .with_group_binding(99, 1, 100),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
    assert!(error.to_string().contains("configured channel route"));
}

#[test]
fn selector_rejects_model_route_when_group_bindings_exist_but_not_for_channel_group() {
    let mut catalog = base_catalog();
    add_callable_route(
        &mut catalog,
        3001,
        "openrouter-other-group",
        "gpt-4o-mini-other-group",
        "0.110000",
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-other-group", 3001)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-other-group"),
                Some("vault://providers/openrouter-other-group/account/main"),
            )
            .with_group_binding(99, 1, 100),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
    assert!(error
        .to_string()
        .contains("provider route is not available"));
}

#[test]
fn selector_chooses_route_from_explicit_api_key_channel_group_bindings() {
    let mut catalog = base_catalog();
    catalog.add_channel_group(ChannelGroup::new(
        20,
        "premium-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.000000").unwrap(),
    ));
    catalog.add_api_key(
        GatewayApiKey::new(100, 10, "sk-test", "hash:sk-test")
            .with_owner(10, 20, 30)
            .with_group_bindings(vec![
                GatewayApiKeyChannelGroupBinding::new(10, "standard-group", "standard", 100, 100),
                GatewayApiKeyChannelGroupBinding::new(20, "premium-group", "standard", 1, 100),
            ]),
    );
    add_callable_route(
        &mut catalog,
        3002,
        "openrouter-premium",
        "gpt-4o-mini-premium",
        "0.120000",
    );
    catalog.add_provider_channel_route(
        ProviderChannelRoute::new("openrouter-premium", 3002)
            .with_provider_endpoint(
                Some("http://provider-proxy.internal/openrouter-premium"),
                Some("vault://providers/openrouter-premium/account/main"),
            )
            .with_resource_scoped_group_binding(
                20,
                1,
                100,
                vec!["api.openai.chat_completions"],
                vec!["llm"],
            ),
    );
    add_group_policy_rule_for_group(
        &mut catalog,
        20,
        20,
        2020,
        2021,
        r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
        "openai/gpt-4o-mini",
        vec![RouteCandidate::new(3002, 100)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select(select_query())
        .unwrap();

    assert_eq!(20, selection.group_id);
    assert_eq!("premium-group", selection.group_code);
    assert_eq!("standard", selection.pricing_plan_code);
    assert_eq!(3002, selection.route.channel_id);
    assert_eq!("openrouter-premium", selection.route.provider_code);
    assert_eq!(Some(20), selection.policy_id);
    assert_eq!(Some(2021), selection.rule_id);
}

#[test]
fn selector_falls_back_to_global_default_channel_route_when_group_has_no_route_key_rule() {
    let mut catalog = base_catalog();
    add_callable_channel_route(&mut catalog, 3001, "openrouter-default");
    add_callable_channel_route(&mut catalog, 3002, "openrouter-group");
    catalog.add_routing_policy(RoutingPolicy::new(
        1,
        0,
        0,
        "global-management-policy",
        RoutingPolicyScope::Global,
        None,
        Some(101),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            102,
            0,
            0,
            101,
            "global-files-rule",
            1,
            r#"{"routeKey":"openai/management/files"}"#,
            "",
        )
        .with_candidate_channels(vec![RouteCandidate::new(3001, 100)]),
    );
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/other"}"#,
        "",
        vec![RouteCandidate::new(3002, 100)],
        vec![],
    );

    let selection = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap();

    assert_eq!(3001, selection.route.channel_id);
    assert_eq!("openrouter-default", selection.route.provider_code);
    assert_eq!(Some(1), selection.policy_id);
    assert_eq!(Some(102), selection.rule_id);
}

#[test]
fn selector_rejects_channel_route_candidate_without_callable_endpoint() {
    let mut catalog = base_catalog();
    catalog.add_provider_channel_route(ProviderChannelRoute::new("openrouter-main", 3001));
    add_group_policy_rule(
        &mut catalog,
        2,
        201,
        202,
        r#"{"routeKey":"openai/management/files"}"#,
        "",
        vec![RouteCandidate::new(3001, 100)],
        vec![],
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select_channel_route(select_channel_route_query("openai/management/files"))
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
    assert!(error.to_string().contains("callable channel route"));
}

#[test]
fn catalog_resolves_global_model_mapping_before_route_selection() {
    let mut catalog = base_catalog();
    add_target_catalog_model(&mut catalog);
    catalog.add_model_mapping(ModelMappingRule::new(
        1,
        ModelMappingBindingType::Global,
        "sonnet-latest",
        "anthropic/claude-3-5-sonnet",
        100,
    ));
    add_group_policy_rule(
        &mut catalog,
        400,
        401,
        402,
        r#"{"catalogKey":"anthropic/claude-3-5-sonnet"}"#,
        "anthropic/claude-3-5-sonnet",
        vec![RouteCandidate::new(4001, 100)],
        Vec::new(),
    );

    let resolved = catalog
        .resolve_model_mapping(
            "sonnet-latest",
            &ResolveModelMappingContext::new().with_vendor_code("openai"),
        )
        .expect("global mapping should resolve alias");

    assert_eq!("anthropic/claude-3-5-sonnet", resolved.target_model);
    assert_eq!(ModelMappingBindingType::Global, resolved.binding_type);
    let selection = ProviderRouteSelector::new(&catalog)
        .select_plan(SelectProviderRouteQuery {
            catalog_key: resolved.target_model.clone(),
            requested_model: "sonnet-latest".to_owned(),
            ..select_query()
        })
        .expect("mapped model should route through target catalog");
    assert_eq!(
        "anthropic/claude-3-5-sonnet",
        selection.routes[0].route.catalog_key
    );
    assert_eq!("anthropic-direct", selection.routes[0].route.provider_code);
}

#[test]
fn catalog_model_mapping_prefers_channel_scope_over_vendor_and_global() {
    let mut catalog = base_catalog();
    catalog.add_model_mapping(ModelMappingRule::new(
        1,
        ModelMappingBindingType::Global,
        "gpt-4o-mini",
        "global-target",
        100,
    ));
    catalog.add_model_mapping(
        ModelMappingRule::new(
            2,
            ModelMappingBindingType::Vendor,
            "gpt-4o-mini",
            "vendor-target",
            100,
        )
        .with_binding_code("openai"),
    );
    catalog.add_model_mapping(
        ModelMappingRule::new(
            3,
            ModelMappingBindingType::Channel,
            "gpt-4o-mini",
            "channel-target",
            100,
        )
        .with_binding_id(3001),
    );

    let resolved = catalog
        .resolve_model_mapping(
            "gpt-4o-mini",
            &ResolveModelMappingContext::new()
                .with_vendor_code("openai")
                .with_channel_id(3001),
        )
        .expect("channel mapping should resolve");

    assert_eq!(ModelMappingBindingType::Channel, resolved.binding_type);
    assert_eq!("channel-target", resolved.target_model);
}

#[test]
fn catalog_model_mapping_matches_channel_group_and_channel_codes_from_context() {
    let mut catalog = base_catalog();
    catalog.add_model_mapping(
        ModelMappingRule::new(
            10,
            ModelMappingBindingType::ChannelGroup,
            "gpt-4o-mini",
            "group-target",
            10,
        )
        .with_binding_code("standard-group"),
    );
    catalog.add_model_mapping(
        ModelMappingRule::new(
            11,
            ModelMappingBindingType::Channel,
            "gpt-4o-mini",
            "channel-code-target",
            10,
        )
        .with_binding_code("openrouter-main"),
    );

    let resolved = catalog
        .resolve_model_mapping(
            "gpt-4o-mini",
            &ResolveModelMappingContext::new()
                .with_channel_code("openrouter-main")
                .with_channel_group_code("standard-group"),
        )
        .expect("channel code mapping should resolve ahead of channel group code");

    assert_eq!(ModelMappingBindingType::Channel, resolved.binding_type);
    assert_eq!("channel-code-target", resolved.target_model);
}
