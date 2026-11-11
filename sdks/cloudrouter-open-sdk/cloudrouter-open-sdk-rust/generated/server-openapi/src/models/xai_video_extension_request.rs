use serde::{Deserialize, Serialize};

use crate::models::{XaiVideoInput};

/// xAI video extension request (ExtendVideoRequest).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiVideoExtensionRequest {
    /// Duration of the extension segment in seconds; defaults to 6.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Model to be used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Optional output destination for the extended video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<std::collections::HashMap<String, String>>,

    /// Prompt describing what should happen next in the video.
    pub prompt: String,

    /// Optional output storage configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_options: Option<std::collections::HashMap<String, String>>,

    /// Video field on the xai video extension request, using the xai video input module.
    pub video: XaiVideoInput,
}
