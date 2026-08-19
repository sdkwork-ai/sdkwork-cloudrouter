use std::collections::BTreeMap;

use sdkwork_cloudrouter_router_service::application::{
    AuthenticatedApiKeyContext, SelectUpstreamAccountRouteQuery, SelectUpstreamModelRouteQuery,
    UpstreamRouteSelectionErrorKind, UpstreamRouteSelector,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, BillingMeter, DecimalValue, GatewayApiKey, GatewayApiKeyAccountGroupBinding,
    ModelPrice, ModelVendor, ModelVendorDefinition, Money, PriceSide, PricingPlan, RouteCandidate,
    RoutingCapability, RoutingPolicy, RoutingPolicyScope, RoutingRule, UpstreamAccountFallbackMode,
    UpstreamAccountGroup, UpstreamAccountGroupBinding, UpstreamAccountRoute,
    UpstreamAccountRoutingStrategy, UpstreamResourceEntitlement,
};
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_cloudrouter_router_service::ports::{AccountGroupModelAccess, VendorModelListEntry};

const TENANT_ID: i64 = 10;
const ORGANIZATION_ID: i64 = 20;
const USER_ID: i64 = 30;
const API_KEY_ID: i64 = 100;
const MODEL_CATALOG_KEY: &str = "openai/gpt-4o-mini";
const MODEL_ID: &str = "gpt-4o-mini";
const API_CODE: &str = "openai.chat_completions";
/// Model-less (api-request-metered) surface, e.g. the files API. The catalog
/// carries a resource model under this catalog key so pricing can resolve.
const RESOURCE_ROUTE_KEY: &str = "openai/management/files";
const RESOURCE_API_CODE: &str = "openai.files";

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
    // Resource model for model-less (api-request-metered) surfaces such as
    // the files API; its ApiRequest price is added per account by
    // `add_route_and_price`.
    catalog.add_model(
        AiModel::new(
            "management/files",
            "OpenAI Files API",
            "openai",
            vec!["network"],
        )
        .with_catalog_key(RESOURCE_ROUTE_KEY),
    );
    catalog.add_price(ModelPrice::new_for_catalog_key(
        RESOURCE_ROUTE_KEY,
        "management/files",
        PriceSide::OfficialReference,
        BillingMeter::ApiRequest,
        Money::usd("0.010000").unwrap(),
    ));
    catalog.add_plan(PricingPlan::new(
        "standard",
        PriceSide::OfficialReference,
        DecimalValue::ONE,
        Money::usd("0.000000").unwrap(),
    ));
    // Composite (chat) billing settles input, output, and cache-read meters,
    // so the official reference must exist for all three.
    for meter in [
        BillingMeter::LlmInputToken,
        BillingMeter::LlmOutputToken,
        BillingMeter::LlmCacheReadToken,
    ] {
        catalog.add_price(ModelPrice::new_for_catalog_key(
            MODEL_CATALOG_KEY,
            MODEL_ID,
            PriceSide::OfficialReference,
            meter,
            Money::usd("0.150000").unwrap(),
        ));
    }
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

fn model_query(group_id: i64) -> SelectUpstreamModelRouteQuery {
    SelectUpstreamModelRouteQuery {
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
    // Composite (chat) billing settles input, output, and cache-read meters,
    // so the upstream cost must exist for all three.
    for meter in [
        BillingMeter::LlmInputToken,
        BillingMeter::LlmOutputToken,
        BillingMeter::LlmCacheReadToken,
    ] {
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                MODEL_CATALOG_KEY,
                MODEL_ID,
                PriceSide::UpstreamCost,
                meter,
                Money::usd("0.100000").unwrap(),
            )
            .with_region_code(&region_code)
            .for_upstream_account(&supplier_code, account_id),
        );
    }
    // Api-request upstream cost for model-less surfaces (files etc.).
    catalog.add_price(
        ModelPrice::new_for_catalog_key(
            RESOURCE_ROUTE_KEY,
            "management/files",
            PriceSide::UpstreamCost,
            BillingMeter::ApiRequest,
            Money::usd("0.005000").unwrap(),
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

fn account_route_query(group_id: i64) -> SelectUpstreamAccountRouteQuery {
    SelectUpstreamAccountRouteQuery {
        context: context(group_id),
        route_key: RESOURCE_ROUTE_KEY.to_owned(),
        api_code: RESOURCE_API_CODE.to_owned(),
        capability: RoutingCapability::Network,
    }
}

fn select_account(catalog: &InMemoryPricingCatalog, group_id: i64) -> i64 {
    UpstreamRouteSelector::new(catalog)
        .select_model_route(model_query(group_id))
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

    let selected = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
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

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();

    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
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

    let selected = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
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

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(query)
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

    let plan = UpstreamRouteSelector::new(&catalog)
        .select_model_route_plan(model_query(group_id))
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

    let plan = UpstreamRouteSelector::new(&catalog)
        .select_model_route_plan(model_query(group_id))
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

    let plan = UpstreamRouteSelector::new(&catalog)
        .select_model_route_plan(model_query(group_id))
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

    let selected = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
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
        let url = UpstreamRouteSelector::new(&catalog)
            .select_model_route(model_query(group_id))
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
fn failing_endpoint_is_never_selected() {
    let group_id = 21;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    // health=2（失败中且未过冷却）的端点必须被剔除
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "unhealthy", 1, 100).with_endpoint_routing(1, 100, 2),
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

    let selected = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
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
            UpstreamRouteSelector::new(&catalog)
                .select_model_route(model_query(group_id))
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

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();

    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
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

    assert!(UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
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

    assert!(UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
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
    for meter in [
        BillingMeter::LlmInputToken,
        BillingMeter::LlmOutputToken,
        BillingMeter::LlmCacheReadToken,
    ] {
        catalog.add_price(
            ModelPrice::new_for_catalog_key(
                MODEL_CATALOG_KEY,
                MODEL_ID,
                PriceSide::OfficialReference,
                meter,
                Money::usd("0.150000").unwrap(),
            )
            .with_region_code("cn"),
        );
    }
    add_model_policy(
        &mut catalog,
        group_id,
        vec![RouteCandidate::new(group_id, 100).with_region_code("cn")],
    );

    let selected = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
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

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();

    assert_eq!(
        UpstreamRouteSelectionErrorKind::PricingUnavailable,
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

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();

    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
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

    let selected = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(standard_group_id))
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

    let selected = UpstreamRouteSelector::new(&catalog)
        .select_account_route(SelectUpstreamAccountRouteQuery {
            context: context(group_id),
            route_key: RESOURCE_ROUTE_KEY.to_owned(),
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

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();

    assert!(error
        .to_string()
        .contains("cost multiplier must be positive"));
}

#[test]
fn model_route_fails_fast_with_clear_error_when_group_has_no_supporting_account() {
    let group_id = 50;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    // An account exists in the group, but its resource entitlements only
    // authorize the embeddings api, not the requested chat completion.
    let mut entitlement = UpstreamResourceEntitlement::new("api:embeddings", "api");
    entitlement.api_code = Some("openai.embeddings".to_owned());
    let binding = UpstreamAccountGroupBinding::new(group_id, 1, 100)
        .with_resource_entitlements(vec![entitlement]);
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100)
            .with_account_group_bindings(vec![binding]),
    );

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();

    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind()
    );
    assert!(error
        .to_string()
        .contains("no upstream account in account group group-50"));
}

#[test]
fn account_route_api_resource_entitlement_must_match_the_request() {
    let group_id = 51;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let mut entitlement = UpstreamResourceEntitlement::new("api:files", "api");
    entitlement.api_code = Some("openai.files".to_owned());
    entitlement.modality_code = Some("network".to_owned());
    let binding = UpstreamAccountGroupBinding::new(group_id, 1, 100)
        .with_resource_entitlements(vec![entitlement]);
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100)
            .with_account_group_bindings(vec![binding]),
    );

    let query = SelectUpstreamAccountRouteQuery {
        context: context(group_id),
        route_key: RESOURCE_ROUTE_KEY.to_owned(),
        api_code: "openai.files".to_owned(),
        capability: RoutingCapability::Network,
    };
    let selected = UpstreamRouteSelector::new(&catalog)
        .select_account_route(query)
        .unwrap();

    assert_eq!(3001, selected.route.account_id);
}

#[test]
fn account_route_denies_api_resource_not_covered_by_entitlements() {
    let group_id = 52;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let mut entitlement = UpstreamResourceEntitlement::new("api:embeddings", "api");
    entitlement.api_code = Some("openai.embeddings".to_owned());
    let binding = UpstreamAccountGroupBinding::new(group_id, 1, 100)
        .with_resource_entitlements(vec![entitlement]);
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100)
            .with_account_group_bindings(vec![binding]),
    );

    let query = SelectUpstreamAccountRouteQuery {
        context: context(group_id),
        route_key: RESOURCE_ROUTE_KEY.to_owned(),
        api_code: "openai.files".to_owned(),
        capability: RoutingCapability::Network,
    };
    let error = UpstreamRouteSelector::new(&catalog)
        .select_account_route(query)
        .unwrap_err();

    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind()
    );
    assert!(error
        .to_string()
        .contains("no upstream account in account group group-52"));
}

#[test]
fn account_route_model_scoped_entitlement_fails_closed_on_model_less_request() {
    let group_id = 53;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    let mut entitlement = UpstreamResourceEntitlement::new("model:gpt-4o-mini", "model");
    entitlement.catalog_key = Some(MODEL_CATALOG_KEY.to_owned());
    let binding = UpstreamAccountGroupBinding::new(group_id, 1, 100)
        .with_resource_entitlements(vec![entitlement]);
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100)
            .with_account_group_bindings(vec![binding]),
    );

    let query = SelectUpstreamAccountRouteQuery {
        context: context(group_id),
        route_key: RESOURCE_ROUTE_KEY.to_owned(),
        api_code: "openai.files".to_owned(),
        capability: RoutingCapability::Network,
    };
    let error = UpstreamRouteSelector::new(&catalog)
        .select_account_route(query)
        .unwrap_err();

    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind()
    );
}

fn add_route_with_input_cost_only(
    catalog: &mut InMemoryPricingCatalog,
    route: UpstreamAccountRoute,
) {
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

#[test]
fn pricing_gap_in_one_bound_group_falls_back_to_another_group() {
    let standard_group_id = 40;
    let priced_group_id = 41;
    let mut catalog = catalog_for_group(account_group(
        standard_group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    catalog.add_upstream_account_group(account_group(
        priced_group_id,
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
                    priced_group_id,
                    "priced",
                    "standard",
                    1,
                    100,
                ),
            ]),
    );
    // The higher-priority group only has an input price; the lower-priority
    // group is fully priced. A pricing gap in one bound group must not fail
    // the whole request.
    add_route_with_input_cost_only(
        &mut catalog,
        account_route(standard_group_id, 3001, "supplier-a", 1, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(priced_group_id, 4001, "supplier-b", 1, 100),
    );

    let selected = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(standard_group_id))
        .unwrap();

    assert_eq!(priced_group_id, selected.group_id);
    assert_eq!(4001, selected.route.account_id);
}

#[test]
fn candidate_with_missing_output_price_yields_to_priced_candidate() {
    let group_id = 42;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    add_route_with_input_cost_only(
        &mut catalog,
        account_route(group_id, 3001, "supplier-a", 1, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "supplier-b", 2, 100),
    );

    let selected = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap();

    assert_eq!(3002, selected.route.account_id);
}

#[test]
fn account_route_without_api_request_price_reports_pricing_unavailable() {
    let group_id = 43;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    catalog.add_upstream_account_route(account_route(group_id, 3001, "supplier-a", 1, 100));

    let query = SelectUpstreamAccountRouteQuery {
        context: context(group_id),
        route_key: RESOURCE_ROUTE_KEY.to_owned(),
        api_code: RESOURCE_API_CODE.to_owned(),
        capability: RoutingCapability::Network,
    };
    let error = UpstreamRouteSelector::new(&catalog)
        .select_account_route(query)
        .unwrap_err();

    assert_eq!(
        UpstreamRouteSelectionErrorKind::PricingUnavailable,
        error.kind()
    );
}

#[test]
fn group_model_blacklist_forbids_the_model_for_the_whole_group() {
    let group_id = 10;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 201, "openai", 100, 100),
    );
    catalog.set_account_group_model_access(AccountGroupModelAccess {
        group_id,
        blacklist: vec![VendorModelListEntry {
            vendor_code: "openai".to_owned(),
            models: vec![MODEL_ID.to_owned()],
        }],
        whitelist: Vec::new(),
    });

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .expect_err("blacklisted model must be rejected");
    assert_eq!(
        UpstreamRouteSelectionErrorKind::ModelForbidden,
        error.kind()
    );
    assert!(error.to_string().contains("model blacklist"));
}

#[test]
fn group_model_blacklist_vendor_wide_entry_blocks_every_model_of_the_vendor() {
    let group_id = 10;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 201, "openai", 100, 100),
    );
    catalog.set_account_group_model_access(AccountGroupModelAccess {
        group_id,
        blacklist: vec![VendorModelListEntry {
            vendor_code: "openai".to_owned(),
            models: Vec::new(),
        }],
        whitelist: Vec::new(),
    });

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .expect_err("vendor-wide blacklist entry must reject the model");
    assert_eq!(
        UpstreamRouteSelectionErrorKind::ModelForbidden,
        error.kind()
    );
}

#[test]
fn group_model_blacklist_matching_is_case_insensitive() {
    let group_id = 10;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 201, "openai", 100, 100),
    );
    catalog.set_account_group_model_access(AccountGroupModelAccess {
        group_id,
        blacklist: vec![VendorModelListEntry {
            vendor_code: "openai".to_owned(),
            models: vec!["GPT-4O-MINI".to_owned()],
        }],
        whitelist: Vec::new(),
    });

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .expect_err("blacklist model matching must be case-insensitive");
    assert_eq!(
        UpstreamRouteSelectionErrorKind::ModelForbidden,
        error.kind()
    );
}

#[test]
fn group_model_blacklist_ignores_other_vendors_and_other_models() {
    let group_id = 10;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 201, "openai", 100, 100),
    );
    // Entries for a different vendor and for a different model must not
    // affect the request, and an empty blacklist/whitelist is unrestricted.
    catalog.set_account_group_model_access(AccountGroupModelAccess {
        group_id,
        blacklist: vec![
            VendorModelListEntry {
                vendor_code: "anthropic".to_owned(),
                models: vec![MODEL_ID.to_owned()],
            },
            VendorModelListEntry {
                vendor_code: "openai".to_owned(),
                models: vec!["gpt-3.5-turbo".to_owned()],
            },
        ],
        whitelist: Vec::new(),
    });

    let account_id = select_account(&catalog, group_id);
    assert_eq!(201, account_id);
}

#[test]
fn group_model_whitelist_is_fail_closed() {
    let group_id = 10;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 201, "openai", 100, 100),
    );
    catalog.set_account_group_model_access(AccountGroupModelAccess {
        group_id,
        blacklist: Vec::new(),
        whitelist: vec![VendorModelListEntry {
            vendor_code: "openai".to_owned(),
            models: vec!["gpt-3.5-turbo".to_owned()],
        }],
    });

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .expect_err("model outside the whitelist must be rejected");
    assert_eq!(
        UpstreamRouteSelectionErrorKind::ModelForbidden,
        error.kind()
    );
    assert!(error.to_string().contains("model whitelist"));
}

#[test]
fn group_model_whitelist_allows_matching_models() {
    let group_id = 10;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 201, "openai", 100, 100),
    );
    catalog.set_account_group_model_access(AccountGroupModelAccess {
        group_id,
        blacklist: Vec::new(),
        whitelist: vec![VendorModelListEntry {
            vendor_code: "openai".to_owned(),
            models: vec![MODEL_ID.to_owned()],
        }],
    });

    let account_id = select_account(&catalog, group_id);
    assert_eq!(201, account_id);
}

#[test]
fn group_model_blacklist_wins_over_whitelist() {
    let group_id = 10;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 201, "openai", 100, 100),
    );
    catalog.set_account_group_model_access(AccountGroupModelAccess {
        group_id,
        blacklist: vec![VendorModelListEntry {
            vendor_code: "openai".to_owned(),
            models: vec![MODEL_ID.to_owned()],
        }],
        whitelist: vec![VendorModelListEntry {
            vendor_code: "openai".to_owned(),
            models: vec![MODEL_ID.to_owned()],
        }],
    });

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .expect_err("blacklist must win over whitelist");
    assert_eq!(
        UpstreamRouteSelectionErrorKind::ModelForbidden,
        error.kind()
    );
    assert!(error.to_string().contains("model blacklist"));
}

#[test]
fn account_route_path_returns_failover_chain_for_dispatch() {
    let group_id = 10;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Weighted,
        UpstreamAccountFallbackMode::CrossSupplier,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 1001, "openai", 100, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 1002, "openai", 200, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 1003, "anthropic", 300, 100),
    );

    let selection = UpstreamRouteSelector::new(&catalog)
        .select_account_route(account_route_query(group_id))
        .expect("account route selection");

    // 主账号 = 最低 priority 成员
    assert_eq!(1001, selection.route.account_id);
    // CrossSupplier fallback 保留全部账号：过滤链/调度获得故障转移序列
    assert_eq!(
        vec![1002, 1003],
        selection
            .failover_routes
            .iter()
            .map(|route| route.account_id)
            .collect::<Vec<_>>()
    );
}

#[test]
fn account_route_path_without_fallback_keeps_single_candidate() {
    let group_id = 10;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Weighted,
        UpstreamAccountFallbackMode::None,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 1001, "openai", 100, 100),
    );
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 1002, "openai", 200, 100),
    );

    let selection = UpstreamRouteSelector::new(&catalog)
        .select_account_route(account_route_query(group_id))
        .expect("account route selection");

    assert_eq!(1001, selection.route.account_id);
    // fallback None：故障转移序列为空（与模型路径的截断语义一致）
    assert!(selection.failover_routes.is_empty());
}

#[test]
fn binding_price_first_overrides_group_default_strategy() {
    // 分组默认 Failover（按 member priority 固定首个成员）；API Key 绑定
    // price_first 应覆盖分组默认，选中成本最低的账号。
    let group_id = 12;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    catalog.add_api_key(
        GatewayApiKey::new(API_KEY_ID, group_id, "sk-test", "hash:sk-test")
            .with_owner(TENANT_ID, ORGANIZATION_ID, USER_ID)
            .with_account_group_bindings(vec![GatewayApiKeyAccountGroupBinding::new(
                group_id,
                &format!("group-{group_id}"),
                "standard",
                100,
                100,
            )
            .with_routing_strategy("price_first")]),
    );
    let mut expensive = account_route(group_id, 3001, "openai-a", 100, 100);
    expensive.contract_cost_multiplier = decimal("2.000000");
    add_route_and_price(&mut catalog, expensive);
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "openai-b", 100, 100),
    );

    assert_eq!(3002, select_account(&catalog, group_id));
}

#[test]
fn binding_quality_first_prefers_healthy_account() {
    // 质量优先：健康账号（health=1）优先于不健康账号（health=2），
    // 即使不健康账号在同优先级中排位更前。
    let group_id = 13;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    catalog.add_api_key(
        GatewayApiKey::new(API_KEY_ID, group_id, "sk-test", "hash:sk-test")
            .with_owner(TENANT_ID, ORGANIZATION_ID, USER_ID)
            .with_account_group_bindings(vec![GatewayApiKeyAccountGroupBinding::new(
                group_id,
                &format!("group-{group_id}"),
                "standard",
                100,
                100,
            )
            .with_routing_strategy("quality_first")]),
    );
    let mut unhealthy = account_route(group_id, 3001, "openai-a", 100, 100);
    unhealthy.account_health_status = 2;
    add_route_and_price(&mut catalog, unhealthy);
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "openai-b", 100, 100),
    );

    assert_eq!(3002, select_account(&catalog, group_id));
}

#[test]
fn legacy_auto_binding_falls_back_to_group_default_strategy() {
    // 存量 'auto' 绑定（或未配置绑定）不注入策略：回退分组默认策略。
    // 分组默认 Failover 时选中同优先级首个成员（3001），而不是按成本排序。
    let group_id = 14;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    catalog.add_api_key(
        GatewayApiKey::new(API_KEY_ID, group_id, "sk-test", "hash:sk-test")
            .with_owner(TENANT_ID, ORGANIZATION_ID, USER_ID)
            .with_account_group_bindings(vec![GatewayApiKeyAccountGroupBinding::new(
                group_id,
                &format!("group-{group_id}"),
                "standard",
                100,
                100,
            )
            .with_routing_strategy("auto")]),
    );
    let mut expensive = account_route(group_id, 3001, "openai-a", 100, 100);
    expensive.contract_cost_multiplier = decimal("2.000000");
    add_route_and_price(&mut catalog, expensive);
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 3002, "openai-b", 100, 100),
    );

    // Failover 默认：不重排，首个成员 3001 胜出（auto 未注入 price_first）
    assert_eq!(3001, select_account(&catalog, group_id));
}

// ============================================================================
// Diagnostic tests: systematically verify each failure mode that can cause the
// "账号池网关暂不可用" (503 upstream_route_not_available) error when accounts
// exist in the default account group.
// ============================================================================

/// Baseline: a fully-configured default account group with one healthy, priced
/// account succeeds without any routing policy.
#[test]
fn diagnostic_default_group_with_healthy_priced_account_succeeds() {
    let group_id = 900;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 5001, "openai-direct", 1, 100),
    );

    let result = UpstreamRouteSelector::new(&catalog).select_model_route(model_query(group_id));
    assert!(result.is_ok(), "baseline must succeed: {:?}", result.err());
    assert_eq!(5001, result.unwrap().route.account_id);
}

/// Failure mode 1: account exists but has NO account_group_binding matching
/// the requested api_scope. The binding's api_scope filter must contain the
/// api code (or be empty/wildcard).
#[test]
fn diagnostic_fails_when_binding_api_scope_does_not_match() {
    let group_id = 901;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    let mut route = account_route(group_id, 5001, "openai-direct", 1, 100);
    route.account_group_bindings = vec![UpstreamAccountGroupBinding {
        account_group_id: group_id,
        priority: 1,
        weight: 100,
        api_scope: vec!["openai.embeddings".to_owned()],
        capabilities: vec![],
        resource_entitlements: None,
        cost_multiplier_override: None,
    }];
    add_route_and_price(&mut catalog, route);

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();
    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind(),
        "api_scope mismatch should yield UpstreamRouteUnavailable: {}",
        error
    );
    assert!(
        error.to_string().contains("no accounts bound"),
        "error should mention no accounts bound: {}",
        error
    );
}

/// Failure mode 2: account exists but binding capability doesn't match the
/// requested capability (e.g. binding says "image" but request is "chat").
#[test]
fn diagnostic_fails_when_binding_capability_does_not_match() {
    let group_id = 902;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    let mut route = account_route(group_id, 5001, "openai-direct", 1, 100);
    route.account_group_bindings = vec![UpstreamAccountGroupBinding {
        account_group_id: group_id,
        priority: 1,
        weight: 100,
        api_scope: vec![],
        capabilities: vec!["image".to_owned()],
        resource_entitlements: None,
        cost_multiplier_override: None,
    }];
    add_route_and_price(&mut catalog, route);

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();
    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind(),
        "capability mismatch should yield UpstreamRouteUnavailable: {}",
        error
    );
}

/// Failure mode 3: account is unhealthy (account_health_status != 1).
/// The account_route_is_callable check rejects unhealthy accounts.
#[test]
fn diagnostic_fails_when_account_is_unhealthy() {
    let group_id = 903;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    let mut route = account_route(group_id, 5001, "openai-direct", 1, 100);
    route.account_health_status = 0;
    add_route_and_price(&mut catalog, route);

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();
    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind(),
        "unhealthy account should yield UpstreamRouteUnavailable: {}",
        error
    );
}

/// Failure mode 4: account is missing base_url (not callable).
#[test]
fn diagnostic_fails_when_account_missing_base_url() {
    let group_id = 904;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    let mut route = account_route(group_id, 5001, "openai-direct", 1, 100);
    route.base_url = None;
    add_route_and_price(&mut catalog, route);

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();
    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind(),
        "missing base_url should yield UpstreamRouteUnavailable: {}",
        error
    );
}

/// Failure mode 5: account is missing secret_ref AND has no default_headers.
#[test]
fn diagnostic_fails_when_account_missing_credentials() {
    let group_id = 905;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    let mut route = account_route(group_id, 5001, "openai-direct", 1, 100);
    route.secret_ref = None;
    route.auth_profile = sdkwork_cloudrouter_router_service::domain::ProviderAuthProfile::default();
    add_route_and_price(&mut catalog, route);

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();
    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind(),
        "missing credentials should yield UpstreamRouteUnavailable: {}",
        error
    );
}

/// Failure mode 6: account exists and is callable, but upstream cost price is
/// missing. This produces PricingUnavailable, not UpstreamRouteUnavailable.
#[test]
fn diagnostic_fails_when_upstream_cost_price_missing() {
    let group_id = 906;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    // Add route WITHOUT price (don't use add_route_and_price)
    catalog.add_upstream_account_route(account_route(group_id, 5001, "openai-direct", 1, 100));

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();
    assert_eq!(
        UpstreamRouteSelectionErrorKind::PricingUnavailable,
        error.kind(),
        "missing price should yield PricingUnavailable: {}",
        error
    );
}

/// Failure mode 7: credential_health_status is unhealthy while account itself
/// is healthy. The compound is_account_healthy check requires ALL three.
#[test]
fn diagnostic_fails_when_credential_unhealthy() {
    let group_id = 907;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    let mut route = account_route(group_id, 5001, "openai-direct", 1, 100);
    route.credential_health_status = 0;
    add_route_and_price(&mut catalog, route);

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();
    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind(),
        "unhealthy credential should yield UpstreamRouteUnavailable: {}",
        error
    );
}

/// Failure mode 8: endpoint_health_status is unhealthy.
#[test]
fn diagnostic_fails_when_endpoint_unhealthy() {
    let group_id = 908;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    let mut route = account_route(group_id, 5001, "openai-direct", 1, 100);
    route.endpoint_health_status = 0;
    add_route_and_price(&mut catalog, route);

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();
    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind(),
        "unhealthy endpoint should yield UpstreamRouteUnavailable: {}",
        error
    );
}

/// Failure mode 9: empty routing catalog (no accounts loaded at all).
/// This is the "snapshot not refreshed" scenario.
#[test]
fn diagnostic_fails_when_routing_catalog_empty() {
    let group_id = 909;
    let catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    // No account routes added

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();
    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind(),
        "empty catalog should yield UpstreamRouteUnavailable: {}",
        error
    );
    assert!(
        error.to_string().contains("upstream route snapshot is empty")
            || error.to_string().contains("no accounts bound")
            || error.to_string().contains("not available"),
        "error message should be diagnostic: {}",
        error
    );
}

/// Failure mode 10: account exists in the group but with a routing policy
/// that has mismatched candidates (pointing to wrong group_id). This is the
/// classic misconfiguration: rule candidates reference account_ids instead of
/// account_group_ids.
#[test]
fn diagnostic_fails_when_policy_candidates_reference_wrong_group() {
    let group_id = 910;
    let mut catalog = catalog_for_group(account_group(
        group_id,
        UpstreamAccountRoutingStrategy::Failover,
        UpstreamAccountFallbackMode::Sequential,
    ));
    add_route_and_price(
        &mut catalog,
        account_route(group_id, 5001, "openai-direct", 1, 100),
    );
    // Policy candidates reference account_id (5001) instead of group_id (910)
    add_model_policy(
        &mut catalog,
        group_id,
        vec![RouteCandidate::new(5001, 100)],
    );

    let error = UpstreamRouteSelector::new(&catalog)
        .select_model_route(model_query(group_id))
        .unwrap_err();
    assert_eq!(
        UpstreamRouteSelectionErrorKind::UpstreamRouteUnavailable,
        error.kind(),
        "wrong candidate group_id should yield UpstreamRouteUnavailable: {}",
        error
    );
    assert!(
        error.to_string().contains("no callable priced candidate"),
        "error should mention no callable candidate: {}",
        error
    );
}
