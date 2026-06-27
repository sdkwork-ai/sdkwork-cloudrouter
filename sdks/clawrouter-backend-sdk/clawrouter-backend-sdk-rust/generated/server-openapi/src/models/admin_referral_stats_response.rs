use serde::{Deserialize, Serialize};

use crate::models::{AdminReferralStatItem};

/// Admin referral stats response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminReferralStatsResponse {
    /// Items field on admin referral stats response.
    pub items: Vec<AdminReferralStatItem>,
}
