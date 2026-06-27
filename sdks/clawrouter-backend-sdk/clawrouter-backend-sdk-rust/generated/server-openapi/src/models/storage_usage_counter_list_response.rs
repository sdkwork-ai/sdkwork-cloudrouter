use serde::{Deserialize, Serialize};

use crate::models::{StorageUsageCounter};

/// Storage usage counter list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageUsageCounterListResponse {
    /// Items field on storage usage counter list response.
    pub items: Vec<StorageUsageCounter>,

    /// Next cursor field on storage usage counter list response.
    #[serde(rename = "nextCursor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,

    /// Request id field on storage usage counter list response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
