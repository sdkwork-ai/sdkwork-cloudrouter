use serde::{Deserialize, Serialize};

/// Admin service node delete response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminServiceNodeDeleteResponse {
    /// Deleted field on admin service node delete response.
    pub deleted: bool,
}
