use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai image edit multipart request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageEditMultipartRequest {
    /// Image field on the open ai image edit multipart request, using the open ai binary file part module.
    pub image: String,

    /// Mask field on the open ai image edit multipart request, using the open ai binary file part module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mask: Option<String>,

    /// Image edit model id or Claw Router catalog key.
    pub model: String,

    /// Text prompt describing the edit.
    pub prompt: String,
}
