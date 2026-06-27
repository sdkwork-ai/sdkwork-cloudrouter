use serde::{Deserialize, Serialize};

/// Single vector store search result.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVectorStoreSearchResult {
    /// File attributes returned with the result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attributes: Option<std::collections::HashMap<String, String>>,

    /// Matched text content chunks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<Vec<String>>,

    /// Matched file identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Matched filename.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,

    /// Search relevance score.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,
}
