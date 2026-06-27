use serde::{Deserialize, Serialize};

use crate::models::{AdminModelMappingResolveResponse};

/// Model mappings resolve create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelMappingsResolveCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on model mappings resolve create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminModelMappingResolveResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
