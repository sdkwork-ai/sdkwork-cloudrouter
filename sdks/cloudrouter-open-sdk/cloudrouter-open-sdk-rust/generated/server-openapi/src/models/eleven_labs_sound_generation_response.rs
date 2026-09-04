use serde::{Deserialize, Serialize};

/// Eleven labs sound generation response schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsSoundGenerationResponse {
    /// Nested audio descriptor when the provider returns one.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio: Option<serde_json::Value>,

    /// URL of the generated sound effect audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,

    /// ElevenLabs task identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Task status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Alias for the generated audio URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
