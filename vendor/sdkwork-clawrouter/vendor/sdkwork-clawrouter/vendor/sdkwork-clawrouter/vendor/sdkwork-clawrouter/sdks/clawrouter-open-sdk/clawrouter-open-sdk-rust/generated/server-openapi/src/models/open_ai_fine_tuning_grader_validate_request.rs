use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to validate a fine-tuning grader definition.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFineTuningGraderValidateRequest {
    /// Grader configuration to validate.
    pub grader: String,
}
