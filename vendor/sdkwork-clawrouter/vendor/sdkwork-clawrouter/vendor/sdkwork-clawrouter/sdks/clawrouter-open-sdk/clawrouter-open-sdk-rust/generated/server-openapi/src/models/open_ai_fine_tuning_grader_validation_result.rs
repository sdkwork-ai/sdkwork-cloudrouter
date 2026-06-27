use serde::{Deserialize, Serialize};

/// OpenAI-compatible fine-tuning grader validation result.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFineTuningGraderValidationResult {
    /// Validation errors when the grader is invalid.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<String>>,

    /// Whether the grader definition is valid.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub valid: Option<bool>,

    /// Validation warnings when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub warnings: Option<Vec<String>>,
}
