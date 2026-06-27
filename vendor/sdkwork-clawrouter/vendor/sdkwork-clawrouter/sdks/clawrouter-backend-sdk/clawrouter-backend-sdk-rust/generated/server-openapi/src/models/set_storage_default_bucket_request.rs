use serde::{Deserialize, Serialize};

/// Set storage default bucket request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SetStorageDefaultBucketRequest {
    /// Bucket id field on set storage default bucket request.
    #[serde(rename = "bucketId")]
    pub bucket_id: String,

    /// Reason field on set storage default bucket request.
    pub reason: String,
}
