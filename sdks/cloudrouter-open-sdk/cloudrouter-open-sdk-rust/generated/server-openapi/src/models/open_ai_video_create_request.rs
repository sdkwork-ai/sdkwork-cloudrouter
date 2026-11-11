use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a video (`POST /v1/videos`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVideoCreateRequest {
    /// Optional input image reference.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_reference: Option<std::collections::HashMap<String, String>>,

    /// Video model id such as sora-2 or sora-2-pro.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Text prompt describing the video to generate.
    pub prompt: String,

    /// Requested video duration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seconds: Option<String>,

    /// Requested video size.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
}
