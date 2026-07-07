use serde::{Deserialize, Serialize};

/// Provider secrets update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderSecretsUpdateResult {
    pub code: i64,

    pub data: serde_json::Value,

    /// Server-owned request correlation id.
    #[serde(rename = "traceId")]
    pub trace_id: String,
}
