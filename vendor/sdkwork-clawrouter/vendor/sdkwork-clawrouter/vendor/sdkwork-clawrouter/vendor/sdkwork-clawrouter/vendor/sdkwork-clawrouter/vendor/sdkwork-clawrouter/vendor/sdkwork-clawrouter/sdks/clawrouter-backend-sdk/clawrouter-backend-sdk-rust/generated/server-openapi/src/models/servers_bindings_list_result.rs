use serde::{Deserialize, Serialize};

use crate::models::{AdminMcpBindingListResponse};

/// Servers bindings list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServersBindingsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on servers bindings list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminMcpBindingListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
