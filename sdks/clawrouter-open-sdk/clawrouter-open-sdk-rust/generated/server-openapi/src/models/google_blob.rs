use serde::{Deserialize, Serialize};

/// Google Gemini google blob schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleBlob {
    /// Base64-encoded binary content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<String>,

    /// IANA MIME type for the inline data.
    #[serde(rename = "mimeType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}
