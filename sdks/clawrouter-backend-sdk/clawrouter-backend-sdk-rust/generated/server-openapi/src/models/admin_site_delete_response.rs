use serde::{Deserialize, Serialize};

/// Admin site delete response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminSiteDeleteResponse {
    /// Deleted field on admin site delete response.
    pub deleted: bool,
}
