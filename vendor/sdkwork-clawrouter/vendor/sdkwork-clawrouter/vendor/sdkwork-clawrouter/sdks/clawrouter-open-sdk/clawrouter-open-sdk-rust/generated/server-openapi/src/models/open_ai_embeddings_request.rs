use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai embeddings request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiEmbeddingsRequest {
    /// Requested embedding dimensionality when supported by the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dimensions: Option<i64>,

    /// Format for returned embeddings.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub encoding_format: Option<String>,

    /// Input text, text array, token array, or token array batch to embed.
    pub input: String,

    /// Embedding model id or Claw Router catalog key routed to a provider account.
    pub model: String,

    /// End-user identifier forwarded to compatible upstreams.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}
