use serde::{Deserialize, Serialize};

use crate::models::{StorageDefaultBucketConfig};

/// Storage default bucket mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageDefaultBucketMutationResponse {
    /// Default bucket field on storage default bucket mutation response.
    #[serde(rename = "defaultBucket")]
    pub default_bucket: StorageDefaultBucketConfig,

    /// Request id field on storage default bucket mutation response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
