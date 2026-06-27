use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpServerListResponse};

/// Servers list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServersListResult {
    /// Business response code.
    pub code: String,

    /// Data field on servers list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminMcpServerListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
