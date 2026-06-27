use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai audio translation multipart request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiAudioTranslationMultipartRequest {
    /// File field on the open ai audio translation multipart request, using the open ai binary file part module.
    pub file: String,

    /// Translation model id or Claw Router catalog key.
    pub model: String,

    /// Optional text prompt to guide translation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Desired translation response format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,
}
