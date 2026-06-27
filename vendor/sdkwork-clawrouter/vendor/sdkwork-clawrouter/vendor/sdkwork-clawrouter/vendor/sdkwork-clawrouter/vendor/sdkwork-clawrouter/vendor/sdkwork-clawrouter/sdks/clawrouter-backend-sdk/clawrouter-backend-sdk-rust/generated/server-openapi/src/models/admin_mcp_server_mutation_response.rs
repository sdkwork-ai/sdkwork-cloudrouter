use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpServerItem};

/// Admin mcp server mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpServerMutationResponse {
    /// Item field on admin mcp server mutation response.
    pub item: AdminMcpServerItem,
}
