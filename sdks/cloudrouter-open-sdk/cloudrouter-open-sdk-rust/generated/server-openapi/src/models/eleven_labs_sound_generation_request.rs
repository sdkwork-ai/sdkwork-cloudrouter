use serde::{Deserialize, Serialize};

/// ElevenLabs sound-effect generation request (`POST /v1/sound-generation`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsSoundGenerationRequest {
    /// Requested duration in seconds; the model guesses when omitted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<f64>,

    /// Whether the sound effect should loop seamlessly.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#loop: Option<bool>,

    /// Sound-effect model id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_id: Option<String>,

    /// How strongly the prompt influences the generated sound.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_influence: Option<f64>,

    /// Text description of the sound effect to generate.
    pub text: String,
}
