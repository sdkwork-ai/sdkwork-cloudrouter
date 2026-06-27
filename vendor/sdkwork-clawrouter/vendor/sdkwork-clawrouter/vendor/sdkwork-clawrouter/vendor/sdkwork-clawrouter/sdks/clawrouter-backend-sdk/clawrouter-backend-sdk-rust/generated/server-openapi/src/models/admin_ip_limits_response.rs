use serde::{Deserialize, Serialize};

use crate::models::{AdminRateLimitItem};

/// Admin ip limits response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminIpLimitsResponse {
    /// Items field on admin ip limits response.
    pub items: Vec<AdminRateLimitItem>,
}
