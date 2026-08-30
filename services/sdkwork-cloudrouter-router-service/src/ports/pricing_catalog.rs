pub use sdkwork_models_catalog_service::ports::PricingCatalog;

/// Supplies the configured default billing region for a model (`catalog_key`)
/// within a tenant/organization scope. The billing engine falls back to this
/// region when an account carries no explicit region, so multi-region models
/// still rate against the correct regional price instead of the generic
/// `global` bucket. Catalogs without persisted default-region metadata return
/// `None`, preserving legacy resolution behavior.
pub trait PricingDefaultRegionProvider {
    /// Returns the default billing region for `catalog_key` in scope, if any.
    fn default_billing_region(
        &self,
        tenant_id: i64,
        organization_id: i64,
        catalog_key: &str,
    ) -> Option<String>;
}
