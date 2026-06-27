use serde::{Deserialize, Serialize};

/// Admin model mapping delete response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingDeleteResponse {
    /// Deleted field on admin model mapping delete response.
    pub deleted: bool,
}
