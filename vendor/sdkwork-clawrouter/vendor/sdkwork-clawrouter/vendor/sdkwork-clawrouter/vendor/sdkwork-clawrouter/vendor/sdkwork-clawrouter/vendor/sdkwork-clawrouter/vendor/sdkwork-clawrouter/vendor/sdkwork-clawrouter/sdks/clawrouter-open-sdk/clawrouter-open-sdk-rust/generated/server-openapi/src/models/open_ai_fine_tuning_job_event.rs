use serde::{Deserialize, Serialize};

/// OpenAI-compatible fine-tuning job event object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFineTuningJobEvent {
    /// Unix timestamp in seconds when the event was created.
    pub created_at: i64,

    /// Provider-specific event data.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<String>,

    /// Fine-tuning job event identifier.
    pub id: String,

    /// Event severity level.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub level: Option<String>,

    /// Event message.
    pub message: String,

    /// Object type, normally fine_tuning.job.event.
    pub object: String,

    /// Event type when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
}
