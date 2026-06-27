use serde::{Deserialize, Serialize};

use crate::models::{AdminServiceNodeMutationResponse};

/// Service nodes update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceNodesUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on service nodes update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminServiceNodeMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
