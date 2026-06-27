use serde::{Deserialize, Serialize};

use crate::models::{AdminServiceNodeDeleteResponse};

/// Service nodes delete result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceNodesDeleteResult {
    /// Business response code.
    pub code: String,

    /// Data field on service nodes delete result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminServiceNodeDeleteResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
