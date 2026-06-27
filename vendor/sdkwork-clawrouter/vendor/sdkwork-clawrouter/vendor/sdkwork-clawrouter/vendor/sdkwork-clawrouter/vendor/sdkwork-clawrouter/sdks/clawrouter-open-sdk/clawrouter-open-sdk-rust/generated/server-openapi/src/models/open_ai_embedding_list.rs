use serde::{Deserialize, Serialize};

use crate::models::{OpenAiEmbedding, OpenAiEmbeddingUsage};

/// OpenAI-compatible open ai embedding list schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiEmbeddingList {
    /// Embedding vectors in input order.
    pub data: Vec<OpenAiEmbedding>,

    /// Embedding model used by the upstream response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Object type, always list.
    pub object: String,

    /// Usage field on the open ai embedding list, using the open ai embedding usage module.
    pub usage: OpenAiEmbeddingUsage,
}
