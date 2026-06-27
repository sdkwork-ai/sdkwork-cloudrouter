use serde::{Deserialize, Serialize};

/// Midjourney-compatible midjourney image generation request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MidjourneyImageGenerationRequest {
    /// Requested aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Optional callback URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Model or mode identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Image prompt sent to the Midjourney-compatible provider.
    pub prompt: String,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Style option.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub style: Option<String>,
}
