use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpServerItem};

/// Admin mcp server list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpServerListResponse {
    /// Items field on admin mcp server list response.
    pub items: Vec<AdminMcpServerItem>,
}
