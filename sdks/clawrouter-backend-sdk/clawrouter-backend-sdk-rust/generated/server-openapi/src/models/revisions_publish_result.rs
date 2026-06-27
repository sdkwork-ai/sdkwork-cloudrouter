use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpServerRevisionMutationResponse};

/// Revisions publish result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RevisionsPublishResult {
    /// Business response code.
    pub code: String,

    /// Data field on revisions publish result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminMcpServerRevisionMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
