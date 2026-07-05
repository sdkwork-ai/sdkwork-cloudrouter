use std::collections::{BTreeMap, HashMap};

use crate::domain::{
    AiModel, BillingMeter, ChannelGroup, ChannelGroupMetricSnapshot, DecimalValue, DomainResult,
    GatewayAccessPolicy, GatewayApiKey, GatewayRiskRule, ModelMappingRule, ModelPrice,
    ModelProviderRoute, ModelVendorDefinition, Money, PriceSide, PricingPlan, ProviderChannelRoute,
    QuotaPolicy, ResolveModelMappingContext, RoutingPolicy, RoutingRule,
};
use crate::infrastructure::in_memory_pricing_catalog::resolve_model_mapping_from_rules;
use crate::infrastructure::sql::rows::{
    AiModelRow, ChannelGroupMetricSnapshotRow, ChannelGroupRow, GatewayAccessPolicyRow,
    GatewayApiKeyRow, GatewayRiskRuleRow, ModelMappingRuleRow, ModelPriceRow,
    ModelProviderRouteRow, ModelVendorRow, PricingPlanRow, ProviderChannelRouteRow, QuotaPolicyRow,
    RoutingPolicyRow, RoutingRuleRow,
};
use crate::ports::PricingCatalog;
use std::sync::{Arc, RwLock};

#[derive(Default)]
pub struct PricingCatalogRows {
    pub vendors: Vec<ModelVendorRow>,
    pub models: Vec<AiModelRow>,
    pub provider_routes: Vec<ModelProviderRouteRow>,
    pub provider_channel_routes: Vec<ProviderChannelRouteRow>,
    pub routing_policies: Vec<RoutingPolicyRow>,
    pub routing_rules: Vec<RoutingRuleRow>,
    pub model_mappings: Vec<ModelMappingRuleRow>,
    pub pricing_plans: Vec<PricingPlanRow>,
    pub channel_groups: Vec<ChannelGroupRow>,
    pub api_keys: Vec<GatewayApiKeyRow>,
    pub access_policies: Vec<GatewayAccessPolicyRow>,
    pub quota_policies: Vec<QuotaPolicyRow>,
    pub gateway_risk_rules: Vec<GatewayRiskRuleRow>,
    pub channel_group_metric_snapshots: Vec<ChannelGroupMetricSnapshotRow>,
    pub prices: Vec<ModelPriceRow>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SqlPricingCatalogSnapshotSummary {
    pub vendors: usize,
    pub models: usize,
    pub provider_routes: usize,
    pub callable_provider_routes: usize,
    pub provider_channel_routes: usize,
    pub callable_provider_channel_routes: usize,
    pub provider_channel_group_bindings: usize,
    pub routing_policies: usize,
    pub routing_rules: usize,
    pub model_mappings: usize,
    pub pricing_plans: usize,
    pub channel_groups: usize,
    pub api_keys: usize,
    pub prices: usize,
    pub managed_provider_secrets: usize,
}

pub struct SqlPricingCatalogSnapshot {
    vendors: Vec<ModelVendorDefinition>,
    models: Vec<AiModel>,
    provider_routes: Vec<ModelProviderRoute>,
    provider_channel_routes: Vec<ProviderChannelRoute>,
    routing_policies: Vec<RoutingPolicy>,
    routing_rules: Vec<RoutingRule>,
    model_mappings: Vec<ModelMappingRule>,
    pricing_plans: Vec<PricingPlan>,
    channel_groups: Vec<ChannelGroup>,
    api_keys: Vec<GatewayApiKey>,
    access_policies: Vec<GatewayAccessPolicy>,
    quota_policies: Vec<QuotaPolicy>,
    gateway_risk_rules: Vec<GatewayRiskRule>,
    channel_group_metric_snapshots: Vec<ChannelGroupMetricSnapshot>,
    prices: Vec<ModelPrice>,
    managed_provider_secrets: BTreeMap<String, String>,
    // --- Indexes for O(1) hot-path lookups ---
    models_by_key: HashMap<String, AiModel>,
    api_keys_by_hash: HashMap<String, GatewayApiKey>,
    api_keys_by_id: HashMap<i64, GatewayApiKey>,
    channel_groups_by_id: HashMap<i64, ChannelGroup>,
    pricing_plans_by_code: HashMap<String, PricingPlan>,
    vendors_by_code: HashMap<String, ModelVendorDefinition>,
    provider_routes_by_key: HashMap<String, Vec<ModelProviderRoute>>,
    prices_by_key: HashMap<String, Vec<ModelPrice>>,
}

impl SqlPricingCatalogSnapshot {
    pub fn from_rows(rows: PricingCatalogRows) -> DomainResult<Self> {
        Self::from_rows_and_managed_provider_secrets(rows, BTreeMap::new())
    }

    pub fn from_rows_and_managed_provider_secrets(
        rows: PricingCatalogRows,
        managed_provider_secrets: BTreeMap<String, String>,
    ) -> DomainResult<Self> {
        let pricing_plans = pricing_plans_with_standard_fallback(map_rows(
            rows.pricing_plans,
            PricingPlanRow::try_into_domain,
        )?)?;
        let mut snapshot = Self {
            vendors: map_rows(rows.vendors, ModelVendorRow::try_into_domain)?,
            models: map_rows(rows.models, AiModelRow::try_into_domain)?,
            provider_routes: map_rows(
                rows.provider_routes,
                ModelProviderRouteRow::try_into_domain,
            )?,
            provider_channel_routes: map_rows(
                rows.provider_channel_routes,
                ProviderChannelRouteRow::try_into_domain,
            )?,
            routing_policies: map_rows(rows.routing_policies, RoutingPolicyRow::try_into_domain)?,
            routing_rules: map_rows(rows.routing_rules, RoutingRuleRow::try_into_domain)?,
            model_mappings: map_rows(rows.model_mappings, ModelMappingRuleRow::try_into_domain)?,
            pricing_plans,
            channel_groups: map_rows(rows.channel_groups, ChannelGroupRow::try_into_domain)?,
            api_keys: map_rows(rows.api_keys, GatewayApiKeyRow::try_into_domain)?,
            access_policies: map_rows(
                rows.access_policies,
                GatewayAccessPolicyRow::try_into_domain,
            )?,
            quota_policies: map_rows(rows.quota_policies, QuotaPolicyRow::try_into_domain)?,
            gateway_risk_rules: map_rows(
                rows.gateway_risk_rules,
                GatewayRiskRuleRow::try_into_domain,
            )?,
            channel_group_metric_snapshots: map_rows(
                rows.channel_group_metric_snapshots,
                ChannelGroupMetricSnapshotRow::try_into_domain,
            )?,
            prices: map_rows(rows.prices, ModelPriceRow::try_into_domain)?,
            managed_provider_secrets,
            models_by_key: HashMap::new(),
            api_keys_by_hash: HashMap::new(),
            api_keys_by_id: HashMap::new(),
            channel_groups_by_id: HashMap::new(),
            pricing_plans_by_code: HashMap::new(),
            vendors_by_code: HashMap::new(),
            provider_routes_by_key: HashMap::new(),
            prices_by_key: HashMap::new(),
        };
        snapshot.build_indexes();
        Ok(snapshot)
    }

    /// Build HashMap indexes from the Vec collections for O(1) hot-path
    /// lookups. Called once after snapshot creation; all subsequent
    /// `find_*` calls use these indexes instead of linear scans.
    fn build_indexes(&mut self) {
        self.models_by_key = self
            .models
            .iter()
            .map(|model| (model.catalog_key.clone(), model.clone()))
            .collect();
        self.api_keys_by_hash = self
            .api_keys
            .iter()
            .map(|api_key| (api_key.key_hash.clone(), api_key.clone()))
            .collect();
        self.api_keys_by_id = self
            .api_keys
            .iter()
            .map(|api_key| (api_key.id, api_key.clone()))
            .collect();
        self.channel_groups_by_id = self
            .channel_groups
            .iter()
            .map(|group| (group.id, group.clone()))
            .collect();
        self.pricing_plans_by_code = self
            .pricing_plans
            .iter()
            .map(|plan| (plan.plan_code.clone(), plan.clone()))
            .collect();
        self.vendors_by_code = self
            .vendors
            .iter()
            .map(|vendor| (vendor.vendor_code.clone(), vendor.clone()))
            .collect();
        self.provider_routes_by_key = self
            .provider_routes
            .iter()
            .fold(HashMap::new(), |mut acc, route| {
                acc.entry(route.catalog_key.trim().to_owned())
                    .or_default()
                    .push(route.clone());
                acc
            });
        self.prices_by_key = self
            .prices
            .iter()
            .fold(HashMap::new(), |mut acc, price| {
                acc.entry(price.catalog_key.trim().to_owned())
                    .or_default()
                    .push(price.clone());
                acc
            });
    }

    pub fn managed_provider_secrets(&self) -> BTreeMap<String, String> {
        self.managed_provider_secrets.clone()
    }

    pub fn summary(&self) -> SqlPricingCatalogSnapshotSummary {
        SqlPricingCatalogSnapshotSummary {
            vendors: self.vendors.len(),
            models: self.models.len(),
            provider_routes: self.provider_routes.len(),
            callable_provider_routes: self
                .provider_routes
                .iter()
                .filter(|route| {
                    has_text(route.base_url.as_deref()) && has_text(route.secret_ref.as_deref())
                })
                .count(),
            provider_channel_routes: self.provider_channel_routes.len(),
            callable_provider_channel_routes: self
                .provider_channel_routes
                .iter()
                .filter(|route| {
                    has_text(route.base_url.as_deref()) && has_text(route.secret_ref.as_deref())
                })
                .count(),
            provider_channel_group_bindings: self
                .provider_channel_routes
                .iter()
                .map(|route| route.group_bindings.len())
                .sum(),
            routing_policies: self.routing_policies.len(),
            routing_rules: self.routing_rules.len(),
            model_mappings: self.model_mappings.len(),
            pricing_plans: self.pricing_plans.len(),
            channel_groups: self.channel_groups.len(),
            api_keys: self.api_keys.len(),
            prices: self.prices.len(),
            managed_provider_secrets: self.managed_provider_secrets.len(),
        }
    }
}

pub struct RefreshableSqlPricingCatalog {
    snapshot: RwLock<Arc<SqlPricingCatalogSnapshot>>,
}

impl RefreshableSqlPricingCatalog {
    pub fn new(snapshot: SqlPricingCatalogSnapshot) -> Self {
        Self {
            snapshot: RwLock::new(Arc::new(snapshot)),
        }
    }

    pub fn replace_snapshot(&self, snapshot: SqlPricingCatalogSnapshot) {
        match self.snapshot.write() {
            Ok(mut current) => {
                *current = Arc::new(snapshot);
            }
            Err(poisoned) => {
                *poisoned.into_inner() = Arc::new(snapshot);
            }
        }
    }

    fn current_snapshot(&self) -> Arc<SqlPricingCatalogSnapshot> {
        match self.snapshot.read() {
            Ok(snapshot) => Arc::clone(&snapshot),
            Err(poisoned) => Arc::clone(&poisoned.into_inner()),
        }
    }
}

impl PricingCatalog for RefreshableSqlPricingCatalog {
    fn list_models(&self, vendor_code: Option<&str>) -> Vec<AiModel> {
        self.current_snapshot().list_models(vendor_code)
    }

    fn list_provider_routes(&self, model: &str) -> Vec<ModelProviderRoute> {
        self.current_snapshot().list_provider_routes(model)
    }

    fn list_provider_channel_routes(&self) -> Vec<ProviderChannelRoute> {
        self.current_snapshot().list_provider_channel_routes()
    }

    fn list_routing_policies(&self) -> Vec<RoutingPolicy> {
        self.current_snapshot().list_routing_policies()
    }

    fn list_routing_rules(&self, profile_id: i64) -> Vec<RoutingRule> {
        self.current_snapshot().list_routing_rules(profile_id)
    }

    fn list_model_mappings(&self) -> Vec<ModelMappingRule> {
        self.current_snapshot().list_model_mappings()
    }

    fn list_api_keys(&self) -> Vec<GatewayApiKey> {
        self.current_snapshot().list_api_keys()
    }

    fn list_channel_groups(&self) -> Vec<ChannelGroup> {
        self.current_snapshot().list_channel_groups()
    }

    fn list_model_prices(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
    ) -> Vec<ModelPrice> {
        self.current_snapshot()
            .list_model_prices(model, price_side, billing_meter)
    }

    fn list_model_prices_for_side(&self, model: &str, price_side: PriceSide) -> Vec<ModelPrice> {
        self.current_snapshot()
            .list_model_prices_for_side(model, price_side)
    }

    fn find_api_key(&self, api_key_id: i64) -> Option<GatewayApiKey> {
        self.current_snapshot().find_api_key(api_key_id)
    }

    fn find_api_key_by_hash(&self, key_hash: &str) -> Option<GatewayApiKey> {
        self.current_snapshot().find_api_key_by_hash(key_hash)
    }

    fn find_channel_group(&self, group_id: i64) -> Option<ChannelGroup> {
        self.current_snapshot().find_channel_group(group_id)
    }

    fn find_access_policy(&self, policy_id: i64) -> Option<GatewayAccessPolicy> {
        self.current_snapshot().find_access_policy(policy_id)
    }

    fn find_quota_policy(&self, policy_id: i64) -> Option<QuotaPolicy> {
        self.current_snapshot().find_quota_policy(policy_id)
    }

    fn list_gateway_risk_rules(&self) -> Vec<GatewayRiskRule> {
        self.current_snapshot().list_gateway_risk_rules()
    }

    fn find_latest_channel_group_metric_snapshot(
        &self,
        group_id: i64,
    ) -> Option<ChannelGroupMetricSnapshot> {
        self.current_snapshot()
            .find_latest_channel_group_metric_snapshot(group_id)
    }

    fn find_pricing_plan(&self, plan_code: &str) -> Option<PricingPlan> {
        self.current_snapshot().find_pricing_plan(plan_code)
    }

    fn find_model(&self, model: &str) -> Option<AiModel> {
        self.current_snapshot().find_model(model)
    }

    fn find_vendor(&self, vendor_code: &str) -> Option<ModelVendorDefinition> {
        self.current_snapshot().find_vendor(vendor_code)
    }

    fn resolve_model_mapping(
        &self,
        source_model: &str,
        context: &ResolveModelMappingContext,
    ) -> Option<ModelMappingRule> {
        self.current_snapshot()
            .resolve_model_mapping(source_model, context)
    }

    fn find_provider_route(&self, model: &str, provider_code: &str) -> Option<ModelProviderRoute> {
        self.current_snapshot()
            .find_provider_route(model, provider_code)
    }

    fn find_model_price(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        provider_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.current_snapshot().find_model_price(
            model,
            price_side,
            billing_meter,
            provider_code,
            pricing_plan_code,
        )
    }
}

impl PricingCatalog for SqlPricingCatalogSnapshot {
    fn list_models(&self, vendor_code: Option<&str>) -> Vec<AiModel> {
        self.models
            .iter()
            .filter(|model| {
                vendor_code
                    .map(|vendor_code| model.vendor_code == vendor_code)
                    .unwrap_or(true)
            })
            .cloned()
            .collect()
    }

    fn list_provider_routes(&self, model: &str) -> Vec<ModelProviderRoute> {
        self.provider_routes_by_key
            .get(model.trim())
            .cloned()
            .unwrap_or_default()
    }

    fn list_provider_channel_routes(&self) -> Vec<ProviderChannelRoute> {
        self.provider_channel_routes.clone()
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

    fn list_channel_groups(&self) -> Vec<ChannelGroup> {
        self.channel_groups.clone()
    }

    fn list_model_prices(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
    ) -> Vec<ModelPrice> {
        self.prices_by_key
            .get(model.trim())
            .map(|prices| {
                prices
                    .iter()
                    .filter(|price| {
                        price.price_side == price_side && price.billing_meter == billing_meter
                    })
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    }

    fn list_model_prices_for_side(&self, model: &str, price_side: PriceSide) -> Vec<ModelPrice> {
        self.prices_by_key
            .get(model.trim())
            .map(|prices| {
                prices
                    .iter()
                    .filter(|price| price.price_side == price_side)
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    }

    fn find_api_key(&self, api_key_id: i64) -> Option<GatewayApiKey> {
        self.api_keys_by_id.get(&api_key_id).cloned()
    }

    fn find_api_key_by_hash(&self, key_hash: &str) -> Option<GatewayApiKey> {
        self.api_keys_by_hash.get(key_hash).cloned()
    }

    fn find_channel_group(&self, group_id: i64) -> Option<ChannelGroup> {
        self.channel_groups_by_id.get(&group_id).cloned()
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

    fn find_latest_channel_group_metric_snapshot(
        &self,
        group_id: i64,
    ) -> Option<ChannelGroupMetricSnapshot> {
        self.channel_group_metric_snapshots
            .iter()
            .find(|snapshot| snapshot.group_id == group_id)
            .cloned()
    }

    fn find_pricing_plan(&self, plan_code: &str) -> Option<PricingPlan> {
        self.pricing_plans_by_code.get(plan_code).cloned()
    }

    fn find_model(&self, model: &str) -> Option<AiModel> {
        self.models_by_key.get(model.trim()).cloned()
    }

    fn find_vendor(&self, vendor_code: &str) -> Option<ModelVendorDefinition> {
        self.vendors_by_code.get(vendor_code).cloned()
    }

    fn resolve_model_mapping(
        &self,
        source_model: &str,
        context: &ResolveModelMappingContext,
    ) -> Option<ModelMappingRule> {
        resolve_model_mapping_from_rules(&self.model_mappings, source_model, context)
    }

    fn find_provider_route(&self, model: &str, provider_code: &str) -> Option<ModelProviderRoute> {
        self.provider_routes_by_key
            .get(model.trim())
            .and_then(|routes| {
                routes
                    .iter()
                    .find(|route| route.provider_code == provider_code)
                    .cloned()
            })
    }

    fn find_model_price(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        provider_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.prices_by_key
            .get(model.trim())
            .and_then(|prices| {
                prices
                    .iter()
                    .find(|price| {
                        price.price_side == price_side
                            && price.billing_meter == billing_meter
                            && option_matches(price.provider_code.as_deref(), provider_code)
                            && option_matches(
                                price.pricing_plan_code.as_deref(),
                                pricing_plan_code,
                            )
                    })
                    .cloned()
            })
    }
}

fn map_rows<R, T>(rows: Vec<R>, mapper: impl Fn(R) -> DomainResult<T>) -> DomainResult<Vec<T>> {
    rows.into_iter().map(mapper).collect()
}

fn pricing_plans_with_standard_fallback(
    mut pricing_plans: Vec<PricingPlan>,
) -> DomainResult<Vec<PricingPlan>> {
    if pricing_plans
        .iter()
        .all(|plan| plan.plan_code.trim() != "standard")
    {
        pricing_plans.push(PricingPlan::new(
            "standard",
            PriceSide::OfficialReference,
            DecimalValue::parse("1.000000")?,
            Money::usd("0.000000")?,
        ));
    }
    Ok(pricing_plans)
}

fn has_text(value: Option<&str>) -> bool {
    value.map(str::trim).is_some_and(|value| !value.is_empty())
}

fn option_matches(actual: Option<&str>, expected: Option<&str>) -> bool {
    match expected {
        Some(expected) => actual == Some(expected),
        None => actual.is_none(),
    }
}
