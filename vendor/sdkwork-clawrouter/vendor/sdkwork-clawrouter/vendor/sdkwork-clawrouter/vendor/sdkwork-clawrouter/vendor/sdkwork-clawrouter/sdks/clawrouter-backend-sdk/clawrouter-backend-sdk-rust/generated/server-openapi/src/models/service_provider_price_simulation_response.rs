use serde::{Deserialize, Serialize};

/// Service provider price simulation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceProviderPriceSimulationResponse {
    /// Item field on service provider price simulation response.
    pub item: serde_json::Value,
}
