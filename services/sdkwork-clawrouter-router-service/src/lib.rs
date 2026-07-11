pub mod api;
pub mod application;
pub mod domain;
pub mod identity;
pub mod infrastructure;
pub mod ports;

pub use identity::product_name;

/// Hidden helper for integration tests that must mirror catalog import accepted_count semantics.
#[doc(hidden)]
pub struct CatalogScopeCountSnapshot {
    pub meter_count: i64,
    pub vendor_count: i64,
    pub family_count: i64,
    pub model_count: i64,
    pub capability_count: i64,
    pub price_count: i64,
    pub ranking_count: i64,
}

#[doc(hidden)]
pub fn catalog_scope_count_snapshot(
    catalog: &sdkwork_models::ModelCatalog,
) -> CatalogScopeCountSnapshot {
    let counts = infrastructure::sql::model_catalog_import::catalog_scope_counts(catalog);
    CatalogScopeCountSnapshot {
        meter_count: counts.meter_count as i64,
        vendor_count: counts.vendor_count as i64,
        family_count: counts.family_count as i64,
        model_count: counts.model_count as i64,
        capability_count: counts.capability_count as i64,
        price_count: counts.price_count as i64,
        ranking_count: counts.ranking_count as i64,
    }
}

#[doc(hidden)]
pub fn catalog_accepted_count(catalog: &sdkwork_models::ModelCatalog) -> i64 {
    infrastructure::sql::model_catalog_import::catalog_scope_counts(catalog).accepted_count()
}

#[doc(hidden)]
pub use infrastructure::sql::commerce_bootstrap::{
    commerce_database_tables, commerce_recharge_package_seeds, CommerceRechargePackageSeed,
};
