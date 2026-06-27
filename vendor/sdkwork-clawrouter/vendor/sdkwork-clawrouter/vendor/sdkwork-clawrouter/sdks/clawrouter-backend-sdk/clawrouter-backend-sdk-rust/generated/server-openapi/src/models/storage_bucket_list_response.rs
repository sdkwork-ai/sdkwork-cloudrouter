use serde::{Deserialize, Serialize};

use crate::models::{StorageBucketConfig};

/// Storage bucket list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageBucketListResponse {
    /// Items field on storage bucket list response.
    pub items: Vec<StorageBucketConfig>,

    /// Next cursor field on storage bucket list response.
    #[serde(rename = "nextCursor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,

    /// Request id field on storage bucket list response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
