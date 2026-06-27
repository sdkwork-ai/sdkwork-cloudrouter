use serde::{Deserialize, Serialize};

use crate::models::{AdminServiceNodeMutationResponse};

/// Service nodes create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceNodesCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on service nodes create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminServiceNodeMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
