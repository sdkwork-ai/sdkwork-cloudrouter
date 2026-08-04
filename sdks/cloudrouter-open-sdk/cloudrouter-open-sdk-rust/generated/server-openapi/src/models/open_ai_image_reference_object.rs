use serde::{Deserialize, Serialize};

/// Structured image reference used when JSON image APIs accept URL, file id, inline, or provider-specific image input.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageReferenceObject {
    /// Base64-encoded image bytes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub b64_json: Option<String>,

    /// Image detail preference when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,

    /// Uploaded file identifier for the source image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Image MIME type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    /// Hosted image URL or data URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
