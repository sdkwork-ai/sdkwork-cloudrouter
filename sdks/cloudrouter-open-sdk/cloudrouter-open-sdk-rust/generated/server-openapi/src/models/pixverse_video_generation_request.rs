use serde::{Deserialize, Serialize};

/// PixVerse text-to-video generation request (`POST /openapi/v2/video/text/generate`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PixverseVideoGenerationRequest {
    /// Output aspect ratio.
    pub aspect_ratio: String,

    /// Requested duration in seconds.
    pub duration: i64,

    /// Generate synchronized audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generate_audio_switch: Option<bool>,

    /// Generate a multi-clip video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generate_multi_clip_switch: Option<bool>,

    /// PixVerse model id.
    pub model: String,

    /// Text prompt describing the requested video.
    pub prompt: String,

    /// Output quality tier.
    pub quality: String,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Webhook registration id notified when the task changes state.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub webhook_id: Option<String>,
}
