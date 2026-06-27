use serde::{Deserialize, Serialize};

/// Structured file reference used when a JSON endpoint accepts uploaded, hosted, or inline file input.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFileReferenceObject {
    /// Inline base64 or provider-compatible file data.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_data: Option<String>,

    /// Uploaded file identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Input filename when sending inline file data.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,

    /// MIME type of the referenced file.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    /// Hosted file URL or data URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
