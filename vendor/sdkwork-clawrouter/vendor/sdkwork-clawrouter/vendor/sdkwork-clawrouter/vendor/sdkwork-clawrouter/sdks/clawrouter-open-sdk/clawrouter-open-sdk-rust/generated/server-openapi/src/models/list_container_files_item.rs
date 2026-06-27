use serde::{Deserialize, Serialize};

/// Item module returned inside the listContainerFiles list response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ListContainerFilesItem {
    /// Container file size in bytes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bytes: Option<i64>,

    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Container file name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,

    /// Resource identifier returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Developer-defined or provider-returned metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable container name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// OpenAI-compatible object type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,

    /// Current resource status when returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
