use serde::{Deserialize, Serialize};

use crate::models::{RoutingRequestTracesResponse};

/// Routing request traces list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingRequestTracesListResult {
    /// Business response code.
    pub code: String,

    /// Data field on routing request traces list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<RoutingRequestTracesResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
