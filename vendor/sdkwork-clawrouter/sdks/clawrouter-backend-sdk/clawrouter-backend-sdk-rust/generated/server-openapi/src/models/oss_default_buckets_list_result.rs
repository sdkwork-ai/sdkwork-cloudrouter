use serde::{Deserialize, Serialize};

use crate::models::{StorageDefaultBucketListResponse};

/// Oss default buckets list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssDefaultBucketsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss default buckets list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageDefaultBucketListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
