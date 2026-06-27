use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceMutationResponse};

/// Ai resources update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AiResourcesUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on ai resources update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminAiResourceMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
