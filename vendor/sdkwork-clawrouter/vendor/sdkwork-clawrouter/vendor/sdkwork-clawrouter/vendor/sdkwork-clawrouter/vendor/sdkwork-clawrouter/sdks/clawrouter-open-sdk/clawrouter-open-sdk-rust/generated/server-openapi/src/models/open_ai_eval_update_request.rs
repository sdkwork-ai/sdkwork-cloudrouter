use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update an eval.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiEvalUpdateRequest {
    /// Data source used by the eval or eval run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data_source: Option<String>,

    /// Data source configuration used by the eval.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data_source_config: Option<String>,

    /// Developer-defined eval metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable eval name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Testing criteria used by the eval.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub testing_criteria: Option<Vec<String>>,
}
