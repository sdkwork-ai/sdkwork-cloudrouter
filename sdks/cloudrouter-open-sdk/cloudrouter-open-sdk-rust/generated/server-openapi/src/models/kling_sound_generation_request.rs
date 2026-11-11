use serde::{Deserialize, Serialize};

/// Kling text-to-sound-effect request.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingSoundGenerationRequest {
    /// Callback URL notified when the task changes state.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Generated duration in seconds, 3.0 to 10.0.
    pub duration: f64,

    /// Caller-supplied task id, unique per account.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub external_task_id: Option<String>,

    /// Description of the sound effect to generate.
    pub prompt: String,
}
