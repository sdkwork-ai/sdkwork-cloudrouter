use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type OfficialPricingCatalogReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<OfficialPricingCatalogSnapshot>> + Send + 'a>>;
pub type OfficialPricingProductCatalogReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<OfficialPricingProductCatalogSnapshot>> + Send + 'a>>;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct OfficialPricingCatalogQuery {
    pub category: String,
    pub search_query: Option<String>,
    pub vendor_code: Option<String>,
    pub region_code: Option<String>,
    pub meter_code: Option<String>,
    pub currency_code: Option<String>,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct OfficialPricingProductCatalogQuery {
    pub category: String,
    pub search_query: Option<String>,
    pub vendor_codes: Vec<String>,
    /// Preferred billing region, **not** a row filter. A resource stay a single
    /// admin row no matter how many regions it prices; this value only decides
    /// which region tab the row opens on. When the resource prices no rate in
    /// the requested region the loader falls back through the documented chain
    /// (configured default region -> requested region -> `global` -> first
    /// region) so a row always renders a meaningful official reference price
    /// and sales price.
    pub region_code: Option<String>,
    /// Caller scope for the configured default billing region preference
    /// (`pricing_default_region`). The loader prefers the caller's own scope
    /// and falls back to the official `(0, 0)` scope; use `(0, 0)` when the
    /// caller is anonymous so the platform-configured defaults still apply.
    /// The preference itself is applied in memory over the full price set of
    /// each resource — never inside the price SQL.
    pub tenant_id: i64,
    pub organization_id: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingCatalogSnapshot {
    pub items: Vec<OfficialPricingRate>,
    pub groups: Vec<OfficialPricingGroupFacet>,
    pub vendors: Vec<OfficialPricingValueFacet>,
    pub regions: Vec<OfficialPricingValueFacet>,
    pub currencies: Vec<OfficialPricingValueFacet>,
    pub meters: Vec<OfficialPricingMeterFacet>,
    #[serde(skip_serializing)]
    pub total_items: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingProductCatalogSnapshot {
    pub items: Vec<OfficialPricingProductGroup>,
    pub groups: Vec<OfficialPricingGroupFacet>,
    pub vendors: Vec<OfficialPricingValueFacet>,
    pub regions: Vec<OfficialPricingValueFacet>,
    #[serde(skip_serializing)]
    pub total_items: i64,
}

/// A billing region the resource genuinely prices. Drives the per-row region
/// tabs and the "default region" dropdown of the admin price settings list.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingRegionOption {
    pub region_code: String,
    pub currency_code: String,
    pub rate_count: i32,
    /// True for the generic `global` bucket; the region resolution chain treats
    /// `global` as the last deterministic fallback before "first region".
    pub is_global: bool,
}

/// One admin list row per **resource** (model), aggregated across every region
/// it prices. `group_key` is the stable resource identity hash produced by
/// `pricing_resource_key(vendor_code, provider_code, catalog_key,
/// product_code, resource_code)` — it deliberately excludes region, currency,
/// and price book, so a resource priced in `cn` + `global` still renders as a
/// single row. `rates` contains the rates of all regions (each carries its own
/// `regionCode`/`currencyCode`), letting the UI switch official reference and
/// sales prices via per-row region tabs. The group-level `region_code` /
/// `currency_code` / `price_book_code` scalars resolve through the shared
/// region chain: configured default region -> requested region -> `global` ->
/// first region in the resource's own region list.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingProductGroup {
    pub group_key: String,
    pub group_codes: Vec<String>,
    pub product_code: String,
    pub product_kind: String,
    pub product_display_name: String,
    pub vendor_code: String,
    pub provider_code: String,
    pub region_code: String,
    pub resource_type: String,
    pub resource_code: String,
    pub resource_display_name: String,
    pub catalog_key: Option<String>,
    pub currency_code: String,
    pub price_book_code: String,
    pub price_book_version: String,
    pub rates: Vec<OfficialPricingRate>,
    /// Every region this resource prices, ordered for display (non-global
    /// regions first, then `global`). The admin row renders one tab per entry.
    pub available_regions: Vec<OfficialPricingRegionOption>,
    /// The default billing region configured for the resource; empty when the
    /// operator has not pinned one.
    pub default_region_code: String,
    /// True when `region_code` is not the region the caller asked for, i.e. the
    /// chain fell back to the default region, `global`, or the first region.
    pub region_fallback: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingRate {
    pub rate_code: String,
    pub rate_hash: String,
    pub group_codes: Vec<String>,
    pub product_code: String,
    pub product_kind: String,
    pub product_display_name: String,
    pub operation_code: String,
    pub operation_kind: String,
    pub operation_display_name: String,
    pub vendor_code: String,
    pub provider_code: String,
    pub region_code: String,
    pub resource_type: String,
    pub resource_code: String,
    pub resource_display_name: String,
    pub catalog_key: Option<String>,
    pub api_format: Option<String>,
    pub endpoint_code: Option<String>,
    pub price_book_code: String,
    pub price_book_version: String,
    pub meter_code: String,
    pub meter_display_name: String,
    pub quantity_kind: String,
    pub unit_code: String,
    pub billability: String,
    pub charge_timing: String,
    pub calculation_mode: String,
    pub quantity_aggregation: String,
    pub unit_size: String,
    pub unit_price: String,
    pub minimum_quantity: String,
    pub quantity_step: Option<String>,
    pub currency_code: String,
    pub conditions: Vec<OfficialPricingRateCondition>,
    pub tiers: Vec<OfficialPricingRateTier>,
    pub formula: Option<OfficialPricingFormula>,
    pub priority: i32,
    pub rate_variant: String,
    pub schedule: Option<serde_json::Value>,
    pub effective_from: String,
    pub effective_to: Option<String>,
    pub source_url: String,
    pub source_observed_at: String,
    /// Model capability data merged from the sdkwork-models catalog
    /// (`ai_model` by `catalog_key`). Absent when the rate has no model
    /// capability record in the catalog.
    pub capabilities: Option<Vec<String>>,
    pub input_modalities: Option<Vec<String>>,
    pub output_modalities: Option<Vec<String>>,
    pub usage_scopes: Option<Vec<String>>,
    #[serde(default, with = "sdkwork_utils_rust::serde_int64::option")]
    pub context_tokens: Option<i64>,
    #[serde(default, with = "sdkwork_utils_rust::serde_int64::option")]
    pub max_input_tokens: Option<i64>,
    #[serde(default, with = "sdkwork_utils_rust::serde_int64::option")]
    pub max_output_tokens: Option<i64>,
    pub supports_streaming: Option<bool>,
    pub supports_tools: Option<bool>,
    pub supports_json_schema: Option<bool>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingRateCondition {
    pub dimension_code: String,
    pub operator_code: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingRateTier {
    pub tier_code: String,
    pub lower_bound: String,
    pub upper_bound: Option<String>,
    pub unit_size: String,
    pub unit_price: String,
    pub flat_amount: String,
    pub currency_code: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingFormula {
    pub formula_code: String,
    pub formula_version: String,
    pub constant_units: String,
    pub quantity_coefficient: String,
    pub minimum_units: Option<String>,
    pub maximum_units: Option<String>,
    pub terms: Vec<OfficialPricingFormulaTerm>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingFormulaTerm {
    pub term_code: String,
    pub dimension_code: String,
    pub coefficient: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingGroupFacet {
    pub id: String,
    pub code: String,
    pub count: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingValueFacet {
    pub id: String,
    pub code: String,
    pub count: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingMeterFacet {
    pub id: String,
    pub code: String,
    pub display_name: String,
    pub unit_code: String,
    pub count: String,
}

pub trait OfficialPricingCatalogReadStore {
    fn load_official_pricing_catalog<'a>(
        &'a self,
        query: OfficialPricingCatalogQuery,
    ) -> OfficialPricingCatalogReadFuture<'a>;

    fn load_official_pricing_product_catalog<'a>(
        &'a self,
        query: OfficialPricingProductCatalogQuery,
    ) -> OfficialPricingProductCatalogReadFuture<'a>;
}
