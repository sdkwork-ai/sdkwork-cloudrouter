use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update a vector store.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVectorStoreUpdateRequest {
    /// Vector store expiration policy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_after: Option<String>,

    /// Developer-defined vector store metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable vector store name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
