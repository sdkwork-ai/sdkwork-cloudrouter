use serde::{Deserialize, Serialize};

/// OpenAI-compatible file object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFile {
    /// File size in bytes.
    pub bytes: i64,

    /// Unix timestamp in seconds when the file was created.
    pub created_at: i64,

    /// Uploaded file name.
    pub filename: String,

    /// File identifier.
    pub id: String,

    /// Object type, normally file.
    pub object: String,

    /// OpenAI-compatible file purpose.
    pub purpose: String,

    /// File processing status when returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Provider status details when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_details: Option<String>,
}
