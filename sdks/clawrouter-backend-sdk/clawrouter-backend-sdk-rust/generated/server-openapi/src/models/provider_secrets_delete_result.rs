use serde::{Deserialize, Serialize};

/// Provider secrets delete result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderSecretsDeleteResult {
    pub code: i64,

    pub data: serde_json::Value,

    /// Server-owned request correlation id.
    #[serde(rename = "traceId")]
    pub trace_id: String,
}
