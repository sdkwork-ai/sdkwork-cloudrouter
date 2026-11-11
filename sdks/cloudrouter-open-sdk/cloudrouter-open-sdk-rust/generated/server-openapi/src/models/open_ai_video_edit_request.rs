use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to edit a video (`POST /v1/videos/edits`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVideoEditRequest {
    /// Text prompt describing the edit.
    pub prompt: String,

    /// Source video reference, URL, file id, or provider-specific video payload.
    pub video: String,
}
