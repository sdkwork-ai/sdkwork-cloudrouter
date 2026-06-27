use serde::{Deserialize, Serialize};

/// Service provider dashboard response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ServiceProviderDashboardResponse {
    /// Item field on service provider dashboard response.
    pub item: serde_json::Value,
}
