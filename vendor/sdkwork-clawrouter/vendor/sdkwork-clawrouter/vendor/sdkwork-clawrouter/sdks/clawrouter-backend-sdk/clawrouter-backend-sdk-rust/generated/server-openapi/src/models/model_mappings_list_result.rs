use serde::{Deserialize, Serialize};

use crate::models::{AdminModelMappingsResponse};

/// Model mappings list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelMappingsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on model mappings list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminModelMappingsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
