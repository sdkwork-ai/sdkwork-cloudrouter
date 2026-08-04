use serde::{Deserialize, Serialize};

/// OpenAI-compatible multipart request to upload or create a container file.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiContainerFileCreateMultipartRequest {
    /// Binary file payload for the container.
    pub file: String,

    /// JSON-serialized container file metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,

    /// Container file purpose when required by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub purpose: Option<String>,
}
