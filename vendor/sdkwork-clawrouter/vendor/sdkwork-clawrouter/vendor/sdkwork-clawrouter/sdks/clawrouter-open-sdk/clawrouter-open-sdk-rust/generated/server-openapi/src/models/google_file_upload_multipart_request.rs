use serde::{Deserialize, Serialize};

/// Google Gemini google file upload multipart request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleFileUploadMultipartRequest {
    /// Binary file content uploaded to Gemini.
    pub file: String,

    /// JSON-encoded Gemini file metadata when required by the upstream upload protocol.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,
}
