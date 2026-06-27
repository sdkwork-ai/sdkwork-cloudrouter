use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update vector store file attributes.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVectorStoreFileUpdateRequest {
    /// File attributes used for vector store filtering.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attributes: Option<std::collections::HashMap<String, String>>,
}
