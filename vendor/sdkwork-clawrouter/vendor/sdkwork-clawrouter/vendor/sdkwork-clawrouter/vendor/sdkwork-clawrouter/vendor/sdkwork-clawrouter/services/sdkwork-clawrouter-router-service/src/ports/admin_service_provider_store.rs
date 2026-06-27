use std::future::Future;
use std::pin::Pin;

use serde::Serialize;
use serde_json::{Map, Value};

use crate::domain::DomainResult;

pub type AdminServiceProviderCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub type AdminServiceProviderJsonRecord = Map<String, Value>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminServiceProviderSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminServiceProviderRecordsQuery {
    pub subject: AdminServiceProviderSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub status: Option<String>,
    pub provider_id: Option<String>,
    pub seller_provider_id: Option<String>,
    pub buyer_provider_id: Option<String>,
    pub edge_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminServiceProviderCollection {
    pub items: Vec<AdminServiceProviderJsonRecord>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminServiceProviderDashboardItem {
    pub id: String,
    pub status: String,
    pub income_amount: String,
    pub expense_amount: String,
    pub margin_amount: String,
    pub request_count: i64,
    pub active_downstream_count: i64,
    pub risk_provider_count: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminServiceProviderPriceSimulationCommand {
    pub subject: AdminServiceProviderSubject,
    pub buyer_provider_id: String,
    pub catalog_key: Option<String>,
    pub model: Option<String>,
    pub billing_meter_code: String,
    pub token_kind: Option<String>,
    pub quantity: String,
    pub idempotency_key: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminServiceProviderPriceSimulationItem {
    pub id: String,
    pub buyer_provider_id: String,
    pub billing_meter_code: String,
    pub token_kind: Option<String>,
    pub quantity: String,
    pub charge_amount: Option<String>,
    pub matched_rule_id: Option<String>,
    pub currency: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminServiceProviderDownstreamCommand {
    pub subject: AdminServiceProviderSubject,
    pub seller_provider_id: String,
    pub provider_no: String,
    pub display_name: String,
    pub provider_type: Option<String>,
    pub default_currency: Option<String>,
    pub settlement_mode: Option<String>,
    pub price_plan_code: Option<String>,
    pub default_multiplier: Option<String>,
    pub idempotency_key: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminServiceProviderDownstreamMutationItem {
    pub id: String,
    pub provider_no: String,
    pub display_name: String,
    pub provider_type: Option<String>,
    pub status: String,
    pub seller_provider_id: String,
    pub edge_id: String,
    pub price_plan_id: Option<String>,
    pub default_currency: Option<String>,
    pub settlement_mode: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminServiceProviderPricingRuleCommand {
    pub subject: AdminServiceProviderSubject,
    pub seller_provider_id: String,
    pub buyer_provider_id: String,
    pub edge_id: Option<String>,
    pub price_plan_id: Option<String>,
    pub catalog_key: Option<String>,
    pub model: Option<String>,
    pub billing_meter_code: String,
    pub token_kind: Option<String>,
    pub unit_price: String,
    pub unit_size: String,
    pub minimum_charge: String,
    pub currency: Option<String>,
    pub priority: i32,
    pub idempotency_key: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminServiceProviderPricingRuleCommand {
    pub subject: AdminServiceProviderSubject,
    pub rule_id: String,
    pub unit_price: Option<String>,
    pub unit_size: Option<String>,
    pub minimum_charge: Option<String>,
    pub priority: Option<i32>,
    pub status: Option<String>,
    pub idempotency_key: String,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminServiceProviderPricingRuleMutationItem {
    pub id: String,
    pub seller_provider_id: String,
    pub buyer_provider_id: String,
    pub edge_id: String,
    pub price_plan_id: String,
    pub catalog_key: Option<String>,
    pub model: Option<String>,
    pub billing_meter_code: String,
    pub token_kind: Option<String>,
    pub unit_price: String,
    pub unit_size: String,
    pub minimum_charge: String,
    pub currency: Option<String>,
    pub priority: i32,
    pub status: String,
}

pub trait AdminServiceProviderStore {
    fn retrieve_dashboard<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderDashboardItem>;

    fn list_providers<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn list_relations<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn list_downstreams<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn create_downstream<'a>(
        &'a self,
        command: CreateAdminServiceProviderDownstreamCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderDownstreamMutationItem>;

    fn list_members<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn list_bindings<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn list_contracts<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn list_pricing_rules<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn create_pricing_rule<'a>(
        &'a self,
        command: CreateAdminServiceProviderPricingRuleCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderPricingRuleMutationItem>;

    fn update_pricing_rule<'a>(
        &'a self,
        command: UpdateAdminServiceProviderPricingRuleCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderPricingRuleMutationItem>;

    fn simulate_price<'a>(
        &'a self,
        command: AdminServiceProviderPriceSimulationCommand,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderPriceSimulationItem>;

    fn list_usage<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn list_wallet_accounts<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn list_statements<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn list_reconciliation_runs<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn list_adjustments<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn list_risk_events<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;

    fn list_audit_events<'a>(
        &'a self,
        query: ListAdminServiceProviderRecordsQuery,
    ) -> AdminServiceProviderCommandFuture<'a, AdminServiceProviderCollection>;
}
