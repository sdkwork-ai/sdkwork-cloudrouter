use serde::{Deserialize, Serialize};

/// Eleven labs text to speech request schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsTextToSpeechRequest {
    /// ElevenLabs-compatible model identifier.
    pub model_id: String,

    /// Text to synthesize into speech.
    pub text: String,

    /// Voice settings such as speed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice_settings: Option<serde_json::Value>,
}
