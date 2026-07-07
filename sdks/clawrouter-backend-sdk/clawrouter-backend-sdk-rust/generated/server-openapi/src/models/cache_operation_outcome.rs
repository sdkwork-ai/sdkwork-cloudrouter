use serde::{Deserialize, Serialize};

/// Cache operation outcome schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CacheOperationOutcome {
    /// Cache key field on cache operation outcome.
    #[serde(rename = "cacheKey")]
    pub cache_key: String,

    /// Deleted entries field on cache operation outcome.
    #[serde(rename = "deletedEntries")]
    pub deleted_entries: String,

    /// Instance name field on cache operation outcome.
    #[serde(rename = "instanceName")]
    pub instance_name: String,

    /// Namespace field on cache operation outcome.
    pub namespace: String,

    /// Operation field on cache operation outcome.
    pub operation: String,

    /// Refreshed entries field on cache operation outcome.
    #[serde(rename = "refreshedEntries")]
    pub refreshed_entries: String,

    /// Status field on cache operation outcome.
    pub status: String,
}
