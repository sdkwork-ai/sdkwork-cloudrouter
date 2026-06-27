use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpToolItem};

/// Admin mcp discovery response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpDiscoveryResponse {
    /// Checked at field on admin mcp discovery response.
    #[serde(rename = "checkedAt")]
    pub checked_at: String,

    /// Discovered count field on admin mcp discovery response.
    #[serde(rename = "discoveredCount")]
    pub discovered_count: String,

    /// Server id field on admin mcp discovery response.
    #[serde(rename = "serverId")]
    pub server_id: String,

    /// Tools field on admin mcp discovery response.
    pub tools: Vec<AdminMcpToolItem>,
}
