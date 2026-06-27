use serde::{Deserialize, Serialize};

/// OpenAI-compatible eval run output item.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiEvalRunOutputItem {
    /// Unix timestamp in seconds when the output item was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Eval identifier associated with the output item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub eval_id: Option<String>,

    /// Eval run output item identifier.
    pub id: String,

    /// Developer-defined output item metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Object type, normally eval.run.output_item.
    pub object: String,

    /// Testing criteria results for this output item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub results: Option<Vec<String>>,

    /// Eval run identifier associated with the output item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub run_id: Option<String>,

    /// Input sample evaluated by this output item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sample: Option<String>,

    /// Output item status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
