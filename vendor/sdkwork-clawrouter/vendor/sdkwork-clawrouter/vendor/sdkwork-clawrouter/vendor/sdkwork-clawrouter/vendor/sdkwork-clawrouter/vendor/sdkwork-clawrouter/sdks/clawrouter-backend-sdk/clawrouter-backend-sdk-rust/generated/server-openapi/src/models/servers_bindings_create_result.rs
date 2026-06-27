use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpBindingMutationResponse};

/// Servers bindings create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServersBindingsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on servers bindings create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminMcpBindingMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
