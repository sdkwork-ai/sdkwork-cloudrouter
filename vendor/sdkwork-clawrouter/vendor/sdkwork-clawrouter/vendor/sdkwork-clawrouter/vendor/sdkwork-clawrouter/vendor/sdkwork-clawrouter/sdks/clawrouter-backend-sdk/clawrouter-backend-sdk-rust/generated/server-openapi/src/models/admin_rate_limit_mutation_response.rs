use serde::{Deserialize, Serialize};

use crate::models::{AdminRateLimitItem};

/// Admin rate limit mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminRateLimitMutationResponse {
    /// Item field on admin rate limit mutation response.
    pub item: AdminRateLimitItem,
}
