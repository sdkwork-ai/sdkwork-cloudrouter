use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceGroupDeleteResponse};

/// Ai resource groups delete result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AiResourceGroupsDeleteResult {
    /// Business response code.
    pub code: String,

    /// Data field on ai resource groups delete result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminAiResourceGroupDeleteResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
