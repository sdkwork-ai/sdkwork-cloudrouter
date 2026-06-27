use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptListResponse};

/// Definitions list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DefinitionsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on definitions list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminPromptListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
