use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptVersionMutationResponse};

/// Versions create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct VersionsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on versions create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminPromptVersionMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
