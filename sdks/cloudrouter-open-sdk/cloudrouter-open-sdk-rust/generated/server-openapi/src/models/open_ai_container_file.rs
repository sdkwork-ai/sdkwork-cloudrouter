use serde::{Deserialize, Serialize};

/// OpenAI-compatible container file object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiContainerFile {
    /// File size in bytes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bytes: Option<i64>,

    /// Container identifier that owns the file.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub container_id: Option<String>,

    /// Unix timestamp in seconds when the file was created.
    pub created_at: i64,

    /// Container file name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,

    /// Container file identifier.
    pub id: String,

    /// Developer-defined container file metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Object type, normally container.file.
    pub object: String,

    /// Path of the file inside the container.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,

    /// Container file purpose when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub purpose: Option<String>,
}
