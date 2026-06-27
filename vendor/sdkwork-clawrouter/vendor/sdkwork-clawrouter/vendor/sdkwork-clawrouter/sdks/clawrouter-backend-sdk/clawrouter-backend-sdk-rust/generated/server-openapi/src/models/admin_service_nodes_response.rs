use serde::{Deserialize, Serialize};

use crate::models::{AdminServiceNodeItem};

/// Admin service nodes response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminServiceNodesResponse {
    /// Items field on admin service nodes response.
    pub items: Vec<AdminServiceNodeItem>,
}
