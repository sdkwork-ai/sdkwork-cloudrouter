use serde::{Deserialize, Serialize};

/// OpenAI-compatible vector store file object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVectorStoreFile {
    /// File attributes used for vector store filtering.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attributes: Option<std::collections::HashMap<String, String>>,

    /// Chunking strategy applied to this file.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chunking_strategy: Option<String>,

    /// Unix timestamp in seconds when the vector store file was created.
    pub created_at: i64,

    /// Vector store file identifier.
    pub id: String,

    /// Last processing error returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,

    /// Object type, normally vector_store.file.
    pub object: String,

    /// Vector store file processing status.
    pub status: String,

    /// Storage used by the vector store file in bytes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_bytes: Option<i64>,

    /// Vector store identifier that owns this file.
    pub vector_store_id: String,
}
