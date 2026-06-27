use serde::{Deserialize, Serialize};

use crate::models::{StorageBucketMutationResponse};

/// Oss buckets create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssBucketsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss buckets create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageBucketMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
