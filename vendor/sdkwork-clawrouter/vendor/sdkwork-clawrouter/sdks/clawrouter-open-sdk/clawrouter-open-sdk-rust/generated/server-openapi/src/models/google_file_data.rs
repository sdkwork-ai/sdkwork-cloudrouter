use serde::{Deserialize, Serialize};

/// Google Gemini google file data schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleFileData {
    /// Gemini file URI.
    #[serde(rename = "fileUri")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_uri: Option<String>,

    /// IANA MIME type for the referenced file.
    #[serde(rename = "mimeType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}
