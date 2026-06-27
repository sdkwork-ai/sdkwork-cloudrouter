use serde::{Deserialize, Serialize};

use crate::models::{AdminAiModelsResponse};

/// Models list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on models list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminAiModelsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
