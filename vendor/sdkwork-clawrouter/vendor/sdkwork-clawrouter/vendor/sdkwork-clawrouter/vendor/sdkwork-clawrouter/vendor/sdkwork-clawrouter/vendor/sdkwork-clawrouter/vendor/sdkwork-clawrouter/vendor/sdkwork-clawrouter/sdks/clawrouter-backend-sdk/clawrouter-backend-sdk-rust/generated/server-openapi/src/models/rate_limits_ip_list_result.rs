use serde::{Deserialize, Serialize};

use crate::models::{AdminIpLimitsResponse};

/// Rate limits ip list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RateLimitsIpListResult {
    /// Business response code.
    pub code: String,

    /// Data field on rate limits ip list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminIpLimitsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
