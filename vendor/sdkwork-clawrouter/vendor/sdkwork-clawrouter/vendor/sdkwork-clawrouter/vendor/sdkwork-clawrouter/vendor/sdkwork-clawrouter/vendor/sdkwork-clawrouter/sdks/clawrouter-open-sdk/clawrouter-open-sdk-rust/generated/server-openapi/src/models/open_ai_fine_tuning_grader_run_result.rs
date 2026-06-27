use serde::{Deserialize, Serialize};

/// OpenAI-compatible fine-tuning grader run result.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFineTuningGraderRunResult {
    /// Provider-specific grader details.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,

    /// Human-readable grader feedback when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub feedback: Option<String>,

    /// Whether the grader judged the sample as passing.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub passed: Option<bool>,

    /// Numeric grader score when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,
}
