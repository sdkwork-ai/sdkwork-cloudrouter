use serde::{Deserialize, Serialize};

use crate::models::{MessagingCollectionResponse};

/// Rate limit buckets list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RateLimitBucketsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on rate limit buckets list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<MessagingCollectionResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
