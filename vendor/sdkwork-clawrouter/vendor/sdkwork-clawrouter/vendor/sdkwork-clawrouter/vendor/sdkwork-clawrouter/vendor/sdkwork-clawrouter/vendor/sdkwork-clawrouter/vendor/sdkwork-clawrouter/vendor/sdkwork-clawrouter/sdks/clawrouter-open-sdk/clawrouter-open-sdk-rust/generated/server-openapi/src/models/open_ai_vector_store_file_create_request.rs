use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to attach a file to a vector store.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVectorStoreFileCreateRequest {
    /// File attributes used for vector store filtering.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attributes: Option<std::collections::HashMap<String, String>>,

    /// Chunking strategy used to process the file.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chunking_strategy: Option<String>,

    /// File identifier to attach to the vector store.
    pub file_id: String,
}
