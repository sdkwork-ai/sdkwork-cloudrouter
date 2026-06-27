use serde::{Deserialize, Serialize};

use crate::models::{AdminCacheInstance, AdminCacheNamespacePolicy, AdminCacheSummary};

/// Admin cache overview response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminCacheOverviewResponse {
    /// Instances field on admin cache overview response.
    pub instances: Vec<AdminCacheInstance>,

    /// Namespace policies field on admin cache overview response.
    #[serde(rename = "namespacePolicies")]
    pub namespace_policies: Vec<AdminCacheNamespacePolicy>,

    /// Summary field on admin cache overview response.
    pub summary: AdminCacheSummary,
}
