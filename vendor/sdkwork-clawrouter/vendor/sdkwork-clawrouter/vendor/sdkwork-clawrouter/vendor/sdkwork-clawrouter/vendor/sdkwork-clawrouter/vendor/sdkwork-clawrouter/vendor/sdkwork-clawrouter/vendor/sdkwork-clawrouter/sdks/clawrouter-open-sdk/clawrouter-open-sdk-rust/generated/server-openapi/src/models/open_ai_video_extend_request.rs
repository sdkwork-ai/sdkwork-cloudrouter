use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to extend a video.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVideoExtendRequest {
    /// Source image reference, URL, file id, or provider-specific image payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// Developer-defined metadata attached to the video request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Video model id or Claw Router catalog key.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Text prompt describing the requested video output.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Requested duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seconds: Option<i64>,

    /// Requested video size or resolution.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,

    /// Source video reference, URL, file id, or provider-specific video payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video: Option<String>,
}
