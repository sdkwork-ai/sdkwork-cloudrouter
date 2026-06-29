//! Compatibility composer for T1 commerce capability database bootstrap.
//!
//! Legacy symbols previously lived in deleted `sdkwork-commerce` bootstrap crates.
//! Invoice schema authority now lives in `sdkwork-invoice-database-bootstrap`; other
//! commerce domains will follow the same per-capability bootstrap pattern.

use std::collections::BTreeMap;

use sdkwork_invoice_database_bootstrap::{
    invoice_foundation_migration_sql, invoice_foundation_migration_sqlite,
    invoice_module_table_names,
};

#[derive(Debug, Clone)]
pub struct CommerceExperienceSeedManifest {
    pub payload_json: String,
}

#[derive(Debug, Clone)]
pub struct CommerceRechargePackageSeed {
    pub status: &'static str,
    pub currency_code: &'static str,
    pub price_amount: &'static str,
    pub bonus_points: i64,
    pub sort_weight: i32,
    pub external_id: &'static str,
    pub package_no: &'static str,
    pub name: &'static str,
}

#[derive(Debug, Clone)]
pub struct CommerceRechargeSettingsSeed {
    pub rule_no: &'static str,
    pub base_currency_code: &'static str,
    pub currency_to_cny_rates: BTreeMap<&'static str, &'static str>,
    pub source_asset_type: &'static str,
    pub target_asset_type: &'static str,
    pub rate: &'static str,
}

pub fn commerce_experience_seed_manifest() -> CommerceExperienceSeedManifest {
    CommerceExperienceSeedManifest {
        payload_json: "{}".to_owned(),
    }
}

pub fn commerce_recharge_package_seeds() -> Vec<CommerceRechargePackageSeed> {
    Vec::new()
}

pub fn commerce_recharge_settings_seeds() -> Vec<CommerceRechargeSettingsSeed> {
    Vec::new()
}

pub fn commerce_database_tables() -> Vec<&'static str> {
    invoice_module_table_names()
}

pub fn commerce_database_indexes() -> Vec<&'static str> {
    vec![
        "idx_commerce_invoice_title_owner",
        "idx_commerce_invoice_owner",
        "idx_commerce_invoice_tenant_order",
        "idx_commerce_invoice_item_invoice",
    ]
}

pub fn commerce_initial_migration_sql() -> &'static str {
    invoice_foundation_migration_sql()
}

pub fn commerce_initial_migration_sqlite() -> &'static str {
    invoice_foundation_migration_sqlite()
}

pub fn commerce_payment_channel_seeds() -> Vec<()> {
    Vec::new()
}

pub fn commerce_payment_method_seeds() -> Vec<()> {
    Vec::new()
}

pub fn commerce_payment_provider_account_seeds() -> Vec<()> {
    Vec::new()
}

pub fn commerce_payment_provider_seeds() -> Vec<()> {
    Vec::new()
}

pub fn commerce_payment_route_rule_seeds() -> Vec<()> {
    Vec::new()
}

pub fn membership_package_group_seeds() -> Vec<()> {
    Vec::new()
}

pub fn membership_plan_seeds() -> Vec<()> {
    Vec::new()
}
