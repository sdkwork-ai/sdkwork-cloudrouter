use serde::{Deserialize, Serialize};

/// Zhipu CogVideoX video generation request (`POST /api/paas/v4/videos/generations`). `prompt` or `image_url` must be supplied.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ZhipuVideoGenerationRequest {
    /// Video duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Frame rate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fps: Option<i64>,

    /// First-frame image, first/last-frame pair, or Base64 payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,

    /// Video model code, for example `cogvideox-3`.
    pub model: String,

    /// Text prompt; at most 512 characters. `prompt` and `image_url` cannot both be empty.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Output mode: speed-first or quality-first.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,

    /// Client-supplied unique request id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,

    /// Output size such as `1920x1080`; the allowed set depends on the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,

    /// Stable end-user identifier for abuse attribution.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,

    /// Whether the vendor adds explicit and implicit AI watermarks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub watermark_enabled: Option<bool>,

    /// Generate an AI audio track.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub with_audio: Option<bool>,
}
