use serde::{Deserialize, Serialize};

use crate::models::{ServiceProviderPriceSimulationResponse};

/// Price simulation create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PriceSimulationCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on price simulation create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<ServiceProviderPriceSimulationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
