use serde::{Deserialize, Serialize};

use crate::models::{AdminSiteItem};

/// Admin sites response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminSitesResponse {
    /// Items field on admin sites response.
    pub items: Vec<AdminSiteItem>,
}
