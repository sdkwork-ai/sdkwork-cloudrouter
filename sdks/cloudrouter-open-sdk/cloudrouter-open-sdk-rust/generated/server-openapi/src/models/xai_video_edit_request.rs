use serde::{Deserialize, Serialize};

use crate::models::XaiVideoInput;

/// xAI video edit request (EditVideoRequest).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiVideoEditRequest {
    /// Model to be used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Optional output destination for the edited video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<std::collections::HashMap<String, String>>,

    /// Prompt for video editing.
    pub prompt: String,

    /// Optional output storage configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_options: Option<std::collections::HashMap<String, String>>,

    /// Unique identifier representing the end-user.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,

    /// Video field on the xai video edit request, using the xai video input module.
    pub video: XaiVideoInput,
}
