use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpServerRevisionListResponse};

/// Servers revisions list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServersRevisionsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on servers revisions list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminMcpServerRevisionListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
