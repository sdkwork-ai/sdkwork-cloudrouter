use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai embedding usage schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiEmbeddingUsage {
    /// Number of input tokens embedded.
    pub prompt_tokens: i64,

    /// Total token count for the embedding request.
    pub total_tokens: i64,
}
