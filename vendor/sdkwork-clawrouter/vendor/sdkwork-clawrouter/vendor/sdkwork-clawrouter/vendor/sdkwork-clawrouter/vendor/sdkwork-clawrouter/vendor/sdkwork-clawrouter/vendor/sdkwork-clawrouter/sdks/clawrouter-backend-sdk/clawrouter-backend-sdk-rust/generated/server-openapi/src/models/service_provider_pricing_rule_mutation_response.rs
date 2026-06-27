use serde::{Deserialize, Serialize};

/// Service provider pricing rule mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceProviderPricingRuleMutationResponse {
    /// Item field on service provider pricing rule mutation response.
    pub item: serde_json::Value,
}
