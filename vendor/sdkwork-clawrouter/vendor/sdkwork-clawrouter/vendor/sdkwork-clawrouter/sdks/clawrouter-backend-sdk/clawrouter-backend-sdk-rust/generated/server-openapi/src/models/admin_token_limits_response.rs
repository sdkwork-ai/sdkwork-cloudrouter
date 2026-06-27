use serde::{Deserialize, Serialize};

use crate::models::{AdminRateLimitItem};

/// Admin token limits response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminTokenLimitsResponse {
    /// Items field on admin token limits response.
    pub items: Vec<AdminRateLimitItem>,
}
