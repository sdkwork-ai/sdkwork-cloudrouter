use serde::{Deserialize, Serialize};

/// Admin cache operation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminCacheOperationResponse {
    /// Cache key field on admin cache operation response.
    #[serde(rename = "cacheKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cache_key: Option<String>,

    /// Deleted entries field on admin cache operation response.
    #[serde(rename = "deletedEntries")]
    pub deleted_entries: String,

    /// Instance name field on admin cache operation response.
    #[serde(rename = "instanceName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instance_name: Option<String>,

    /// Namespace field on admin cache operation response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub namespace: Option<String>,

    /// Operation field on admin cache operation response.
    pub operation: String,

    /// Refreshed entries field on admin cache operation response.
    #[serde(rename = "refreshedEntries")]
    pub refreshed_entries: String,

    /// Status field on admin cache operation response.
    pub status: String,
}
