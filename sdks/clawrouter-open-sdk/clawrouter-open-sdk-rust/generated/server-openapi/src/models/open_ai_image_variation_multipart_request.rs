use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai image variation multipart request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageVariationMultipartRequest {
    /// Image field on the open ai image variation multipart request, using the open ai binary file part module.
    pub image: String,

    /// Image variation model id or Claw Router catalog key.
    pub model: String,

    /// Requested image size.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
}
