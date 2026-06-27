use serde::{Deserialize, Serialize};

use crate::models::{GatewayTrace};

/// Gateway traces response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GatewayTracesResponse {
    /// Items field on gateway traces response.
    pub items: Vec<GatewayTrace>,
}
