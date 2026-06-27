use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpToolMutationResponse};

/// Tools update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ToolsUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on tools update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminMcpToolMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
