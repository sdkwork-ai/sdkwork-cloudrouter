use serde::{Deserialize, Serialize};

use crate::models::{AdminModelMappingDeleteResponse};

/// Model mappings delete result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelMappingsDeleteResult {
    /// Business response code.
    pub code: String,

    /// Data field on model mappings delete result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminModelMappingDeleteResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
