use serde::{Deserialize, Serialize};

/// xAI video input for edit and extension requests; provide `url` or `file_id`.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiVideoInput {
    /// File ID from the xAI Files API; mutually exclusive with `url`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Public URL or base64 data URL of the video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
