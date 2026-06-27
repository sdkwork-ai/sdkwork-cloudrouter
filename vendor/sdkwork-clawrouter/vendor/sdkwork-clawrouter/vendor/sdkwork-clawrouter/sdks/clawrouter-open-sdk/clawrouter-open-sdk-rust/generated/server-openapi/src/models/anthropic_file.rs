use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic file schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicFile {
    /// Creation timestamp.
    pub created_at: String,

    /// Whether file content can be downloaded.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub downloadable: Option<bool>,

    /// Uploaded filename.
    pub filename: String,

    /// Anthropic file identifier.
    pub id: String,

    /// File MIME type.
    pub mime_type: String,

    /// File size in bytes.
    pub size_bytes: i64,

    /// Object type, always file.
    pub r#type: String,
}
