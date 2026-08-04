use serde::{Deserialize, Serialize};

use crate::models::OpenAiFile;

/// OpenAI-compatible upload object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiUpload {
    /// Total number of bytes expected in the upload.
    pub bytes: i64,

    /// Unix timestamp in seconds when the upload was created.
    pub created_at: i64,

    /// Unix timestamp in seconds when the upload expires.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,

    /// File field on the open ai upload, using the open ai file module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file: Option<OpenAiFile>,

    /// Upload filename.
    pub filename: String,

    /// Upload identifier.
    pub id: String,

    /// Object type, normally upload.
    pub object: String,

    /// OpenAI-compatible upload purpose.
    pub purpose: String,

    /// Upload status.
    pub status: String,
}
