use serde::{Deserialize, Serialize};

/// Mureka song generation task and its produced audio.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MurekaMusicGenerationTask {
    /// Generated audio URL once the task succeeded.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,

    /// Generated duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Task error envelope with code and message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<std::collections::HashMap<String, String>>,

    /// Mureka task identifier when the provider echoes it under id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Task status: preparing, running, succeeded, or failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Mureka task identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,

    /// Generated song title.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}
