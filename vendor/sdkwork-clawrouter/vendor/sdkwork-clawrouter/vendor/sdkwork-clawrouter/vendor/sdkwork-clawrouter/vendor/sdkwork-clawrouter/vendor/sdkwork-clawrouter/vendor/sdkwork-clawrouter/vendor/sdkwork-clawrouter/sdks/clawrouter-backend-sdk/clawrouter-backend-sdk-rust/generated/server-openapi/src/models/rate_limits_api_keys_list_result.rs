use serde::{Deserialize, Serialize};

use crate::models::{AdminTokenLimitsResponse};

/// Rate limits api keys list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RateLimitsApiKeysListResult {
    /// Business response code.
    pub code: String,

    /// Data field on rate limits api keys list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminTokenLimitsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
