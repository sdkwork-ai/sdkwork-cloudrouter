use serde::{Deserialize, Serialize};

use crate::models::{AdminAiModelMutationResponse};

/// Models create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on models create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminAiModelMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
