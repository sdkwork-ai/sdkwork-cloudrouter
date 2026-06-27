use serde::{Deserialize, Serialize};

use crate::models::{AdminRateLimitItem};

/// Admin model limits response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelLimitsResponse {
    /// Items field on admin model limits response.
    pub items: Vec<AdminRateLimitItem>,
}
