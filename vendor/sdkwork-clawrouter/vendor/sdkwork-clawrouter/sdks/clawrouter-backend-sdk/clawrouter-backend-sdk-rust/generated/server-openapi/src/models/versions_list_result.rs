use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptVersionListResponse};

/// Versions list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct VersionsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on versions list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminPromptVersionListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
