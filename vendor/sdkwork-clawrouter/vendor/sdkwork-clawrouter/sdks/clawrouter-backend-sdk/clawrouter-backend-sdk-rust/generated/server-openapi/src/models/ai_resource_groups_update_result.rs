use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceGroupMutationResponse};

/// Ai resource groups update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AiResourceGroupsUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on ai resource groups update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminAiResourceGroupMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
