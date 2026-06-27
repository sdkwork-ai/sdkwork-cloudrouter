use serde::{Deserialize, Serialize};

use crate::models::{AdminModelMappingMutationResponse};

/// Model mappings update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelMappingsUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on model mappings update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminModelMappingMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
