use serde::{Deserialize, Serialize};

use crate::models::{StorageBucketConfig};

/// Storage bucket mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageBucketMutationResponse {
    /// Bucket field on storage bucket mutation response.
    pub bucket: StorageBucketConfig,

    /// Request id field on storage bucket mutation response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
