use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create an eval run.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiEvalRunCreateRequest {
    /// Data source used by this eval run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data_source: Option<String>,

    /// Developer-defined eval run metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable eval run name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
