use serde::{Deserialize, Serialize};

/// Messaging route simulation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MessagingRouteSimulationResponse {
    /// Matched field on messaging route simulation response.
    pub matched: bool,

    /// Route rule id field on messaging route simulation response.
    #[serde(rename = "routeRuleId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub route_rule_id: Option<String>,

    /// Targets field on messaging route simulation response.
    pub targets: Vec<std::collections::HashMap<String, String>>,
}
