use serde::{Deserialize, Serialize};

use crate::models::OpenAiEvalRunResultCounts;

/// OpenAI-compatible eval run object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiEvalRun {
    /// Unix timestamp in seconds when the eval run was created.
    pub created_at: i64,

    /// Data source used by this eval run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data_source: Option<String>,

    /// Eval identifier that owns this run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub eval_id: Option<String>,

    /// Eval run identifier.
    pub id: String,

    /// Developer-defined eval run metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable eval run name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Object type, normally eval.run.
    pub object: String,

    /// Eval run report URL when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub report_url: Option<String>,

    /// Result counts field on the open ai eval run, using the open ai eval run result counts module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result_counts: Option<OpenAiEvalRunResultCounts>,

    /// Eval run lifecycle status.
    pub status: String,
}
