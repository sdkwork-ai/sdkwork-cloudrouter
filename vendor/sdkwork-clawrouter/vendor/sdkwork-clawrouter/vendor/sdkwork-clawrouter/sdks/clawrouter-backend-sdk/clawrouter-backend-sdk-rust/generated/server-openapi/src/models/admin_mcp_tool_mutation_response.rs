use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpToolItem};

/// Admin mcp tool mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpToolMutationResponse {
    /// Item field on admin mcp tool mutation response.
    pub item: AdminMcpToolItem,
}
