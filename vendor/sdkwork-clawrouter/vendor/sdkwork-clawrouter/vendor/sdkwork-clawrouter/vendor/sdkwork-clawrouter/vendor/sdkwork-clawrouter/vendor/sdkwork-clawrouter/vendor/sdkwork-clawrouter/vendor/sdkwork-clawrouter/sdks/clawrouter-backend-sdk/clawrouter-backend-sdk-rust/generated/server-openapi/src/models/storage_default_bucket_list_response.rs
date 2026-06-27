use serde::{Deserialize, Serialize};

use crate::models::{StorageDefaultBucketConfig};

/// Storage default bucket list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageDefaultBucketListResponse {
    /// Items field on storage default bucket list response.
    pub items: Vec<StorageDefaultBucketConfig>,

    /// Request id field on storage default bucket list response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
