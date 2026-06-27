use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpServerMutationResponse};

/// Servers create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServersCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on servers create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminMcpServerMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
