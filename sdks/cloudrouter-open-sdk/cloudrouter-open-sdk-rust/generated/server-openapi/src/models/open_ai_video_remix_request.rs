use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to remix a video (`POST /v1/videos/{video_id}/remix`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVideoRemixRequest {
    /// Text prompt describing the remix.
    pub prompt: String,
}
