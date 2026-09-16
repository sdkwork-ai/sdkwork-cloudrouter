use serde::{Deserialize, Serialize};

/// Kling-compatible kling motion control request schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingMotionControlRequest {
    /// Optional callback URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Character image URL whose person performs the motion.
    pub image: String,

    /// Kling model id, for example kling-v2-6 or kling-v3.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_name: Option<String>,

    /// Optional text prompt for global or local motion control.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Motion reference video URL (single-person performance, 3-30 seconds).
    pub video: String,
}
