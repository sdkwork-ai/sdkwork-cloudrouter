use serde::{Deserialize, Serialize};

/// OpenAI-compatible video object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVideo {
    /// Unix timestamp in seconds when the video completed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,

    /// URL for video bytes when returned separately.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_url: Option<String>,

    /// Unix timestamp in seconds when the video was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Video identifier.
    pub id: String,

    /// Developer-defined or provider-returned video metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Video model used by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Object type, normally video.
    pub object: String,

    /// Prompt used for the video request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Generated or requested duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seconds: Option<i64>,

    /// Generated or requested video size.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,

    /// Video lifecycle status.
    pub status: String,

    /// Generated video URL when returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
