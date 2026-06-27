use serde::{Deserialize, Serialize};

/// Item module returned inside the listVectorStoreFileBatchFiles list response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ListVectorStoreFileBatchFilesItem {
    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Vector store file identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// File identifiers attached to the vector store or batch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_ids: Option<Vec<String>>,

    /// Resource identifier returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Developer-defined or provider-returned metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable vector store name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// OpenAI-compatible object type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,

    /// Current resource status when returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Vector store storage usage in bytes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_bytes: Option<i64>,
}
