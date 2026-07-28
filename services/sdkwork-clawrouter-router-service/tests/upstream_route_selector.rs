use std::collections::BTreeMap;

use sdkwork_clawrouter_router_service::application::{
    AuthenticatedApiKeyContext, ProviderRouteSelectionErrorKind, ProviderRouteSelector,
    SelectProviderRouteQuery, SelectUpstreamAccountRouteQuery,
};
use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, GatewayApiKeyAccountGroupBinding,
    ModelPrice, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, RouteCandidate,
    RoutingCapability, RoutingPolicy, RoutingPolicyScope, RoutingRule, UpstreamAccountFallbackMode,
    UpstreamAccountGroup, UpstreamAccountGroupBinding, UpstreamAccountRoute,
    UpstreamAccountRoutingStrategy, UpstreamResourceEntitlement,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const USER_ID: i64 = 30;
const API_KEY_ID: i64 = 100;
const MODEL_CATALOG_KEY: &str = "openai/gpt-4o-mini";
const MODEL_ID: &str = "gpt-4o-mini";
const API_CODE: &str = "openai.chat_completions";

fn decimal(value: &str) -> DecimalValue {
    DecimalValue::parse(value).unwrap()
}

fn account_group(
    id: i64,
    strategy: UpstreamAccountRoutingStrategy,
    fallback_mode: UpstreamAccountFallbackMode,
) -> UpstreamAccountGroup {
    UpstreamAccountGroup::new_scoped(
        id,
        TENANT_ID,
        ORGANIZATION_ID,
        &format!("group-{id}"),
        "standard",
        decimal("1.000000"),
        decimal("1.100000"),
    )
    .with_routing_strategy(strategy)
    .with_fallback_mode(fallback_mode)
}

fn catalog_for_group(group: UpstreamAccountGroup) -> InMemoryPricingCatalog {
    let group_id = group.id;
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(
        AiModel::new(MODEL_ID, "GPT-4o mini", "openai", vec!["chat", "tools"])
            .with_catalog_key(MODEL_CATALOG_KEY),
    );
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::ONE,
        Money::usd("0.000000").unwrap(),
    ));
    catalog.add_price(ModelPrice::new_for_catalog_key(
        MODEL_CATALOG_KEY,
        MODEL_ID,
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("0.150000").unwrap(),
    ));
    catalog.add_upstream_account_group(group);
    catalog.add_api_key(
        GatewayApiKey::new(API_KEY_ID, group_id, "sk-test", "hash:sk-test").with_owner(
            TENANT_ID,
            ORGANIZATION_ID,
            USER_ID,
        ),
    );
    catalog
}

fn context(group_id: i64) -> AuthenticatedApiKeyContext {
    AuthenticatedApiKeyContext {
        api_key_id: API_KEY_ID,
        tenant_id: TENANT_ID,
        organization_id: ORGANIZATION_ID,
        user_id: USER_ID,
        api_key_name_snapshot: "sk-test".to_owned(),
        group_id,
        group_code: format!("group-{group_id}"),
        pricing_plan_code: "standard".to_owned(),
    }
}

fn model_query(group_id: i64) -> SelectProviderRouteQuery {
    SelectProviderRouteQuery {
        context: context(group_id),
        catalog_key: MODEL_CATALOG_KEY.to_owned(),
        requested_model: MODEL_ID.to_owned(),
        api_code: API_CODE.to_owned(),
        capability: RoutingCapability::Chat,
        billing_meter: BillingMeter::LlmInputToken,
    }
}

fn account_route(
    group_id: i64,
    account_id: i64,
    supplier_code: &str,
    member_priority: i32,
    member_weight: i32,
) -> UpstreamAccountRoute {
    UpstreamAccountRoute::new(supplier_code, account_id)
        .with_account_code(&format!("account-{account_id}"))
        .with_endpoint(Some(account_id * 10), Some("primary"))
        .with_endpoint_routing(100, 100, 1)
        .with_credential(Some(account_id * 100), "priority", 100, 100)
        .with_upstream_endpoint(
            Some(format!("https://{supplier_code}.example.com/v1")),
            Some(format!(
                "managed://upstream-account-credential/{}",
                account_id * 100
            )),
        )
        .with_account_group_binding(group_id, member_priority, member_weight)
}

fn add_route_and_price(catalog: &mut InMemoryPricingCatalog, route: UpstreamAccountRoute) {
    let supplier_code = route.supplier_code.clone();
    let account_id = route.account_id;
    let region_code = route.region_code.clone();
    catalog.add_upstream_account_route(route);
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            MODEL_CATALOG_KEY,
            MODEL_ID,
            PriceSide::UpstreamCost,
            BillingMeter::LlmInputToken,
            Money::usd("0.100000").unwrap(),
        )
        .with_region_code(&region_code)
        .for_upstream_account(&supplier_code, account_id),
    );
}

fn add_model_policy(
    catalog: &mut InMemoryPricingCatalog,
    group_id: i64,
    candidates: Vec<RouteCandidate>,
) {
    let profile_id = 10_000 + group_id;
    catalog.add_routing_policy(RoutingPolicy::new(
        20_000 + group_id,
        TENANT_ID,
        ORGANIZATION_ID,
        &format!("group-{group_id}-policy"),
        RoutingPolicyScope::UpstreamAccountGroup,
        Some(group_id),
        Some(profile_id),
    ));
    catalog.add_routing_rule(
        RoutingRule::new(
            30_000 + group_id,
            TENANT_ID,
            ORGANIZATION_ID,
            profile_id,
            &format!("group-{group_id}-model-rule"),
            1,
            r#"{"catalogKey":"openai/gpt-4o-mini"}"#,
            MODEL_CATALOG_KEY,
        )
        .with_candidate_account_groups(candidates),
    );
}

fn select_account(catalog: &InMemoryPricingCatalog, group_id: i64) -> i64 {
    ProviderRouteSelector::new(catalog)
        .select(model_query(group_id))
        .unwrap()
        .route
        .account_id
}

#[test]
fn group_bound_account_routes_work_without_an_explicit_policy() {
    let group_id = 10;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "openai-direct", 1, 100),
    );

    let selected = ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .unwrap();

    assert_eq!(3001, selected.route.account_id);
    assert_eq!(group_id, selected.group_id);
    assert_eq!(None, selected.policy_id);
    assert_eq!("gpt-4o-mini", selected.route.provider_model);
}

#[test]
fn routing_rule_candidates_are_account_group_ids_not_account_ids() {
    let group_id = 11;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "openai-direct", 1, 100),
    );
    add_model_policy(&mut catalog, group_id, vec![RouteCandidate::new(3001, 100)]);

    let error = ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
    assert!(error.to_string().contains("no callable priced candidate"));
}

#[test]
fn matching_group_policy_selects_an_account_inside_the_group() {
    let group_id = 12;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "openai-direct", 20, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "openrouter", 1, 100),
    );
    add_model_policy(
        &mut catalog,
        group_id,
        vec![RouteCandidate::new(group_id, 100)],
    );

    let selected = ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .unwrap();

    assert_eq!(3002, selected.route.account_id);
    assert_eq!(Some(20_000 + group_id), selected.policy_id);
    assert_eq!(Some(30_000 + group_id), selected.rule_id);
}

#[test]
fn authenticated_api_key_scope_mismatch_fails_closed() {
    let group_id = 13;
    let catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let mut query = model_query(group_id);
    query.context.tenant_id = 999;

    let error = ProviderRouteSelector::new(&catalog)
        .select(query)
        .unwrap_err();

    assert!(error
        .to_string()
        .contains("authenticated api key context does not match catalog ownership"));
}

#[test]
fn failover_strategy_uses_member_priority_before_weight() {
    let group_id = 14;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 10, 1000),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "supplier-b", 1, 1),
    );

    assert_eq!(3002, select_account(&catalog, group_id));
}

#[test]
fn weighted_strategy_distributes_requests_by_member_weight() {
    let group_id = 90_001;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Weighted,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 1),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "supplier-b", 1, 3),
    );

    let mut counts = BTreeMap::new();
    for _ in 0..4 {
        *counts
            .entry(select_account(&catalog, group_id))
            .or_insert(0) += 1;
    }

    assert_eq!(Some(&1), counts.get(&3001));
    assert_eq!(Some(&3), counts.get(&3002));
}

#[test]
fn weighted_strategy_never_selects_a_zero_weight_member_when_positive_weight_exists() {
    let group_id = 90_002;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Weighted,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-zero", 1, 0),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "supplier-positive", 1, 100),
    );

    for _ in 0..8 {
        assert_eq!(3002, select_account(&catalog, group_id));
    }
}

#[test]
fn round_robin_strategy_rotates_accounts_in_the_active_priority_tier() {
    let group_id = 90_003;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::RoundRobin,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "supplier-b", 1, 100),
    );

    let selections = (0..4)
        .map(|_| select_account(&catalog, group_id))
        .collect::<Vec<_>>();

    assert_eq!(vec![3001, 3002, 3001, 3002], selections);
}

#[test]
fn least_latency_strategy_prefers_the_fastest_measured_account() {
    let group_id = 15;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::LeastLatency,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100).with_last_latency_ms(Some(240)),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "supplier-b", 1, 100).with_last_latency_ms(Some(35)),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3003, "supplier-c", 1, 100).with_last_latency_ms(None),
    );

    assert_eq!(3002, select_account(&catalog, group_id));
}

#[test]
fn least_cost_strategy_uses_contract_group_and_member_multipliers() {
    let group_id = 16;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::LeastCost,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100)
            .with_contract_cost_multiplier(decimal("0.800000")),
    );
    let cheaper_binding = UpstreamAccountGroupBinding::new(group_id, 1, 100)
        .with_cost_multiplier_override(Some(decimal("0.500000")));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "supplier-b", 1, 100)
            .with_contract_cost_multiplier(decimal("1.200000"))
            .with_account_group_bindings(vec![cheaper_binding]),
    );

    assert_eq!(3002, select_account(&catalog, group_id));
}

#[test]
fn fallback_mode_none_returns_only_the_primary_account() {
    let group_id = 17;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "supplier-b", 2, 100),
    );

    let plan = ProviderRouteSelector::new(&catalog)
        .select_plan(model_query(group_id))
        .unwrap();

    assert_eq!(
        vec![3001],
        plan.routes
            .iter()
            .map(|item| item.route.account_id)
            .collect::<Vec<_>>()
    );
}

#[test]
fn fallback_mode_same_supplier_excludes_other_suppliers() {
    let group_id = 18;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::SameSupplier,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "supplier-a", 2, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3003, "supplier-b", 3, 100),
    );

    let plan = ProviderRouteSelector::new(&catalog)
        .select_plan(model_query(group_id))
        .unwrap();
    let accounts = plan
        .routes
        .iter()
        .map(|item| item.route.account_id)
        .collect::<Vec<_>>();

    assert_eq!(vec![3001, 3002], accounts);
}

#[test]
fn fallback_mode_cross_supplier_keeps_the_ordered_fallback_chain() {
    let group_id = 19;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::CrossSupplier,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "supplier-b", 2, 100),
    );

    let plan = ProviderRouteSelector::new(&catalog)
        .select_plan(model_query(group_id))
        .unwrap();

    assert_eq!(
        vec![3001, 3002],
        plan.routes
            .iter()
            .map(|item| item.route.account_id)
            .collect::<Vec<_>>()
    );
}

#[test]
fn endpoint_priority_is_applied_after_account_selection() {
    let group_id = 20;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let base = account_route(group_id, 3001, "supplier-a", 1, 100);
    add_route_and_price(
        &mut catalog,
        base.clone()
            .with_endpoint(Some(901), Some("secondary"))
            .with_endpoint_routing(50, 100, 1)
            .with_upstream_endpoint(
                Some("https://secondary.example.com/v1"),
                Some("managed://upstream-account-credential/300100"),
            ),
    );
    add_route_and_price(
        &mut catalog,
        base.with_endpoint(Some(900), Some("primary"))
            .with_endpoint_routing(1, 1, 1)
            .with_upstream_endpoint(
                Some("https://primary.example.com/v1"),
                Some("managed://upstream-account-credential/300100"),
            ),
    );

    let selected = ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .unwrap();

    assert_eq!(
        Some("https://primary.example.com/v1"),
        selected.route.base_url.as_deref()
    );
}

#[test]
fn endpoint_weight_distributes_equal_priority_base_urls() {
    let group_id = 90_004;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let base = account_route(group_id, 3001, "supplier-a", 1, 100);
    add_route_and_price(
        &mut catalog,
        base.clone()
            .with_endpoint(Some(900), Some("light"))
            .with_endpoint_routing(1, 1, 1)
            .with_upstream_endpoint(
                Some("https://light.example.com/v1"),
                Some("managed://upstream-account-credential/300100"),
            ),
    );
    add_route_and_price(
        &mut catalog,
        base.with_endpoint(Some(901), Some("heavy"))
            .with_endpoint_routing(1, 3, 1)
            .with_upstream_endpoint(
                Some("https://heavy.example.com/v1"),
                Some("managed://upstream-account-credential/300100"),
            ),
    );

    let mut counts = BTreeMap::new();
    for _ in 0..4 {
        let url = ProviderRouteSelector::new(&catalog)
            .select(model_query(group_id))
            .unwrap()
            .route
            .base_url
            .unwrap();
        *counts.entry(url).or_insert(0) += 1;
    }

    assert_eq!(Some(&1), counts.get("https://light.example.com/v1"));
    assert_eq!(Some(&3), counts.get("https://heavy.example.com/v1"));
}

#[test]
fn unhealthy_endpoint_is_never_selected() {
    let group_id = 21;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "unhealthy", 1, 100).with_endpoint_routing(1, 100, 0),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "healthy", 2, 100),
    );

    assert_eq!(3002, select_account(&catalog, group_id));
}

#[test]
fn credential_priority_is_applied_inside_the_selected_endpoint() {
    let group_id = 22;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let base = account_route(group_id, 3001, "supplier-a", 1, 100);
    add_route_and_price(
        &mut catalog,
        base.clone().with_credential(Some(2), "priority", 20, 100),
    );
    add_route_and_price(
        &mut catalog,
        base.with_credential(Some(1), "priority", 1, 1),
    );

    let selected = ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .unwrap();

    assert_eq!(Some(1), selected.route.credential_id);
}

#[test]
fn credential_round_robin_rotates_equal_priority_credentials() {
    let group_id = 90_005;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let base = account_route(group_id, 3001, "supplier-a", 1, 100);
    add_route_and_price(
        &mut catalog,
        base.clone().with_credential(Some(1), "round_robin", 1, 100),
    );
    add_route_and_price(
        &mut catalog,
        base.with_credential(Some(2), "round_robin", 1, 100),
    );

    let credentials = (0..4)
        .map(|_| {
            ProviderRouteSelector::new(&catalog)
                .select(model_query(group_id))
                .unwrap()
                .route
                .credential_id
                .unwrap()
        })
        .collect::<Vec<_>>();

    assert_eq!(vec![1, 2, 1, 2], credentials);
}

#[test]
fn configured_empty_resource_intersection_is_fail_closed() {
    let group_id = 23;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let binding =
        UpstreamAccountGroupBinding::new(group_id, 1, 100).with_resource_entitlements(Vec::new());
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100)
            .with_account_group_bindings(vec![binding]),
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
}

#[test]
fn every_configured_resource_dimension_must_match_the_request() {
    let group_id = 24;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let mut entitlement = UpstreamResourceEntitlement::new("model:gpt-4o-mini", "model");
    entitlement.vendor_code = Some("openai".to_owned());
    entitlement.catalog_key = Some(MODEL_CATALOG_KEY.to_owned());
    entitlement.model = Some(MODEL_ID.to_owned());
    entitlement.provider_native_model = Some(MODEL_ID.to_owned());
    entitlement.api_code = Some(API_CODE.to_owned());
    entitlement.modality_code = Some("chat".to_owned());
    let binding = UpstreamAccountGroupBinding::new(group_id, 1, 100)
        .with_resource_entitlements(vec![entitlement]);
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100)
            .with_account_group_bindings(vec![binding]),
    );

    assert_eq!(3001, select_account(&catalog, group_id));
}

#[test]
fn one_mismatched_resource_dimension_denies_the_route() {
    let group_id = 25;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let mut entitlement = UpstreamResourceEntitlement::new("model:gpt-4o-mini", "model");
    entitlement.catalog_key = Some(MODEL_CATALOG_KEY.to_owned());
    entitlement.api_code = Some("openai.embeddings".to_owned());
    let binding = UpstreamAccountGroupBinding::new(group_id, 1, 100)
        .with_resource_entitlements(vec![entitlement]);
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100)
            .with_account_group_bindings(vec![binding]),
    );

    assert!(ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .is_err());
}

#[test]
fn member_api_scope_and_capability_are_both_enforced() {
    let group_id = 26;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let binding = UpstreamAccountGroupBinding::new_resource_scoped(
        group_id,
        1,
        100,
        vec!["openai.embeddings"],
        vec!["image"],
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100)
            .with_account_group_bindings(vec![binding]),
    );

    assert!(ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .is_err());
}

#[test]
fn region_scoped_group_candidate_selects_the_matching_deployment() {
    let group_id = 27;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100).with_region_code("us"),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100).with_region_code("cn"),
    );
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            MODEL_CATALOG_KEY,
            MODEL_ID,
            PriceSide::OfficialReference,
            BillingMeter::LlmInputToken,
            Money::usd("0.150000").unwrap(),
        )
        .with_region_code("cn"),
    );
    add_model_policy(
        &mut catalog,
        group_id,
        vec![RouteCandidate::new(group_id, 100).with_region_code("cn")],
    );

    let selected = ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .unwrap();

    assert_eq!("cn", selected.route.region_code);
}

#[test]
fn callable_route_without_upstream_price_reports_pricing_unavailable() {
    let group_id = 28;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    catalog.add_upstream_account_route(account_route(
        group_id,
        3001,
        "supplier-without-price",
        1,
        100,
    ));

    let error = ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::PricingUnavailable,
        error.kind()
    );
}

#[test]
fn missing_endpoint_or_credential_is_not_callable() {
    let group_id = 29;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    catalog.add_upstream_account_route(
        UpstreamAccountRoute::new("supplier-a", 3001).with_account_group_binding(group_id, 1, 100),
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .unwrap_err();

    assert_eq!(
        ProviderRouteSelectionErrorKind::ProviderRouteUnavailable,
        error.kind()
    );
}

#[test]
fn api_key_account_group_binding_priority_selects_the_premium_group() {
    let standard_group_id = 30;
    let premium_group_id = 31;
    let mut catalog = catalog_for_group(account_group(
        standard_group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    catalog.add_upstream_account_group(account_group(
        premium_group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    catalog.add_api_key(
        GatewayApiKey::new(API_KEY_ID, standard_group_id, "sk-test", "hash:sk-test")
            .with_owner(TENANT_ID, ORGANIZATION_ID, USER_ID)
            .with_account_group_bindings(vec![
                GatewayApiKeyAccountGroupBinding::new(
                    standard_group_id,
                    "standard",
                    "standard",
                    100,
                    100,
                ),
                GatewayApiKeyAccountGroupBinding::new(
                    premium_group_id,
                    "premium",
                    "standard",
                    1,
                    100,
                ),
            ]),
    );
    add_route_and_price(
        &mut catalog,
        account_route(premium_group_id, 4001, "premium-supplier", 1, 100),
    );

    let selected = ProviderRouteSelector::new(&catalog)
        .select(model_query(standard_group_id))
        .unwrap();

    assert_eq!(premium_group_id, selected.group_id);
    assert_eq!(4001, selected.route.account_id);
}

#[test]
fn route_key_requests_use_the_same_group_strategy() {
    let group_id = 32;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 20, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "supplier-b", 1, 100),
    );

    let selected = ProviderRouteSelector::new(&catalog)
        .select_channel_route(SelectUpstreamAccountRouteQuery {
            context: context(group_id),
            route_key: "openai.files".to_owned(),
            api_code: "openai.files".to_owned(),
            capability: RoutingCapability::Network,
        })
        .unwrap();

    assert_eq!(3002, selected.route.account_id);
}

#[test]
fn non_positive_cost_multiplier_is_rejected_as_invalid_routing_configuration() {
    let group_id = 33;
    let mut invalid_group = account_group(
        group_id,
        UpstreamAccountRoutingStrategy::LeastCost,
        UpstreamAccountFallbackMode::None,
    );
    invalid_group.cost_multiplier = DecimalValue::ZERO;
    let mut catalog = catalog_for_group(invalid_group);
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100),
    );

    let error = ProviderRouteSelector::new(&catalog)
        .select(model_query(group_id))
        .unwrap_err();

    assert!(error
        .to_string()
        .contains("cost multiplier must be positive"));
}
