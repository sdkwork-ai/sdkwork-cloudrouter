use serde::{Deserialize, Serialize};

/// OpenAI-compatible certificate object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiCertificate {
    /// Whether the certificate is active.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub active: Option<bool>,

    /// Certificate content or PEM when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,

    /// Unix timestamp in seconds when the certificate was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Unix timestamp in seconds when the certificate expires.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,

    /// Certificate identifier.
    pub id: String,

    /// Human-readable certificate name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Object type, normally certificate.
    pub object: String,
}
