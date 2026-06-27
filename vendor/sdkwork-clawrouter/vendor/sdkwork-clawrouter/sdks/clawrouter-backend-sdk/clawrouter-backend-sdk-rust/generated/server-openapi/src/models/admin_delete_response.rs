use serde::{Deserialize, Serialize};

/// Admin delete response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminDeleteResponse {
    /// Deleted field on admin delete response.
    pub deleted: bool,
}
