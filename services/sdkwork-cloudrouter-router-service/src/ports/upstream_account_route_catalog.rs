use std::sync::Arc;

use crate::domain::UpstreamAccountRoute;

use super::PricingCatalog;

/// One vendor + model list entry of an account group's model access rule:
/// `vendor_code` is the model vendor, `models` are the model names (an empty
/// list means every model of the vendor).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct VendorModelListEntry {
    pub vendor_code: String,
    pub models: Vec<String>,
}

/// Group-level model access control loaded from `ai_upstream_account_group`
/// `model_blacklist` / `model_whitelist`. The blacklist forbids the whole
/// group from serving matching models; the whitelist (when non-empty)
/// restricts the group to matching models only. The blacklist wins over the
/// whitelist.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountGroupModelAccess {
    pub group_id: i64,
    pub blacklist: Vec<VendorModelListEntry>,
    pub whitelist: Vec<VendorModelListEntry>,
}

pub trait UpstreamAccountRouteCatalog: PricingCatalog {
    fn shared_upstream_account_routes(&self) -> Arc<[UpstreamAccountRoute]>;

    /// Returns the model blacklist/whitelist configured for the account group,
    /// or `None` when the group has no model access restriction configured.
    fn account_group_model_access(&self, group_id: i64) -> Option<AccountGroupModelAccess> {
        let _ = group_id;
        None
    }
}
