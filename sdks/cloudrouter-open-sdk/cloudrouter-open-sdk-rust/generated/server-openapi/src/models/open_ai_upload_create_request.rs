use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create an upload.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiUploadCreateRequest {
    /// Total number of bytes in the upload.
    pub bytes: i64,

    /// Upload filename.
    pub filename: String,

    /// Upload MIME type.
    pub mime_type: String,

    /// OpenAI-compatible upload purpose.
    pub purpose: String,
}
