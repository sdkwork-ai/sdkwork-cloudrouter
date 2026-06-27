use serde::{Deserialize, Serialize};

use crate::models::{AdminServiceNodeItem};

/// Admin service node mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminServiceNodeMutationResponse {
    /// Item field on admin service node mutation response.
    pub item: AdminServiceNodeItem,
}
