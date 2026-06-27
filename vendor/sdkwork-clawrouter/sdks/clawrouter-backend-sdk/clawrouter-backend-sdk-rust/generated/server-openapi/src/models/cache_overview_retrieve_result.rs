use serde::{Deserialize, Serialize};

use crate::models::{AdminCacheOverviewResponse};

/// Cache overview retrieve result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CacheOverviewRetrieveResult {
    /// Business response code.
    pub code: String,

    /// Data field on cache overview retrieve result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminCacheOverviewResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
