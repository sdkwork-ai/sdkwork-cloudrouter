use serde::{Deserialize, Serialize};

/// Kling-compatible kling video generation request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingVideoGenerationRequest {
    /// Requested aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Optional callback URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Prompt guidance scale.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cfg_scale: Option<f64>,

    /// Requested video duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Optional source image URL or asset reference.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// Optional ending image URL or asset reference.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_tail: Option<String>,

    /// Generation mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,

    /// Kling model identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Negative prompt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub negative_prompt: Option<String>,

    /// Video prompt sent to the Kling-compatible provider.
    pub prompt: String,
}
