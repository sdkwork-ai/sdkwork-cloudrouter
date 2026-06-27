use serde::{Deserialize, Serialize};

/// Nano Banana compatible nano banana image generation request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct NanoBananaImageGenerationRequest {
    /// Requested aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Optional callback URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Optional reference image URLs or file identifiers.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<String>>,

    /// Image model identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Image prompt sent to the Nano Banana compatible provider.
    pub prompt: String,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Requested image size.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
}
