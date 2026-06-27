use serde::{Deserialize, Serialize};

use crate::models::{RoutingApiKeysResponse};

/// Routing api keys list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingApiKeysListResult {
    /// Business response code.
    pub code: String,

    /// Data field on routing api keys list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<RoutingApiKeysResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
