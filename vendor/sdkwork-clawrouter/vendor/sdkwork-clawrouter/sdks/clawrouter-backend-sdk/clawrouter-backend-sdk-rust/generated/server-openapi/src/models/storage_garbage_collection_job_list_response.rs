use serde::{Deserialize, Serialize};

use crate::models::{StorageGarbageCollectionJob};

/// Storage garbage collection job list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageGarbageCollectionJobListResponse {
    /// Items field on storage garbage collection job list response.
    pub items: Vec<StorageGarbageCollectionJob>,

    /// Next cursor field on storage garbage collection job list response.
    #[serde(rename = "nextCursor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,

    /// Request id field on storage garbage collection job list response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
