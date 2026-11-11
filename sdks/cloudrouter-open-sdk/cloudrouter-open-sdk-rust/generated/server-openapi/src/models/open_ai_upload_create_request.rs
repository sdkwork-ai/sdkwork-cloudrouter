use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create an upload.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiUploadCreateRequest {
    /// Total number of bytes in the upload.
    pub bytes: i64,

    /// Upload expiration policy, for example `{anchor: created_at, seconds: 3600}`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_after: Option<std::collections::HashMap<String, String>>,

    /// Upload filename.
    pub filename: String,

    /// Upload MIME type.
    pub mime_type: String,

    /// OpenAI-compatible upload purpose.
    pub purpose: String,
}
