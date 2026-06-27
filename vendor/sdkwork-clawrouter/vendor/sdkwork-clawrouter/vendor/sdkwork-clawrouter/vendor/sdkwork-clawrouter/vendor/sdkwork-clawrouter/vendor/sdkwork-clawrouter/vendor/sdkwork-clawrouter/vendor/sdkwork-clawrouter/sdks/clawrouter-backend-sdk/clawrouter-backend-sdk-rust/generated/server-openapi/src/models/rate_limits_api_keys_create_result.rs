use serde::{Deserialize, Serialize};

use crate::models::{AdminRateLimitMutationResponse};

/// Rate limits api keys create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RateLimitsApiKeysCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on rate limits api keys create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminRateLimitMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
