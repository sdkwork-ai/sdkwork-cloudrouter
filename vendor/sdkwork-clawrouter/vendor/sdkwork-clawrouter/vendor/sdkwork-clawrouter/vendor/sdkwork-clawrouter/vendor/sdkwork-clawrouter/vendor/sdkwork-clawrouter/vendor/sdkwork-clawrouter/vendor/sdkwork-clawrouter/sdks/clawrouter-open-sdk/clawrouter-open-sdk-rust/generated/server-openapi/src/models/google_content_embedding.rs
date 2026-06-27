use serde::{Deserialize, Serialize};

/// Google Gemini google content embedding schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleContentEmbedding {
    /// Embedding vector values.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub values: Option<Vec<f64>>,
}
