use serde::{Deserialize, Serialize};

use crate::models::{OpenAiVectorStoreFileCounts};

/// OpenAI-compatible vector store object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVectorStore {
    /// Storage used by the vector store in bytes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bytes: Option<i64>,

    /// Unix timestamp in seconds when the vector store was created.
    pub created_at: i64,

    /// Vector store expiration policy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_after: Option<String>,

    /// Unix timestamp in seconds when the vector store expires.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,

    /// File counts field on the open ai vector store, using the open ai vector store file counts module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_counts: Option<OpenAiVectorStoreFileCounts>,

    /// Vector store identifier.
    pub id: String,

    /// Unix timestamp in seconds when the vector store was last active.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_active_at: Option<i64>,

    /// Developer-defined vector store metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable vector store name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Object type, normally vector_store.
    pub object: String,

    /// Vector store processing status.
    pub status: String,

    /// Storage used by the vector store in bytes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_bytes: Option<i64>,
}
