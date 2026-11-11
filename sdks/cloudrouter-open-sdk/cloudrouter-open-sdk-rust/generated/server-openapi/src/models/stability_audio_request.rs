use serde::{Deserialize, Serialize};

/// Stability AI Stable Audio text-to-audio request, sent as multipart/form-data.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StabilityAudioRequest {
    /// Classifier-free guidance scale.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cfg_scale: Option<f64>,

    /// Output duration in seconds, 1 to 190.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,

    /// Audio model variant; selects music versus sound-effect quality tiers.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Requested output audio format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// What the output audio should be: instruments, mood, style, and genre.
    pub prompt: String,

    /// Seed for reproducible output; omit or 0 for a random seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Diffusion steps; higher favors quality over speed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub steps: Option<i64>,
}
