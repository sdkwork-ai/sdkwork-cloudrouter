use serde::{Deserialize, Serialize};

/// OpenAI-compatible eval object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiEval {
    /// Unix timestamp in seconds when the eval was created.
    pub created_at: i64,

    /// Data source configuration used by the eval.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data_source_config: Option<String>,

    /// Eval identifier.
    pub id: String,

    /// Developer-defined eval metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable eval name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Object type, normally eval.
    pub object: String,

    /// Testing criteria used by the eval.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub testing_criteria: Option<Vec<String>>,
}
