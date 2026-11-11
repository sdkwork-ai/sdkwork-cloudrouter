use serde::{Deserialize, Serialize};

/// Jimeng video generation request.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct JimengVideoGenerationRequest {
    /// Optional callback URL for task completion.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Requested duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Requested frame rate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fps: Option<i64>,

    /// Optional first-frame image URL or reference image reference.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// Jimeng video model id.
    pub model: String,

    /// Text prompt describing the requested video.
    pub prompt: String,

    /// Requested aspect ratio such as 16:9.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ratio: Option<String>,

    /// Optional deterministic seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
}
