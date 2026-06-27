use serde::{Deserialize, Serialize};

/// OpenAI-compatible fine-tuning job object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFineTuningJob {
    /// Unix timestamp in seconds when the job was created.
    pub created_at: i64,

    /// Fine-tuning error object when the job fails.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,

    /// Fine-tuned model id when available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fine_tuned_model: Option<String>,

    /// Unix timestamp in seconds when the job finished.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finished_at: Option<i64>,

    /// Fine-tuning hyperparameters.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hyperparameters: Option<String>,

    /// Fine-tuning job identifier.
    pub id: String,

    /// Developer-defined fine-tuning metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Base model id.
    pub model: String,

    /// Object type, normally fine_tuning.job.
    pub object: String,

    /// Organization identifier that owns the job.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub organization_id: Option<String>,

    /// Result file identifiers returned by the job.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result_files: Option<Vec<String>>,

    /// Fine-tuning job status.
    pub status: String,

    /// Number of trained tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trained_tokens: Option<i64>,

    /// Training file identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub training_file: Option<String>,

    /// Validation file identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub validation_file: Option<String>,
}
