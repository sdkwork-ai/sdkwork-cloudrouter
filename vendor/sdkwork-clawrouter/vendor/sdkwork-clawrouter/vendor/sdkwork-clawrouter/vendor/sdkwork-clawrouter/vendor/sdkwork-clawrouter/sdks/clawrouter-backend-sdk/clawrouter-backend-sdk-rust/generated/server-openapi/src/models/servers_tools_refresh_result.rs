use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpDiscoveryResponse};

/// Servers tools refresh result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServersToolsRefreshResult {
    /// Business response code.
    pub code: String,

    /// Data field on servers tools refresh result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminMcpDiscoveryResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
