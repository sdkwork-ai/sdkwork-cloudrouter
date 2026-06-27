use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create an eval.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiEvalCreateRequest {
    /// Data source used by the eval or eval run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data_source: Option<String>,

    /// Data source configuration used by the eval.
    pub data_source_config: String,

    /// Developer-defined eval metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable eval name.
    pub name: String,

    /// Testing criteria used by the eval.
    pub testing_criteria: Vec<String>,
}
