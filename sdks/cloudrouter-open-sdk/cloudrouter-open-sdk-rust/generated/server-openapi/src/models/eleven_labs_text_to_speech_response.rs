use serde::{Deserialize, Serialize};

/// Eleven labs text to speech response schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsTextToSpeechResponse {
    /// URL of the synthesized speech audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,

    /// ElevenLabs task identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Task status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Alias for the synthesized audio URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
