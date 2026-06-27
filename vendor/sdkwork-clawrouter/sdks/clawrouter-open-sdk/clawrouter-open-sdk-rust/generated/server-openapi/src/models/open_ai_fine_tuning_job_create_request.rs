use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a fine-tuning job.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFineTuningJobCreateRequest {
    /// Fine-tuning hyperparameters.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hyperparameters: Option<String>,

    /// Fine-tuning integrations.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub integrations: Option<Vec<String>>,

    /// Developer-defined fine-tuning metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Base model id to fine-tune.
    pub model: String,

    /// Best-effort deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Suffix added to the fine-tuned model name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub suffix: Option<String>,

    /// Training file identifier.
    pub training_file: String,

    /// Validation file identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub validation_file: Option<String>,
}
