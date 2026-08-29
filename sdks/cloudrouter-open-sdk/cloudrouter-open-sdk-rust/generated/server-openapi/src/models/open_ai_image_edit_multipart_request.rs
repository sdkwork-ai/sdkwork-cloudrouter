use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai image edit multipart request schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageEditMultipartRequest {
    /// Image field on the open ai image edit multipart request, using the open ai binary file part module.
    pub image: Vec<u8>,

    /// Mask field on the open ai image edit multipart request, using the open ai binary file part module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mask: Option<Vec<u8>>,

    /// Image edit model id or Cloud Router catalog key.
    pub model: String,

    /// Text prompt describing the edit.
    pub prompt: String,
}
