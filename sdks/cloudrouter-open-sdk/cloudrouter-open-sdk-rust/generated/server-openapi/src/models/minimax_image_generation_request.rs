use serde::{Deserialize, Serialize};

/// MiniMax image generation request (union of the legacy text-to-image and image-to-image `/v1/image_generation` variants).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxImageGenerationRequest {
    /// Requested aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Output height in pixels when aspect_ratio is omitted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub height: Option<i64>,

    /// MiniMax image model id.
    pub model: String,

    /// Number of images to generate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<i64>,

    /// Text prompt describing the requested image.
    pub prompt: String,

    /// Whether the provider rewrites the prompt for more detail.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_optimizer: Option<bool>,

    /// Response format: url or base64.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Subject reference images for image-to-image (image-01-live).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subject_reference: Option<Vec<std::collections::HashMap<String, String>>>,

    /// Output width in pixels when aspect_ratio is omitted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub width: Option<i64>,
}
