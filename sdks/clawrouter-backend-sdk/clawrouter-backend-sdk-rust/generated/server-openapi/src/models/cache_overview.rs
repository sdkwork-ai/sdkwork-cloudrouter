use serde::{Deserialize, Serialize};

/// Cache overview schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CacheOverview {
    /// Instances field on cache overview.
    pub instances: Vec<serde_json::Value>,

    /// Namespace policies field on cache overview.
    #[serde(rename = "namespacePolicies")]
    pub namespace_policies: Vec<serde_json::Value>,

    /// Summary field on cache overview.
    pub summary: serde_json::Value,
}
