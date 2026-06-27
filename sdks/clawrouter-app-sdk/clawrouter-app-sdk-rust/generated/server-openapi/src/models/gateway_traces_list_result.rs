use serde::{Deserialize, Serialize};

use crate::models::{GatewayTracesResponse};

/// Gateway traces list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GatewayTracesListResult {
    /// Business response code.
    pub code: String,

    /// Data field on gateway traces list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<GatewayTracesResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
