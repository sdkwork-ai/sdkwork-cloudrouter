use serde::{Deserialize, Serialize};

use crate::models::{AdminServiceNodesResponse};

/// Service nodes list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceNodesListResult {
    /// Business response code.
    pub code: String,

    /// Data field on service nodes list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminServiceNodesResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
