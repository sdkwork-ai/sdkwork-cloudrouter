use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsSoundGenerationRequest {
    /// ElevenLabs-compatible model identifier.
    pub model_id: String,

    /// Text description of the sound effect to generate.
    pub text: String,

    /// Requested sound effect duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<f64>,

    /// How strongly the prompt influences the generated sound.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_influence: Option<f64>,

    /// Whether the sound effect should loop seamlessly.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#loop: Option<bool>,
}
