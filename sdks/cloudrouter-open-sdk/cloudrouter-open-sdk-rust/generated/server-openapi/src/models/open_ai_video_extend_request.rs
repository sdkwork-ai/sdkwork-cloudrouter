use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to extend a video (`POST /v1/videos/extensions`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVideoExtendRequest {
    /// Text prompt describing the extension.
    pub prompt: String,

    /// Extension duration in seconds (allowed values: 4, 8, 12, 16, 20).
    pub seconds: String,

    /// Source video reference, URL, file id, or provider-specific video payload.
    pub video: String,
}
