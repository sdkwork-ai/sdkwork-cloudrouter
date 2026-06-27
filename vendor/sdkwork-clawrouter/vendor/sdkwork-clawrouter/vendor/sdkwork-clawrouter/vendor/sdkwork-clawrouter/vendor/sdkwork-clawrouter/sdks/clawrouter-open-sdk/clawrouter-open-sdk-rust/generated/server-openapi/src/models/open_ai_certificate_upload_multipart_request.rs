use serde::{Deserialize, Serialize};

/// OpenAI-compatible multipart request to upload a certificate.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiCertificateUploadMultipartRequest {
    /// Certificate file when the upstream expects this form field.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub certificate: Option<String>,

    /// Certificate file.
    pub file: String,

    /// JSON-serialized certificate metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,

    /// Human-readable certificate name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
