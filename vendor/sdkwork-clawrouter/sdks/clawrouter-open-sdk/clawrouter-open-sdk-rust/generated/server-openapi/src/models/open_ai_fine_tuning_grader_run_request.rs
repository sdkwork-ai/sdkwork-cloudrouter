use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to run a fine-tuning grader against sample input.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFineTuningGraderRunRequest {
    /// Grader configuration to run.
    pub grader: String,

    /// Sample input used by the grader run.
    pub input: String,

    /// Model sample output to grade when provided.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_sample: Option<String>,

    /// Reference answer used by the grader when provided.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference_answer: Option<String>,
}
