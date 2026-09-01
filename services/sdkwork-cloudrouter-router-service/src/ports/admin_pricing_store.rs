use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type AdminPricingCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminPricingSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminPricingListPage<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdminPricingStatus {
    Active,
    Inactive,
}

impl AdminPricingStatus {
    pub fn label(self) -> &'static str {
        match self {
            AdminPricingStatus::Active => "active",
            AdminPricingStatus::Inactive => "inactive",
        }
    }

    pub fn db_value(self) -> i32 {
        match self {
            AdminPricingStatus::Active => 1,
            AdminPricingStatus::Inactive => 0,
        }
    }

    pub fn from_db(value: i32) -> &'static str {
        if value == 1 {
            "active"
        } else {
            "inactive"
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdminPricingBasePriceSide {
    OfficialReference,
    UpstreamCost,
    CustomerCharge,
    InternalTransfer,
}

impl AdminPricingBasePriceSide {
    pub fn label(self) -> &'static str {
        match self {
            AdminPricingBasePriceSide::OfficialReference => "official_reference",
            AdminPricingBasePriceSide::UpstreamCost => "upstream_cost",
            AdminPricingBasePriceSide::CustomerCharge => "customer_charge",
            AdminPricingBasePriceSide::InternalTransfer => "internal_transfer",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdminPricingRoundingMode {
    HalfUp,
    HalfEven,
    Up,
    Down,
}

impl AdminPricingRoundingMode {
    pub fn label(self) -> &'static str {
        match self {
            AdminPricingRoundingMode::HalfUp => "half_up",
            AdminPricingRoundingMode::HalfEven => "half_even",
            AdminPricingRoundingMode::Up => "up",
            AdminPricingRoundingMode::Down => "down",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdminRateCardSubjectType {
    Default,
    ApiKey,
    AccountGroup,
    Account,
    User,
    Organization,
}

impl AdminRateCardSubjectType {
    pub fn label(self) -> &'static str {
        match self {
            AdminRateCardSubjectType::Default => "default",
            AdminRateCardSubjectType::ApiKey => "api_key",
            AdminRateCardSubjectType::AccountGroup => "account_group",
            AdminRateCardSubjectType::Account => "account",
            AdminRateCardSubjectType::User => "user",
            AdminRateCardSubjectType::Organization => "organization",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdminPricingFormulaMode {
    MultiplierMarkup,
    UnitPriceOverride,
}

impl AdminPricingFormulaMode {
    pub fn label(self) -> &'static str {
        match self {
            AdminPricingFormulaMode::MultiplierMarkup => "multiplier_markup",
            AdminPricingFormulaMode::UnitPriceOverride => "unit_price_override",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminPricingPlansQuery {
    pub subject: AdminPricingSubject,
    pub q: Option<String>,
    pub base_price_side: Option<AdminPricingBasePriceSide>,
    pub status: Option<AdminPricingStatus>,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoadAdminPricingPlanQuery {
    pub subject: AdminPricingSubject,
    pub plan_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminRateCardsQuery {
    pub subject: AdminPricingSubject,
    pub subject_type: Option<AdminRateCardSubjectType>,
    pub pricing_plan_id: Option<String>,
    pub status: Option<AdminPricingStatus>,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminPricingRulesQuery {
    pub subject: AdminPricingSubject,
    pub q: Option<String>,
    pub pricing_plan_id: Option<String>,
    pub status: Option<AdminPricingStatus>,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminPricingPlanCommand {
    pub subject: AdminPricingSubject,
    pub plan_uuid: String,
    pub audit_log_uuid: String,
    pub plan_code: String,
    pub plan_name: String,
    pub base_price_side: AdminPricingBasePriceSide,
    pub currency_code: String,
    pub rounding_mode: AdminPricingRoundingMode,
    pub minimum_charge_amount: String,
    pub effective_from: String,
    pub effective_to: Option<String>,
    pub status: AdminPricingStatus,
    pub charge_mode: String,
    pub settlement_mode: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminPricingPlanCommand {
    pub subject: AdminPricingSubject,
    pub plan_id: String,
    pub plan_uuid: String,
    pub audit_log_uuid: String,
    pub plan_name: String,
    pub base_price_side: AdminPricingBasePriceSide,
    pub currency_code: String,
    pub rounding_mode: AdminPricingRoundingMode,
    pub minimum_charge_amount: String,
    pub effective_from: String,
    pub effective_to: Option<String>,
    pub status: AdminPricingStatus,
    pub charge_mode: String,
    pub settlement_mode: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminRateCardCommand {
    pub subject: AdminPricingSubject,
    pub rate_card_uuid: String,
    pub audit_log_uuid: String,
    pub subject_type: AdminRateCardSubjectType,
    pub subject_id: Option<String>,
    pub subject_code: Option<String>,
    pub pricing_plan_id: String,
    pub priority: i64,
    pub effective_from: String,
    pub effective_to: Option<String>,
    pub status: AdminPricingStatus,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminRateCardCommand {
    pub subject: AdminPricingSubject,
    pub rate_card_id: String,
    pub rate_card_uuid: String,
    pub audit_log_uuid: String,
    pub subject_type: AdminRateCardSubjectType,
    pub subject_id: Option<String>,
    pub subject_code: Option<String>,
    pub pricing_plan_id: String,
    pub priority: i64,
    pub effective_from: String,
    pub effective_to: Option<String>,
    pub status: AdminPricingStatus,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminRateCardCommand {
    pub subject: AdminPricingSubject,
    pub rate_card_id: String,
    pub audit_log_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminPricingRuleCommand {
    pub subject: AdminPricingSubject,
    pub rule_uuid: String,
    pub audit_log_uuid: String,
    pub pricing_plan_id: String,
    pub rule_code: String,
    pub product_code: Option<String>,
    pub operation_code: Option<String>,
    pub meter_code: Option<String>,
    pub provider_code: Option<String>,
    pub region_code: Option<String>,
    pub catalog_key: Option<String>,
    pub formula_mode: AdminPricingFormulaMode,
    pub multiplier: String,
    pub markup_amount: String,
    pub unit_price_override: Option<String>,
    pub conditions: serde_json::Value,
    pub schedule: Option<serde_json::Value>,
    pub priority: i64,
    pub effective_from: String,
    pub effective_to: Option<String>,
    pub status: AdminPricingStatus,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminPricingRuleCommand {
    pub subject: AdminPricingSubject,
    pub rule_id: String,
    pub rule_uuid: String,
    pub audit_log_uuid: String,
    pub pricing_plan_id: String,
    pub product_code: Option<String>,
    pub operation_code: Option<String>,
    pub meter_code: Option<String>,
    pub provider_code: Option<String>,
    pub region_code: Option<String>,
    pub catalog_key: Option<String>,
    pub formula_mode: AdminPricingFormulaMode,
    pub multiplier: String,
    pub markup_amount: String,
    pub unit_price_override: Option<String>,
    pub conditions: serde_json::Value,
    pub schedule: Option<serde_json::Value>,
    pub priority: i64,
    pub effective_from: String,
    pub effective_to: Option<String>,
    pub status: AdminPricingStatus,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminPricingRuleCommand {
    pub subject: AdminPricingSubject,
    pub rule_id: String,
    pub audit_log_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminPricingPlanItem {
    pub id: String,
    pub plan_code: String,
    pub plan_name: String,
    pub base_price_side: String,
    pub currency_code: String,
    pub fallback_policy: String,
    pub rounding_mode: String,
    pub minimum_charge_amount: String,
    pub effective_from: Option<String>,
    pub effective_to: Option<String>,
    pub status: String,
    pub charge_mode: String,
    pub settlement_mode: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub version: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminRateCardItem {
    pub id: String,
    pub subject_type: String,
    pub subject_id: Option<String>,
    pub subject_code: Option<String>,
    pub pricing_plan_id: String,
    pub plan_code: Option<String>,
    pub plan_name: Option<String>,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub priority: i64,
    pub effective_from: Option<String>,
    pub effective_to: Option<String>,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

// Default billing region per resource (model). Only resources that expose
// pricing across multiple regions may carry a default region; the default is
// used by the billing engine to pick a region when no explicit region is set.
// Uniqueness is enforced on the resource identity (`resource_key`, derived by
// the pricing_resource_key() SQL helper), not on catalog_key, so a resource
// priced in several regions still owns exactly one default region row.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminDefaultRegionsQuery {
    pub subject: AdminPricingSubject,
    pub q: Option<String>,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SaveAdminDefaultRegionCommand {
    pub subject: AdminPricingSubject,
    pub region_uuid: String,
    pub audit_log_uuid: String,
    pub vendor_code: String,
    pub provider_code: String,
    pub product_code: String,
    pub resource_code: String,
    pub catalog_key: String,
    pub default_region_code: String,
    pub currency_code: String,
    pub description: Option<String>,
    pub effective_from: String,
    pub effective_to: Option<String>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminDefaultRegionCommand {
    pub subject: AdminPricingSubject,
    pub default_region_id: String,
    pub audit_log_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

/// Updates an existing per-model default billing region row. The resource
/// identity (`catalog_key`/`vendor_code`/`product_code`) is immutable on
/// update: a catalog key maps to at most one default region within a scope
/// (mutual exclusivity), so operators switch which region is default by
/// changing `default_region_code` on the existing row rather than creating a
/// competing one.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminDefaultRegionCommand {
    pub subject: AdminPricingSubject,
    pub default_region_id: String,
    pub audit_log_uuid: String,
    pub default_region_code: String,
    pub currency_code: String,
    pub description: Option<String>,
    pub effective_from: String,
    pub effective_to: Option<String>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminDefaultRegionItem {
    pub id: String,
    pub catalog_key: String,
    pub vendor_code: String,
    pub provider_code: String,
    pub product_code: String,
    pub resource_code: String,
    pub default_region_code: String,
    pub currency_code: String,
    pub description: Option<String>,
    pub effective_from: Option<String>,
    pub effective_to: Option<String>,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub version: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminPricingRuleItem {
    pub id: String,
    pub pricing_plan_id: String,
    pub plan_code: Option<String>,
    pub rule_code: String,
    pub product_code: Option<String>,
    pub operation_code: Option<String>,
    pub meter_code: Option<String>,
    pub provider_code: Option<String>,
    pub region_code: Option<String>,
    pub catalog_key: Option<String>,
    pub formula_mode: String,
    pub multiplier: String,
    pub markup_amount: String,
    pub unit_price_override: Option<String>,
    pub conditions: serde_json::Value,
    pub schedule: Option<serde_json::Value>,
    #[serde(with = "sdkwork_utils_rust::serde_int64")]
    pub priority: i64,
    pub effective_from: Option<String>,
    pub effective_to: Option<String>,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

pub trait AdminPricingStore {
    fn list_pricing_plans<'a>(
        &'a self,
        query: ListAdminPricingPlansQuery,
    ) -> AdminPricingCommandFuture<'a, AdminPricingListPage<AdminPricingPlanItem>>;

    fn load_pricing_plan<'a>(
        &'a self,
        query: LoadAdminPricingPlanQuery,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPricingPlanItem>>;

    fn create_pricing_plan<'a>(
        &'a self,
        command: CreateAdminPricingPlanCommand,
    ) -> AdminPricingCommandFuture<'a, AdminPricingPlanItem>;

    fn update_pricing_plan<'a>(
        &'a self,
        command: UpdateAdminPricingPlanCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPricingPlanItem>>;

    fn list_rate_cards<'a>(
        &'a self,
        query: ListAdminRateCardsQuery,
    ) -> AdminPricingCommandFuture<'a, AdminPricingListPage<AdminRateCardItem>>;

    fn create_rate_card<'a>(
        &'a self,
        command: CreateAdminRateCardCommand,
    ) -> AdminPricingCommandFuture<'a, AdminRateCardItem>;

    fn update_rate_card<'a>(
        &'a self,
        command: UpdateAdminRateCardCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminRateCardItem>>;

    fn delete_rate_card<'a>(
        &'a self,
        command: DeleteAdminRateCardCommand,
    ) -> AdminPricingCommandFuture<'a, bool>;

    fn list_pricing_rules<'a>(
        &'a self,
        query: ListAdminPricingRulesQuery,
    ) -> AdminPricingCommandFuture<'a, AdminPricingListPage<AdminPricingRuleItem>>;

    fn create_pricing_rule<'a>(
        &'a self,
        command: CreateAdminPricingRuleCommand,
    ) -> AdminPricingCommandFuture<'a, AdminPricingRuleItem>;

    fn update_pricing_rule<'a>(
        &'a self,
        command: UpdateAdminPricingRuleCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminPricingRuleItem>>;

    fn delete_pricing_rule<'a>(
        &'a self,
        command: DeleteAdminPricingRuleCommand,
    ) -> AdminPricingCommandFuture<'a, bool>;

    fn list_default_regions<'a>(
        &'a self,
        query: ListAdminDefaultRegionsQuery,
    ) -> AdminPricingCommandFuture<'a, AdminPricingListPage<AdminDefaultRegionItem>>;

    fn save_default_region<'a>(
        &'a self,
        command: SaveAdminDefaultRegionCommand,
    ) -> AdminPricingCommandFuture<'a, AdminDefaultRegionItem>;

    fn update_default_region<'a>(
        &'a self,
        command: UpdateAdminDefaultRegionCommand,
    ) -> AdminPricingCommandFuture<'a, Option<AdminDefaultRegionItem>>;

    fn delete_default_region<'a>(
        &'a self,
        command: DeleteAdminDefaultRegionCommand,
    ) -> AdminPricingCommandFuture<'a, bool>;
}
