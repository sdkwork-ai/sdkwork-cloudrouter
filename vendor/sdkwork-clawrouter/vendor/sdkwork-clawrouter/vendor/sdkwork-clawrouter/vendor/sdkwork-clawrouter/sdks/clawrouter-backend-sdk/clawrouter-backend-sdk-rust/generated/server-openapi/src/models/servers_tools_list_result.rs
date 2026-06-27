use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpToolListResponse};

/// Servers tools list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServersToolsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on servers tools list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminMcpToolListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
