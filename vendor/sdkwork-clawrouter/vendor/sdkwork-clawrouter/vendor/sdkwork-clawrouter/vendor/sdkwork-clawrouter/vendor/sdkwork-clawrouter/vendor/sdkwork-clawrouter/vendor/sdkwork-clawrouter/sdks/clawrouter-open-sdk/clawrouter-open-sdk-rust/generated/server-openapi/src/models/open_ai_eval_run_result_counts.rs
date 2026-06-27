use serde::{Deserialize, Serialize};

/// Counts of eval run output item results.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiEvalRunResultCounts {
    /// Number of errored output items.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub errored: Option<i64>,

    /// Number of failed output items.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failed: Option<i64>,

    /// Number of passed output items.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub passed: Option<i64>,

    /// Total number of output items.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total: Option<i64>,
}
