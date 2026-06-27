use serde::{Deserialize, Serialize};

use crate::models::{AdminSiteItem};

/// Admin site mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminSiteMutationResponse {
    /// Item field on admin site mutation response.
    pub item: AdminSiteItem,
}
