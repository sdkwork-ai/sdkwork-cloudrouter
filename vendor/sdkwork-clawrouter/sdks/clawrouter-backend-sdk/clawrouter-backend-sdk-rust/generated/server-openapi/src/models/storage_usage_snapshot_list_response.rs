use serde::{Deserialize, Serialize};

use crate::models::{StorageUsageSnapshot};

/// Storage usage snapshot list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageUsageSnapshotListResponse {
    /// Items field on storage usage snapshot list response.
    pub items: Vec<StorageUsageSnapshot>,

    /// Next cursor field on storage usage snapshot list response.
    #[serde(rename = "nextCursor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,

    /// Request id field on storage usage snapshot list response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
