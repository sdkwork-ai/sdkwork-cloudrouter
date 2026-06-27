use serde::{Deserialize, Serialize};

/// Service provider downstream mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceProviderDownstreamMutationResponse {
    /// Item field on service provider downstream mutation response.
    pub item: serde_json::Value,
}
