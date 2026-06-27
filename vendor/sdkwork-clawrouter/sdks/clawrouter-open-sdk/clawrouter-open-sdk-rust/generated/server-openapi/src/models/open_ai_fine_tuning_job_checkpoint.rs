use serde::{Deserialize, Serialize};

/// OpenAI-compatible fine-tuning job checkpoint object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFineTuningJobCheckpoint {
    /// Unix timestamp in seconds when the checkpoint was created.
    pub created_at: i64,

    /// Fine-tuned model checkpoint id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fine_tuned_model_checkpoint: Option<String>,

    /// Fine-tuning job identifier that owns this checkpoint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fine_tuning_job_id: Option<String>,

    /// Fine-tuning checkpoint identifier.
    pub id: String,

    /// Checkpoint metrics returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metrics: Option<String>,

    /// Object type, normally fine_tuning.job.checkpoint.
    pub object: String,

    /// Training step number for this checkpoint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub step_number: Option<i64>,
}
