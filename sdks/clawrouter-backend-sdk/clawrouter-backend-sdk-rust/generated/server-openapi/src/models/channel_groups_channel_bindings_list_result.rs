use serde::{Deserialize, Serialize};

/// Channel groups channel bindings list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChannelGroupsChannelBindingsListResult {
    pub code: i64,

    pub data: serde_json::Value,

    /// Server-owned request correlation id.
    #[serde(rename = "traceId")]
    pub trace_id: String,
}
