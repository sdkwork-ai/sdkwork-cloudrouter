use serde::{Deserialize, Serialize};

/// Stability AI Stable Image generation request (union of the `core`, `ultra`, and `sd3` multipart variants).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StabilityImageGenerationRequest {
    /// Requested aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Classifier-free guidance scale for SD3.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cfg_scale: Option<f64>,

    /// Optional source image for image-to-image modes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// SD3 generation mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,

    /// SD3.5 model variant; the path mode selects the endpoint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Content the model should avoid.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub negative_prompt: Option<String>,

    /// Requested output format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Text prompt describing the requested image.
    pub prompt: String,

    /// Optional deterministic seed; 0 randomizes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Image-to-image transformation strength between 0 and 1.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub strength: Option<f64>,

    /// Named style preset applied to the generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub style_preset: Option<String>,
}
