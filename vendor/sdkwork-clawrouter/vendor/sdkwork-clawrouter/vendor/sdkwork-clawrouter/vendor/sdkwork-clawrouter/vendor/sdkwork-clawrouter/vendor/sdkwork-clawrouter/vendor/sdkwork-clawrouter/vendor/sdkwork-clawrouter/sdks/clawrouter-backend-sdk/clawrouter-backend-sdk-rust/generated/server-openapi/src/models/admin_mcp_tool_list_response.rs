use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpToolItem};

/// Admin mcp tool list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpToolListResponse {
    /// Items field on admin mcp tool list response.
    pub items: Vec<AdminMcpToolItem>,
}
