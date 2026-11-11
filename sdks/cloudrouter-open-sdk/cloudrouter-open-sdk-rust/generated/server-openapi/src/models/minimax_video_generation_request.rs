use serde::{Deserialize, Serialize};

/// MiniMax Hailuo video generation task request.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxVideoGenerationRequest {
    /// Optional callback URL for task completion.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Requested duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Whether the provider shortens prompt preprocessing time.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fast_pretreatment: Option<bool>,

    /// Optional first-frame image URL or base64 payload for image-to-video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub first_frame_image: Option<String>,

    /// Optional last-frame image URL or base64 payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_frame_image: Option<String>,

    /// MiniMax video model id.
    pub model: String,

    /// Text prompt describing the requested video.
    pub prompt: String,

    /// Whether the provider rewrites the prompt for more detail.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_optimizer: Option<bool>,

    /// Requested resolution.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,
}
