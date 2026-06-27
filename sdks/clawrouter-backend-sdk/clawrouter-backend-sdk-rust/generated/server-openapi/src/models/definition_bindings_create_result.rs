use serde::{Deserialize, Serialize};

use crate::models::{AdminPromptBindingMutationResponse};

/// Definition bindings create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DefinitionBindingsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on definition bindings create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminPromptBindingMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
