use serde::{Deserialize, Serialize};

use crate::models::{RoutingUsageSnapshot};

/// Routing usage list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingUsageListResult {
    /// Business response code.
    pub code: String,

    /// Data field on routing usage list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<RoutingUsageSnapshot>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
