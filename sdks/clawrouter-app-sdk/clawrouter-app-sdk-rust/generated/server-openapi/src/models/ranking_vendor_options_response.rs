use serde::{Deserialize, Serialize};

use crate::models::{RankingVendorOption};

/// Ranking vendor options response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RankingVendorOptionsResponse {
    /// Items field on ranking vendor options response.
    pub items: Vec<RankingVendorOption>,
}
