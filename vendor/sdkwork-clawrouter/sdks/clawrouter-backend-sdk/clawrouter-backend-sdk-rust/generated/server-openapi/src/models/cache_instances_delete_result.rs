use serde::{Deserialize, Serialize};

use crate::models::{AdminCacheOperationResponse};

/// Cache instances delete result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CacheInstancesDeleteResult {
    /// Business response code.
    pub code: String,

    /// Data field on cache instances delete result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminCacheOperationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
