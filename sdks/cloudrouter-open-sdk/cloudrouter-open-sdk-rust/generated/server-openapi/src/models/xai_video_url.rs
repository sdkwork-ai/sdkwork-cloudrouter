use serde::{Deserialize, Serialize};

/// An xAI video input or output reference. Provide `url` or `file_id` when used as an input.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiVideoUrl {
    /// Duration of the video in seconds when returned by xAI.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// File ID from the xAI Files API; mutually exclusive with `url`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Public URL or base64 data URL of the video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
