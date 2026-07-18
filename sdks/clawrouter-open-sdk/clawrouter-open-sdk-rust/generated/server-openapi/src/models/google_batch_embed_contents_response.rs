use serde::{Deserialize, Serialize};

use crate::models::{GoogleContentEmbedding};

/// Google Gemini google batch embed contents response schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleBatchEmbedContentsResponse {
    /// Embedding vectors in request order.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub embeddings: Option<Vec<GoogleContentEmbedding>>,
}
