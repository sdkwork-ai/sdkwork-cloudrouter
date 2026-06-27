use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptBindingListResponse};

/// Definition bindings list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DefinitionBindingsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on definition bindings list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminPromptBindingListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
