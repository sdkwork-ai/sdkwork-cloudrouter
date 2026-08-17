use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::Arc;

use arc_swap::ArcSwap;

use crate::domain::{
    has_text, AccountRateCard, AiModel, BillingMeter, DecimalValue, DomainError, DomainResult,
    GatewayAccessPolicy, GatewayApiKey, GatewayRiskRule, ModelMappingRule, ModelPrice,
    ModelUpstreamRoute, ModelVendorDefinition, Money, PriceSide, PricingPlan, PricingRule,
    QuotaPolicy, ResolveModelMappingContext, RoutingPolicy, RoutingRule, UpstreamAccountGroup,
    UpstreamAccountGroupMetricSnapshot, UpstreamAccountRoute,
};
use crate::infrastructure::in_memory_pricing_catalog::resolve_model_mapping_from_rules;
use crate::infrastructure::sql::rows::{
    AccountRateCardRow, AiModelRow, GatewayAccessPolicyRow, GatewayApiKeyRow, GatewayRiskRuleRow,
    ModelMappingRuleRow, ModelPriceRow, ModelUpstreamRouteRow, ModelVendorRow, PricingPlanRow,
    PricingRuleRow, QuotaPolicyRow, RoutingPolicyRow, RoutingRuleRow,
    UpstreamAccountGroupMetricSnapshotRow, UpstreamAccountGroupRow, UpstreamAccountRouteRow,
    UpstreamSupplierModelAccessRow,
};
use crate::ports::{
    AccountBaseUrlConfig, AccountGroupModelAccess, AdminLlmProtocolConfig, PricingCatalog,
    SupplierModelAccess, UpstreamAccountRouteCatalog, VendorModelListEntry,
};

#[derive(Default)]
pub struct PricingCatalogRows {
    pub vendors: Vec<ModelVendorRow>,
    pub models: Vec<AiModelRow>,
    pub model_upstream_routes: Vec<ModelUpstreamRouteRow>,
    pub upstream_account_routes: Vec<UpstreamAccountRouteRow>,
    pub routing_policies: Vec<RoutingPolicyRow>,
    pub routing_rules: Vec<RoutingRuleRow>,
    pub model_mappings: Vec<ModelMappingRuleRow>,
    pub pricing_plans: Vec<PricingPlanRow>,
    pub pricing_rules: Vec<PricingRuleRow>,
    pub account_rate_cards: Vec<AccountRateCardRow>,
    pub upstream_account_groups: Vec<UpstreamAccountGroupRow>,
    pub upstream_supplier_model_access: Vec<UpstreamSupplierModelAccessRow>,
    pub api_keys: Vec<GatewayApiKeyRow>,
    pub access_policies: Vec<GatewayAccessPolicyRow>,
    pub quota_policies: Vec<QuotaPolicyRow>,
    pub gateway_risk_rules: Vec<GatewayRiskRuleRow>,
    pub upstream_account_group_metric_snapshots: Vec<UpstreamAccountGroupMetricSnapshotRow>,
    pub prices: Vec<ModelPriceRow>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SqlPricingCatalogSnapshotSummary {
    pub vendors: usize,
    pub models: usize,
    pub model_upstream_routes: usize,
    pub callable_model_upstream_routes: usize,
    pub upstream_account_routes: usize,
    pub callable_upstream_account_routes: usize,
    pub provider_upstream_account_group_bindings: usize,
    pub routing_policies: usize,
    pub routing_rules: usize,
    pub model_mappings: usize,
    pub pricing_plans: usize,
    pub pricing_rules: usize,
    pub upstream_account_groups: usize,
    pub upstream_suppliers: usize,
    pub api_keys: usize,
    pub prices: usize,
    pub managed_provider_secrets: usize,
}

#[derive(Clone)]
struct ScopedPricingPlan {
    id: i64,
    tenant_id: i64,
    organization_id: i64,
    value: PricingPlan,
}

#[derive(Clone)]
struct ScopedModelPrice {
    tenant_id: i64,
    organization_id: i64,
    value: ModelPrice,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct ModelPriceBusinessIdentity {
    catalog_key: String,
    region_code: String,
    price_side: PriceSide,
    billing_meter: BillingMeter,
    supplier_code: Option<String>,
    account_id: Option<i64>,
    pricing_plan_code: Option<String>,
    rate_hash: Option<String>,
}

impl From<&ModelPrice> for ModelPriceBusinessIdentity {
    fn from(price: &ModelPrice) -> Self {
        Self {
            catalog_key: price.catalog_key.clone(),
            region_code: price.region_code.clone(),
            price_side: price.price_side,
            billing_meter: price.billing_meter.clone(),
            supplier_code: price.supplier_code.clone(),
            account_id: price.account_id,
            pricing_plan_code: price.pricing_plan_code.clone(),
            rate_hash: price
                .rate_metadata
                .as_ref()
                .map(|metadata| metadata.rate_hash.clone()),
        }
    }
}

pub struct SqlPricingCatalogSnapshot {
    vendors: Vec<ModelVendorDefinition>,
    models: Vec<AiModel>,
    model_upstream_routes: Vec<ModelUpstreamRoute>,
    upstream_account_routes: Arc<[UpstreamAccountRoute]>,
    routing_policies: Vec<RoutingPolicy>,
    routing_rules: Vec<RoutingRule>,
    model_mappings: Vec<ModelMappingRule>,
    pricing_plans: Vec<ScopedPricingPlan>,
    pricing_rules: Vec<PricingRule>,
    account_rate_cards: Vec<AccountRateCard>,
    upstream_account_groups: Vec<UpstreamAccountGroup>,
    api_keys: Vec<GatewayApiKey>,
    access_policies: Vec<GatewayAccessPolicy>,
    quota_policies: Vec<QuotaPolicy>,
    gateway_risk_rules: Vec<GatewayRiskRule>,
    upstream_account_group_metric_snapshots: Vec<UpstreamAccountGroupMetricSnapshot>,
    prices: Vec<ScopedModelPrice>,
    managed_provider_secrets: BTreeMap<String, String>,
    account_group_model_access_by_id: HashMap<i64, AccountGroupModelAccess>,
    supplier_model_access_by_code: HashMap<String, SupplierModelAccess>,
    supplier_default_base_url_by_code: HashMap<String, String>,
    account_base_url_config_by_id: HashMap<i64, AccountBaseUrlConfig>,
    // --- Indexes for O(1) hot-path lookups ---
    models_by_key: HashMap<String, AiModel>,
    models_by_name: HashMap<String, Vec<String>>,
    api_keys_by_hash: HashMap<String, GatewayApiKey>,
    api_keys_by_id: HashMap<i64, GatewayApiKey>,
    upstream_account_groups_by_id: HashMap<i64, UpstreamAccountGroup>,
    pricing_plans_by_code: HashMap<String, Vec<ScopedPricingPlan>>,
    vendors_by_code: HashMap<String, ModelVendorDefinition>,
    model_upstream_routes_by_key: HashMap<String, Vec<ModelUpstreamRoute>>,
    prices_by_key: HashMap<String, Vec<ScopedModelPrice>>,
}

impl SqlPricingCatalogSnapshot {
    pub fn from_rows(rows: PricingCatalogRows) -> DomainResult<Self> {
        Self::from_rows_and_managed_provider_secrets(rows, BTreeMap::new())
    }

    pub fn from_rows_and_managed_provider_secrets(
        rows: PricingCatalogRows,
        managed_provider_secrets: BTreeMap<String, String>,
    ) -> DomainResult<Self> {
        let pricing_plans = scoped_pricing_plans_with_standard_fallback(rows.pricing_plans)?;
        let prices = map_scoped_model_prices(rows.prices)?;
        let account_group_model_access_by_id = rows
            .upstream_account_groups
            .iter()
            .map(|row| {
                Ok((
                    row.id,
                    AccountGroupModelAccess {
                        group_id: row.id,
                        blacklist: parse_vendor_model_list(&row.model_blacklist_json)?,
                        whitelist: parse_vendor_model_list(&row.model_whitelist_json)?,
                    },
                ))
            })
            .collect::<DomainResult<HashMap<_, _>>>()?;
        let supplier_model_access_by_code = rows
            .upstream_supplier_model_access
            .iter()
            .map(|row| {
                Ok((
                    row.supplier_code.clone(),
                    SupplierModelAccess {
                        supplier_code: row.supplier_code.clone(),
                        blacklist: parse_vendor_model_list(&row.model_blacklist_json)?,
                        whitelist: parse_vendor_model_list(&row.model_whitelist_json)?,
                    },
                ))
            })
            .collect::<DomainResult<HashMap<_, _>>>()?;
        // 供应商默认 Base URL 映射（非 LLM 资源请求走默认端点）；同一供应商多行取同一值
        let supplier_default_base_url_by_code = rows
            .upstream_account_routes
            .iter()
            .filter_map(|row| {
                row.supplier_default_base_url
                    .as_deref()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(|value| (row.supplier_code.clone(), value.to_owned()))
            })
            .collect::<HashMap<_, _>>();
        // 账号 Base URL 配置映射（账号覆盖 + 供应商协议 URL；账号优先于供应商的解析数据源）
        let account_base_url_config_by_id = rows
            .upstream_account_routes
            .iter()
            .filter_map(|row| {
                let account_protocol_base_urls =
                    parse_protocol_configs(&row.account_protocols_json);
                let supplier_protocol_base_urls =
                    parse_protocol_configs(&row.supplier_protocols_json);
                let has_config = row
                    .account_default_base_url
                    .as_deref()
                    .map(str::trim)
                    .is_some_and(|value| !value.is_empty())
                    || !account_protocol_base_urls.is_empty()
                    || !supplier_protocol_base_urls.is_empty();
                if !has_config {
                    return None;
                }
                Some((
                    row.account_id,
                    AccountBaseUrlConfig {
                        account_default_base_url: row.account_default_base_url.clone(),
                        account_protocol_base_urls,
                        supplier_protocol_base_urls,
                    },
                ))
            })
            .collect::<HashMap<_, _>>();
        let mut snapshot = Self {
            vendors: map_rows(rows.vendors, ModelVendorRow::try_into_domain)?,
            models: map_rows(rows.models, AiModelRow::try_into_domain)?,
            model_upstream_routes: map_rows(
                rows.model_upstream_routes,
                ModelUpstreamRouteRow::try_into_domain,
            )?,
            upstream_account_routes: map_rows(
                rows.upstream_account_routes,
                UpstreamAccountRouteRow::try_into_domain,
            )?
            .into(),
            routing_policies: map_rows(rows.routing_policies, RoutingPolicyRow::try_into_domain)?,
            routing_rules: map_rows(rows.routing_rules, RoutingRuleRow::try_into_domain)?,
            model_mappings: map_rows(rows.model_mappings, ModelMappingRuleRow::try_into_domain)?,
            pricing_plans,
            pricing_rules: rows
                .pricing_rules
                .into_iter()
                .map(|row| row.value)
                .collect(),
            account_rate_cards: rows
                .account_rate_cards
                .into_iter()
                .map(|row| row.value)
                .collect(),
            upstream_account_groups: map_rows(
                rows.upstream_account_groups,
                UpstreamAccountGroupRow::try_into_domain,
            )?,
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
            upstream_account_group_metric_snapshots: map_rows(
                rows.upstream_account_group_metric_snapshots,
                UpstreamAccountGroupMetricSnapshotRow::try_into_domain,
            )?,
            prices,
            managed_provider_secrets,
            account_group_model_access_by_id,
            supplier_model_access_by_code,
            supplier_default_base_url_by_code,
            account_base_url_config_by_id,
            models_by_key: HashMap::new(),
            models_by_name: HashMap::new(),
            api_keys_by_hash: HashMap::new(),
            api_keys_by_id: HashMap::new(),
            upstream_account_groups_by_id: HashMap::new(),
            pricing_plans_by_code: HashMap::new(),
            vendors_by_code: HashMap::new(),
            model_upstream_routes_by_key: HashMap::new(),
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
        self.models_by_name = self.models.iter().fold(HashMap::new(), |mut index, model| {
            for name in [&model.catalog_key, &model.model] {
                let keys = index.entry(name.clone()).or_default();
                if !keys.contains(&model.catalog_key) {
                    keys.push(model.catalog_key.clone());
                }
            }
            index
        });
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
        self.upstream_account_groups_by_id = self
            .upstream_account_groups
            .iter()
            .map(|group| (group.id, group.clone()))
            .collect();
        self.pricing_plans_by_code =
            self.pricing_plans
                .iter()
                .fold(HashMap::new(), |mut index, plan| {
                    index
                        .entry(plan.value.plan_code.clone())
                        .or_default()
                        .push(plan.clone());
                    index
                });
        self.vendors_by_code = self
            .vendors
            .iter()
            .map(|vendor| (vendor.vendor_code.clone(), vendor.clone()))
            .collect();
        self.model_upstream_routes_by_key =
            self.model_upstream_routes
                .iter()
                .fold(HashMap::new(), |mut acc, route| {
                    acc.entry(route.catalog_key.trim().to_owned())
                        .or_default()
                        .push(route.clone());
                    acc
                });
        self.prices_by_key = self.prices.iter().fold(HashMap::new(), |mut index, price| {
            index
                .entry(price.value.catalog_key.trim().to_owned())
                .or_default()
                .push(price.clone());
            index
        });
    }

    pub fn managed_provider_secrets(&self) -> BTreeMap<String, String> {
        self.managed_provider_secrets.clone()
    }

    pub fn summary(&self) -> SqlPricingCatalogSnapshotSummary {
        SqlPricingCatalogSnapshotSummary {
            vendors: self.vendors.len(),
            models: self.models.len(),
            model_upstream_routes: self.model_upstream_routes.len(),
            callable_model_upstream_routes: self
                .model_upstream_routes
                .iter()
                .filter(|route| {
                    has_text(route.base_url.as_deref()) && has_text(route.secret_ref.as_deref())
                })
                .count(),
            upstream_account_routes: self.upstream_account_routes.len(),
            callable_upstream_account_routes: self
                .upstream_account_routes
                .iter()
                .filter(|route| {
                    has_text(route.base_url.as_deref()) && has_text(route.secret_ref.as_deref())
                })
                .count(),
            provider_upstream_account_group_bindings: self
                .upstream_account_routes
                .iter()
                .map(|route| route.account_group_bindings.len())
                .sum(),
            routing_policies: self.routing_policies.len(),
            routing_rules: self.routing_rules.len(),
            model_mappings: self.model_mappings.len(),
            pricing_plans: self.pricing_plans.len(),
            pricing_rules: self.pricing_rules.len(),
            upstream_account_groups: self.upstream_account_groups.len(),
            upstream_suppliers: self.supplier_model_access_by_code.len(),
            api_keys: self.api_keys.len(),
            prices: self.prices.len(),
            managed_provider_secrets: self.managed_provider_secrets.len(),
        }
    }

    fn visible_model_prices(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        matches: impl Fn(&ModelPrice) -> bool,
    ) -> Vec<ModelPrice> {
        let Some(prices) = self.prices_by_key.get(model.trim()) else {
            return Vec::new();
        };

        let mut best_specificity: HashMap<ModelPriceBusinessIdentity, u8> = HashMap::new();
        for price in prices {
            if !matches(&price.value) {
                continue;
            }
            let Some(specificity) = scope_specificity(
                price.tenant_id,
                price.organization_id,
                tenant_id,
                organization_id,
            ) else {
                continue;
            };
            let identity = ModelPriceBusinessIdentity::from(&price.value);
            best_specificity
                .entry(identity)
                .and_modify(|current| *current = (*current).max(specificity))
                .or_insert(specificity);
        }

        let mut emitted = HashSet::new();
        prices
            .iter()
            .filter_map(|price| {
                if !matches(&price.value) {
                    return None;
                }
                let specificity = scope_specificity(
                    price.tenant_id,
                    price.organization_id,
                    tenant_id,
                    organization_id,
                )?;
                let identity = ModelPriceBusinessIdentity::from(&price.value);
                if best_specificity.get(&identity) != Some(&specificity)
                    || !emitted.insert(identity)
                {
                    return None;
                }
                Some(price.value.clone())
            })
            .collect()
    }

    fn scoped_pricing_plan(
        &self,
        tenant_id: i64,
        organization_id: i64,
        plan_code: &str,
    ) -> Option<PricingPlan> {
        let plans = self.pricing_plans_by_code.get(plan_code.trim())?;
        let mut selected: Option<(u8, &PricingPlan)> = None;
        for plan in plans {
            let Some(specificity) = scope_specificity(
                plan.tenant_id,
                plan.organization_id,
                tenant_id,
                organization_id,
            ) else {
                continue;
            };
            if selected
                .as_ref()
                .map(|(current, _)| specificity > *current)
                .unwrap_or(true)
            {
                selected = Some((specificity, &plan.value));
            }
        }
        selected.map(|(_, plan)| plan.clone())
    }
}

pub struct RefreshableSqlPricingCatalog {
    snapshot: ArcSwap<SqlPricingCatalogSnapshot>,
}

impl RefreshableSqlPricingCatalog {
    pub fn new(snapshot: SqlPricingCatalogSnapshot) -> Self {
        Self {
            snapshot: ArcSwap::from_pointee(snapshot),
        }
    }

    pub fn replace_snapshot(&self, snapshot: SqlPricingCatalogSnapshot) {
        self.snapshot.store(Arc::new(snapshot));
    }

    fn current_snapshot(&self) -> Arc<SqlPricingCatalogSnapshot> {
        self.snapshot.load_full()
    }
}

impl UpstreamAccountRouteCatalog for RefreshableSqlPricingCatalog {
    fn shared_upstream_account_routes(&self) -> Arc<[UpstreamAccountRoute]> {
        Arc::clone(&self.current_snapshot().upstream_account_routes)
    }

    fn account_group_model_access(&self, group_id: i64) -> Option<AccountGroupModelAccess> {
        self.current_snapshot().account_group_model_access(group_id)
    }

    fn supplier_model_access(&self, supplier_code: &str) -> Option<SupplierModelAccess> {
        self.current_snapshot().supplier_model_access(supplier_code)
    }

    fn supplier_default_base_url(&self, supplier_code: &str) -> Option<String> {
        self.current_snapshot()
            .supplier_default_base_url_by_code
            .get(supplier_code)
            .cloned()
    }

    fn account_base_url_config(&self, account_id: i64) -> Option<AccountBaseUrlConfig> {
        self.current_snapshot()
            .account_base_url_config_by_id
            .get(&account_id)
            .cloned()
    }

    fn model_catalog_keys_by_name(&self, model_name: &str) -> Vec<String> {
        self.current_snapshot()
            .model_catalog_keys_by_name(model_name)
    }
}

impl PricingCatalog for RefreshableSqlPricingCatalog {
    fn visit_models(&self, vendor_code: Option<&str>, visitor: &mut dyn FnMut(&AiModel) -> bool) {
        self.current_snapshot().visit_models(vendor_code, visitor);
    }

    fn list_model_upstream_routes(&self, model: &str) -> Vec<ModelUpstreamRoute> {
        self.current_snapshot().list_model_upstream_routes(model)
    }

    fn list_upstream_account_routes(&self) -> Vec<UpstreamAccountRoute> {
        self.current_snapshot().list_upstream_account_routes()
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

    fn list_upstream_account_groups(&self) -> Vec<UpstreamAccountGroup> {
        self.current_snapshot().list_upstream_account_groups()
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

    fn list_model_prices_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
    ) -> Vec<ModelPrice> {
        self.current_snapshot().list_model_prices_for_scope(
            tenant_id,
            organization_id,
            model,
            price_side,
            billing_meter,
        )
    }

    fn list_model_prices_for_scope_side(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
    ) -> Vec<ModelPrice> {
        self.current_snapshot().list_model_prices_for_scope_side(
            tenant_id,
            organization_id,
            model,
            price_side,
        )
    }

    fn find_api_key(&self, api_key_id: i64) -> Option<GatewayApiKey> {
        self.current_snapshot().find_api_key(api_key_id)
    }

    fn find_api_key_by_hash(&self, key_hash: &str) -> Option<GatewayApiKey> {
        self.current_snapshot().find_api_key_by_hash(key_hash)
    }

    fn find_upstream_account_group(&self, group_id: i64) -> Option<UpstreamAccountGroup> {
        self.current_snapshot()
            .find_upstream_account_group(group_id)
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

    fn find_latest_upstream_account_group_metric_snapshot(
        &self,
        group_id: i64,
    ) -> Option<UpstreamAccountGroupMetricSnapshot> {
        self.current_snapshot()
            .find_latest_upstream_account_group_metric_snapshot(group_id)
    }

    fn find_pricing_plan(&self, plan_code: &str) -> Option<PricingPlan> {
        self.current_snapshot().find_pricing_plan(plan_code)
    }

    fn list_pricing_rules_for_plan(
        &self,
        tenant_id: i64,
        organization_id: i64,
        pricing_plan_id: i64,
        plan_code: &str,
    ) -> Vec<PricingRule> {
        self.current_snapshot().list_pricing_rules_for_plan(
            tenant_id,
            organization_id,
            pricing_plan_id,
            plan_code,
        )
    }

    fn list_account_rate_cards(
        &self,
        tenant_id: i64,
        organization_id: i64,
    ) -> Vec<AccountRateCard> {
        self.current_snapshot()
            .list_account_rate_cards(tenant_id, organization_id)
    }

    fn find_pricing_plan_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        plan_code: &str,
    ) -> Option<PricingPlan> {
        self.current_snapshot()
            .find_pricing_plan_for_scope(tenant_id, organization_id, plan_code)
    }

    fn find_pricing_plan_by_identity(
        &self,
        tenant_id: i64,
        organization_id: i64,
        pricing_plan_id: i64,
        plan_code: &str,
    ) -> Option<PricingPlan> {
        self.current_snapshot().find_pricing_plan_by_identity(
            tenant_id,
            organization_id,
            pricing_plan_id,
            plan_code,
        )
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

    fn find_model_upstream_route(
        &self,
        model: &str,
        supplier_code: &str,
    ) -> Option<ModelUpstreamRoute> {
        self.current_snapshot()
            .find_model_upstream_route(model, supplier_code)
    }

    fn find_model_price(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        supplier_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.current_snapshot().find_model_price(
            model,
            price_side,
            billing_meter,
            supplier_code,
            pricing_plan_code,
        )
    }

    fn find_model_price_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        supplier_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.current_snapshot().find_model_price_for_scope(
            tenant_id,
            organization_id,
            model,
            price_side,
            billing_meter,
            supplier_code,
            pricing_plan_code,
        )
    }
}

impl PricingCatalog for SqlPricingCatalogSnapshot {
    fn visit_models(&self, vendor_code: Option<&str>, visitor: &mut dyn FnMut(&AiModel) -> bool) {
        for model in self.models.iter().filter(|model| {
            vendor_code
                .map(|vendor_code| model.vendor_code == vendor_code)
                .unwrap_or(true)
        }) {
            if !visitor(model) {
                break;
            }
        }
    }

    fn list_model_upstream_routes(&self, model: &str) -> Vec<ModelUpstreamRoute> {
        self.model_upstream_routes_by_key
            .get(model.trim())
            .cloned()
            .unwrap_or_default()
    }

    fn list_upstream_account_routes(&self) -> Vec<UpstreamAccountRoute> {
        self.upstream_account_routes.to_vec()
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
        self.visible_model_prices(0, 0, model, |price| {
            price.price_side == price_side && price.billing_meter == billing_meter
        })
    }

    fn list_model_prices_for_side(&self, model: &str, price_side: PriceSide) -> Vec<ModelPrice> {
        self.visible_model_prices(0, 0, model, |price| price.price_side == price_side)
    }

    fn list_model_prices_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
    ) -> Vec<ModelPrice> {
        self.visible_model_prices(tenant_id, organization_id, model, |price| {
            price.price_side == price_side && price.billing_meter == billing_meter
        })
    }

    fn list_model_prices_for_scope_side(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
    ) -> Vec<ModelPrice> {
        self.visible_model_prices(tenant_id, organization_id, model, |price| {
            price.price_side == price_side
        })
    }

    fn find_api_key(&self, api_key_id: i64) -> Option<GatewayApiKey> {
        self.api_keys_by_id.get(&api_key_id).cloned()
    }

    fn find_api_key_by_hash(&self, key_hash: &str) -> Option<GatewayApiKey> {
        self.api_keys_by_hash.get(key_hash).cloned()
    }

    fn find_upstream_account_group(&self, group_id: i64) -> Option<UpstreamAccountGroup> {
        self.upstream_account_groups_by_id.get(&group_id).cloned()
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
        self.scoped_pricing_plan(0, 0, plan_code)
    }

    fn list_pricing_rules_for_plan(
        &self,
        tenant_id: i64,
        organization_id: i64,
        pricing_plan_id: i64,
        plan_code: &str,
    ) -> Vec<PricingRule> {
        self.pricing_rules
            .iter()
            .filter(|rule| {
                rule.tenant_id == tenant_id
                    && rule.organization_id == organization_id
                    && rule.pricing_plan_id == pricing_plan_id
                    && rule.plan_code == plan_code
            })
            .cloned()
            .collect()
    }

    fn list_account_rate_cards(
        &self,
        tenant_id: i64,
        organization_id: i64,
    ) -> Vec<AccountRateCard> {
        self.account_rate_cards
            .iter()
            .filter(|card| {
                (card.tenant_id == tenant_id && card.organization_id == organization_id)
                    || (card.tenant_id == 0 && card.organization_id == 0)
            })
            .cloned()
            .collect()
    }

    fn find_pricing_plan_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        plan_code: &str,
    ) -> Option<PricingPlan> {
        self.scoped_pricing_plan(tenant_id, organization_id, plan_code)
    }

    fn find_pricing_plan_by_identity(
        &self,
        tenant_id: i64,
        organization_id: i64,
        pricing_plan_id: i64,
        plan_code: &str,
    ) -> Option<PricingPlan> {
        self.pricing_plans
            .iter()
            .find(|plan| {
                plan.id == pricing_plan_id
                    && plan.tenant_id == tenant_id
                    && plan.organization_id == organization_id
                    && plan.value.plan_code == plan_code
            })
            .map(|plan| plan.value.clone())
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

    fn find_model_upstream_route(
        &self,
        model: &str,
        supplier_code: &str,
    ) -> Option<ModelUpstreamRoute> {
        self.model_upstream_routes_by_key
            .get(model.trim())
            .and_then(|routes| {
                routes
                    .iter()
                    .find(|route| route.supplier_code == supplier_code)
                    .cloned()
            })
    }

    fn find_model_price(
        &self,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        supplier_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.find_model_price_for_scope(
            0,
            0,
            model,
            price_side,
            billing_meter,
            supplier_code,
            pricing_plan_code,
        )
    }

    fn find_model_price_for_scope(
        &self,
        tenant_id: i64,
        organization_id: i64,
        model: &str,
        price_side: PriceSide,
        billing_meter: BillingMeter,
        supplier_code: Option<&str>,
        pricing_plan_code: Option<&str>,
    ) -> Option<ModelPrice> {
        self.visible_model_prices(tenant_id, organization_id, model, |price| {
            price.price_side == price_side
                && price.billing_meter == billing_meter
                && option_matches(price.supplier_code.as_deref(), supplier_code)
                && option_matches(price.pricing_plan_code.as_deref(), pricing_plan_code)
        })
        .into_iter()
        .next()
    }
}

impl UpstreamAccountRouteCatalog for SqlPricingCatalogSnapshot {
    fn shared_upstream_account_routes(&self) -> Arc<[UpstreamAccountRoute]> {
        Arc::clone(&self.upstream_account_routes)
    }

    fn account_group_model_access(&self, group_id: i64) -> Option<AccountGroupModelAccess> {
        self.account_group_model_access_by_id
            .get(&group_id)
            .cloned()
    }

    fn supplier_model_access(&self, supplier_code: &str) -> Option<SupplierModelAccess> {
        self.supplier_model_access_by_code
            .get(supplier_code)
            .cloned()
    }

    fn supplier_default_base_url(&self, supplier_code: &str) -> Option<String> {
        self.supplier_default_base_url_by_code
            .get(supplier_code)
            .cloned()
    }

    fn account_base_url_config(&self, account_id: i64) -> Option<AccountBaseUrlConfig> {
        self.account_base_url_config_by_id.get(&account_id).cloned()
    }

    fn model_catalog_keys_by_name(&self, model_name: &str) -> Vec<String> {
        self.models_by_name
            .get(model_name)
            .cloned()
            .unwrap_or_default()
    }
}

fn map_rows<R, T>(rows: Vec<R>, mapper: impl Fn(R) -> DomainResult<T>) -> DomainResult<Vec<T>> {
    rows.into_iter().map(mapper).collect()
}

/// 协议配置 JSON 字符串（[{"protocolCode","baseUrl"}]）→ 配置列表；解析失败/空串按空处理
/// （快照加载容错：管理面写入时已校验，这里仅作防御性解析）。
fn parse_protocol_configs(value: &str) -> Vec<AdminLlmProtocolConfig> {
    serde_json::from_str::<Vec<AdminLlmProtocolConfig>>(value).unwrap_or_default()
}

fn parse_vendor_model_list(value: &str) -> DomainResult<Vec<VendorModelListEntry>> {
    let items = serde_json::from_str::<Vec<serde_json::Value>>(value).map_err(|error| {
        DomainError::new(format!(
            "failed to parse upstream account group model list JSON: {error}"
        ))
    })?;
    items
        .into_iter()
        .map(|item| {
            let vendor_code = item
                .get("vendorCode")
                .and_then(|value| value.as_str())
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| {
                    DomainError::new(
                        "upstream account group model list entry requires a vendorCode",
                    )
                })?
                .to_owned();
            let models = item
                .get("models")
                .and_then(|value| value.as_array())
                .map(|models| {
                    models
                        .iter()
                        .filter_map(|value| value.as_str())
                        .map(str::trim)
                        .filter(|value| !value.is_empty())
                        .map(ToOwned::to_owned)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            Ok(VendorModelListEntry {
                vendor_code,
                models,
            })
        })
        .collect()
}

fn scoped_pricing_plans_with_standard_fallback(
    rows: Vec<PricingPlanRow>,
) -> DomainResult<Vec<ScopedPricingPlan>> {
    let mut pricing_plans = rows
        .into_iter()
        .map(|row| {
            let tenant_id = row.tenant_id;
            let organization_id = row.organization_id;
            Ok(ScopedPricingPlan {
                id: row.id,
                tenant_id,
                organization_id,
                value: row.try_into_domain()?,
            })
        })
        .collect::<DomainResult<Vec<_>>>()?;
    if pricing_plans.iter().all(|plan| {
        plan.tenant_id != 0
            || plan.organization_id != 0
            || plan.value.plan_code.trim() != "standard"
    }) {
        pricing_plans.push(ScopedPricingPlan {
            id: 0,
            tenant_id: 0,
            organization_id: 0,
            value: PricingPlan::new(
                "standard",
                PriceSide::OfficialReference,
                DecimalValue::parse("1.000000")?,
                Money::usd("0.000000")?,
            ),
        });
    }
    Ok(pricing_plans)
}

fn map_scoped_model_prices(rows: Vec<ModelPriceRow>) -> DomainResult<Vec<ScopedModelPrice>> {
    rows.into_iter()
        .map(|row| {
            let tenant_id = row.tenant_id;
            let organization_id = row.organization_id;
            Ok(ScopedModelPrice {
                tenant_id,
                organization_id,
                value: row.try_into_domain()?,
            })
        })
        .collect()
}

fn scope_specificity(
    candidate_tenant_id: i64,
    candidate_organization_id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> Option<u8> {
    if candidate_tenant_id == tenant_id && candidate_organization_id == organization_id {
        return Some(3);
    }
    if tenant_id > 0 && candidate_tenant_id == tenant_id && candidate_organization_id == 0 {
        return Some(2);
    }
    if candidate_tenant_id == 0 && candidate_organization_id == 0 {
        return Some(1);
    }
    None
}

fn option_matches(actual: Option<&str>, expected: Option<&str>) -> bool {
    match expected {
        Some(expected) => actual == Some(expected),
        None => actual.is_none(),
    }
}
