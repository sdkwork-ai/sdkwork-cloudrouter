use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a vector store.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVectorStoreCreateRequest {
    /// Chunking strategy used to process attached files.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chunking_strategy: Option<String>,

    /// Vector store expiration policy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_after: Option<String>,

    /// File identifiers to attach to the vector store.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_ids: Option<Vec<String>>,

    /// Developer-defined vector store metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable vector store name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
