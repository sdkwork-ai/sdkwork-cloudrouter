use serde::{Deserialize, Serialize};

use crate::models::{StorageDefaultBucketMutationResponse};

/// Oss default buckets update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssDefaultBucketsUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss default buckets update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageDefaultBucketMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
