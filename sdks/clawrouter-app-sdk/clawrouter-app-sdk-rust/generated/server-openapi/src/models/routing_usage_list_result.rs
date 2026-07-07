use serde::{Deserialize, Serialize};

/// Routing usage list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingUsageListResult {
    pub code: i64,

    pub data: serde_json::Value,

    /// Server-owned request correlation id.
    #[serde(rename = "traceId")]
    pub trace_id: String,
}
