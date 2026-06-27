use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai embedding schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiEmbedding {
    /// Embedding vector as floats, or base64-encoded vector when requested.
    pub embedding: Vec<f64>,

    /// Index of the embedding in the input batch.
    pub index: i64,

    /// Object type, always embedding.
    pub object: String,
}
