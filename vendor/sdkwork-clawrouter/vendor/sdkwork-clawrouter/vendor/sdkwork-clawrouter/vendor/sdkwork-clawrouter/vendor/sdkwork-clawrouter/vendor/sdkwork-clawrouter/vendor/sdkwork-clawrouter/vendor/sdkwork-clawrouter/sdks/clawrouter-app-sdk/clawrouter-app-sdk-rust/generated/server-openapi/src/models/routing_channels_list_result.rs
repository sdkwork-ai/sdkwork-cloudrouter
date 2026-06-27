use serde::{Deserialize, Serialize};

use crate::models::{RoutingChannelsResponse};

/// Routing channels list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingChannelsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on routing channels list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<RoutingChannelsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
