use crate::domain::{
    AiModel, BillingMeter, GatewayAccessPolicy, GatewayApiKey, GatewayRiskRule,
    ModelMappingBindingType, ModelMappingRule, ModelPrice, ModelUpstreamRoute,
    ModelVendorDefinition, PriceSide, PricingPlan, QuotaPolicy, ResolveModelMappingContext,
    RoutingPolicy, RoutingRule, UpstreamAccountGroup, UpstreamAccountGroupMetricSnapshot,
    UpstreamAccountRoute,
};
use crate::ports::PricingCatalog;

#[derive(Debug, Default, Clone)]
pub struct InMemoryPricingCatalog {
    vendors: Vec<ModelVendorDefinition>,
    models: Vec<AiModel>,
    provider_routes: Vec<ModelUpstreamRoute>,
    upstream_account_routes: Vec<UpstreamAccountRoute>,
    routing_policies: Vec<RoutingPolicy>,
    routing_rules: Vec<RoutingRule>,
    model_mappings: Vec<ModelMappingRule>,
    plans: Vec<PricingPlan>,
    upstream_account_groups: Vec<UpstreamAccountGroup>,
    api_keys: Vec<GatewayApiKey>,
    access_policies: Vec<GatewayAccessPolicy>,
    quota_policies: Vec<QuotaPolicy>,
    gateway_risk_rules: Vec<GatewayRiskRule>,
    upstream_account_group_metric_snapshots: Vec<UpstreamAccountGroupMetricSnapshot>,
    prices: Vec<ModelPrice>,
}

impl InMemoryPricingCatalog {
    pub fn add_vendor(&mut self, vendor: ModelVendorDefinition) {
        self.vendors.push(vendor);
    }

    pub fn add_model(&mut self, model: AiModel) {
        self.models.push(model);
    }

    pub fn add_provider_route(&mut self, route: ModelUpstreamRoute) {
        self.provider_routes.push(route);
    }

    pub fn add_upstream_account_route(&mut self, route: UpstreamAccountRoute) {
        self.upstream_account_routes
            .retain(|existing| !same_upstream_account_route_identity(existing, &route));
        self.upstream_account_routes.push(route);
    }

    pub fn add_routing_policy(&mut self, policy: RoutingPolicy) {
        self.routing_policies.push(policy);
    }

    pub fn add_routing_rule(&mut self, rule: RoutingRule) {
        self.routing_rules.push(rule);
    }

    pub fn add_model_mapping(&mut self, rule: ModelMappingRule) {
        self.model_mappings.push(rule);
    }

    pub fn add_plan(&mut self, plan: PricingPlan) {
        self.plans.push(plan);
    }

    pub fn add_upstream_account_group(&mut self, group: UpstreamAccountGroup) {
        self.upstream_account_groups.push(group);
    }

    pub fn update_group_sale_multiplier(
        &mut self,
        group_id: i64,
        multiplier: crate::domain::DecimalValue,
    ) {
        if let Some(group) = self
            .upstream_account_groups
            .iter_mut()
            .find(|group| group.id == group_id)
        {
            group.sale_multiplier = multiplier;
        }
    }

    pub fn add_api_key(&mut self, api_key: GatewayApiKey) {
        self.api_keys.retain(|item| item.id != api_key.id);
        self.api_keys.push(api_key);
    }

    pub fn add_access_policy(&mut self, policy: GatewayAccessPolicy) {
        self.access_policies.push(policy);
    }

    pub fn add_quota_policy(&mut self, policy: QuotaPolicy) {
        self.quota_policies.push(policy);
    }

    pub fn add_gateway_risk_rule(&mut self, rule: GatewayRiskRule) {
        self.gateway_risk_rules.push(rule);
    }

    pub fn add_upstream_account_group_metric_snapshot(
        &mut self,
        snapshot: UpstreamAccountGroupMetricSnapshot,
    ) {
        self.upstream_account_group_metric_snapshots.push(snapshot);
    }

    pub fn add_price(&mut self, price: ModelPrice) {
        self.prices.push(price);
    }
}

fn same_upstream_account_route_identity(
    left: &UpstreamAccountRoute,
    right: &UpstreamAccountRoute,
) -> bool {
    left.supplier_code == right.supplier_code
        && left.account_id == right.account_id
        && left.credential_id == right.credential_id
        && left.endpoint_id == right.endpoint_id
        && left.base_url == right.base_url
        && normalized_region_code(&left.region_code)
            .eq_ignore_ascii_case(&normalized_region_code(&right.region_code))
}

fn normalized_region_code(value: &str) -> String {
    let value = value.trim();
    if value.is_empty() {
        "global".to_owned()
    } else {
        value.to_owned()
    }
}

impl PricingCatalog for InMemoryPricingCatalog {
    fn list_models(&self, vendor_code: Option<&str>) -> Vec<AiModel> {
        self.models
            .iter()
            .filter(|model| {
                model.is_publicly_active()
                    && vendor_code
                        .map(|vendor_code| model.vendor_code == vendor_code)
                        .unwrap_or(true)
            })
            .cloned()
            .collect()
    }

    fn list_model_upstream_routes(&self, model: &str) -> Vec<ModelUpstreamRoute> {
        self.provider_routes
            .iter()
            .filter(|route| catalog_key_matches_route_scope(&route.catalog_key, model))
            .cloned()
            .collect()
    }

    fn list_upstream_account_routes(&self) -> Vec<UpstreamAccountRoute> {
        self.upstream_account_routes.clone()
    }

    fn list_routing_policies(&self) -> Vec<RoutingPolicy> {
        self.routing_policies.clone()
    }

    fn list_routing_rules(&self, profile_id: i64) -> Vec<RoutingRule> {
        self.routing_rules
            .iter()
            .filter(|rule| rule.profile_id == profile_id)
            .cloned()
            .collect()
    }

    fn list_model_mappings(&self) -> Vec<ModelMappingRule> {
        self.model_mappings.clone()
    }

    fn list_api_keys(&self) -> Vec<GatewayApiKey> {
        self.api_keys.clone()
    }

    fn list_upstream_account_groups(&self) -> Vec<UpstreamAccountGroup> {
        self.upstream_account_groups.clone()
    }

    fn list_model_prices(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
    ) -> Vec<ModelPrice> {
        self.prices
            .iter()
            .filter(|price| {
                catalog_key_matches_price_scope(&price.catalog_key, model)
                    && price.price_side == price_side
                    && price.billing_meter == billing_meter
            })
            .cloned()
            .collect()
    }

    fn list_model_prices_for_side(&self, model: &str, price_side: PriceSide) -> Vec<ModelPrice> {
        self.prices
            .iter()
            .filter(|price| {
                catalog_key_matches_price_scope(&price.catalog_key, model)
                    && price.price_side == price_side
            })
            .cloned()
            .collect()
    }

    fn find_api_key(&self, api_key_id: i64) -> Option<GatewayApiKey> {
        self.api_keys
            .iter()
            .find(|api_key| api_key.id == api_key_id)
            .cloned()
    }

    fn find_api_key_by_hash(&self, key_hash: &str) -> Option<GatewayApiKey> {
        self.api_keys
            .iter()
            .find(|api_key| api_key.key_hash == key_hash)
            .cloned()
    }

    fn find_upstream_account_group(&self, group_id: i64) -> Option<UpstreamAccountGroup> {
        self.upstream_account_groups
            .iter()
            .find(|group| group.id == group_id)
            .cloned()
    }

    fn find_access_policy(&self, policy_id: i64) -> Option<GatewayAccessPolicy> {
        self.access_policies
            .iter()
            .find(|policy| policy.id == policy_id)
            .cloned()
    }

    fn find_quota_policy(&self, policy_id: i64) -> Option<QuotaPolicy> {
        self.quota_policies
            .iter()
            .find(|policy| policy.id == policy_id)
            .cloned()
    }

    fn list_gateway_risk_rules(&self) -> Vec<GatewayRiskRule> {
        self.gateway_risk_rules.clone()
    }

    fn find_latest_upstream_account_group_metric_snapshot(
        &self,
        group_id: i64,
    ) -> Option<UpstreamAccountGroupMetricSnapshot> {
        self.upstream_account_group_metric_snapshots
            .iter()
            .find(|snapshot| snapshot.account_group_id == group_id)
            .cloned()
    }

    fn find_pricing_plan(&self, plan_code: &str) -> Option<PricingPlan> {
        self.plans
            .iter()
            .find(|plan| plan.plan_code == plan_code)
            .cloned()
    }

    fn find_model(&self, model: &str) -> Option<AiModel> {
        let model = model.trim();
        self.models
            .iter()
            .find(|candidate| candidate.catalog_key == model && candidate.is_publicly_active())
            .cloned()
    }

    fn find_vendor(&self, vendor_code: &str) -> Option<ModelVendorDefinition> {
        self.vendors
            .iter()
            .find(|vendor| vendor.vendor_code == vendor_code)
            .cloned()
    }

    fn resolve_model_mapping(
        &self,
        source_model: &str,
        context: &ResolveModelMappingContext,
    ) -> Option<ModelMappingRule> {
        resolve_model_mapping_from_rules(&self.model_mappings, source_model, context)
    }

    fn find_model_upstream_route(
        &self,
        model: &str,
        supplier_code: &str,
    ) -> Option<ModelUpstreamRoute> {
        self.provider_routes
            .iter()
            .find(|route| {
                catalog_key_matches_route_scope(&route.catalog_key, model)
                    && route.supplier_code == supplier_code
            })
            .cloned()
    }

    fn find_model_price(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        supplier_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.prices
            .iter()
            .find(|price| {
                catalog_key_matches_price_scope(&price.catalog_key, model)
                    && price.price_side == price_side
                    && price.billing_meter == billing_meter
                    && option_matches(price.supplier_code.as_deref(), supplier_code)
                    && option_matches(price.pricing_plan_code.as_deref(), pricing_plan_code)
            })
            .cloned()
    }
}

pub(crate) fn resolve_model_mapping_from_rules(
    rules: &[ModelMappingRule],
    source_model: &str,
    context: &ResolveModelMappingContext,
) -> Option<ModelMappingRule> {
    [
        ModelMappingBindingType::UpstreamAccount,
        ModelMappingBindingType::UpstreamAccountGroup,
        ModelMappingBindingType::SupplierEndpoint,
        ModelMappingBindingType::UpstreamSupplier,
        ModelMappingBindingType::Vendor,
        ModelMappingBindingType::Global,
    ]
    .into_iter()
    .find_map(|binding_type| {
        rules
            .iter()
            .filter(|rule| model_mapping_rule_matches(rule, binding_type, source_model, context))
            .min_by_key(|rule| {
                (
                    rule.binding_sort_order,
                    rule.item_sort_order,
                    std::cmp::Reverse(rule.id),
                )
            })
            .cloned()
    })
}

fn model_mapping_rule_matches(
    rule: &ModelMappingRule,
    binding_type: ModelMappingBindingType,
    source_model: &str,
    context: &ResolveModelMappingContext,
) -> bool {
    if rule.binding_type != binding_type || !model_mapping_source_matches(rule, source_model) {
        return false;
    }
    match binding_type {
        ModelMappingBindingType::UpstreamAccount => binding_id_or_code_matches(
            context.account_id,
            context.account_code.as_deref(),
            rule.binding_id,
            rule.binding_code.as_deref(),
        ),
        ModelMappingBindingType::UpstreamAccountGroup => binding_id_or_code_matches(
            context.account_group_id,
            context.account_group_code.as_deref(),
            rule.binding_id,
            rule.binding_code.as_deref(),
        ),
        ModelMappingBindingType::UpstreamSupplier => binding_id_or_code_matches(
            context.supplier_id,
            context.supplier_code.as_deref(),
            rule.binding_id,
            rule.binding_code.as_deref(),
        ),
        ModelMappingBindingType::SupplierEndpoint => binding_id_or_code_matches(
            context.endpoint_id,
            context.endpoint_code.as_deref(),
            rule.binding_id,
            rule.binding_code.as_deref(),
        ),
        ModelMappingBindingType::Vendor => {
            binding_code_matches(context.vendor_code.as_deref(), rule.binding_code.as_deref())
        }
        ModelMappingBindingType::Global => true,
    }
}

fn model_mapping_source_matches(rule: &ModelMappingRule, source_model: &str) -> bool {
    let source_model = source_model.trim();
    if source_model.is_empty() {
        return false;
    }
    rule.source_catalog_key
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|catalog_key| catalog_key == source_model)
        .unwrap_or_else(|| rule.source_model.trim() == source_model)
        || rule.source_model.trim() == source_model
}

fn binding_id_or_code_matches(
    actual_id: Option<i64>,
    actual_code: Option<&str>,
    expected_id: Option<i64>,
    expected_code: Option<&str>,
) -> bool {
    actual_id
        .zip(expected_id)
        .map(|(actual, expected)| actual == expected)
        .unwrap_or(false)
        || binding_code_matches(actual_code, expected_code)
}

fn binding_code_matches(actual_code: Option<&str>, expected_code: Option<&str>) -> bool {
    actual_code
        .zip(expected_code)
        .map(|(actual, expected)| actual.trim() == expected.trim())
        .unwrap_or(false)
}

fn option_matches(actual: Option<&str>, expected: Option<&str>) -> bool {
    match expected {
        Some(expected) => actual == Some(expected),
        None => actual.is_none(),
    }
}

fn catalog_key_matches_route_scope(candidate: &str, model_key: &str) -> bool {
    candidate.trim() == model_key.trim()
}

fn catalog_key_matches_price_scope(candidate: &str, model_key: &str) -> bool {
    candidate.trim() == model_key.trim()
}
