use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptRenderResponse};

/// Version renders create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct VersionRendersCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on version renders create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminPromptRenderResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
