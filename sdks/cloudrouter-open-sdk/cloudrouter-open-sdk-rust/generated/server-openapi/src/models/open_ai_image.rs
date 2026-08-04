use serde::{Deserialize, Serialize};

/// OpenAI-compatible image output object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImage {
    /// Base64-encoded image bytes when requested.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub b64_json: Option<String>,

    /// Image MIME type when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    /// Prompt revised by the upstream image model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub revised_prompt: Option<String>,

    /// Image URL when the upstream returns hosted output.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
