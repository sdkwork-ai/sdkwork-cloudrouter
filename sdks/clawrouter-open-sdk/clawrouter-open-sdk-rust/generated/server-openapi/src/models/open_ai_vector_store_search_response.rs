use serde::{Deserialize, Serialize};

use crate::models::{OpenAiVectorStoreSearchResult};

/// OpenAI-compatible vector store search response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVectorStoreSearchResponse {
    /// Vector store search results.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<Vec<OpenAiVectorStoreSearchResult>>,

    /// Object type returned by the search endpoint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,

    /// Queries used for the vector store search.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub search_query: Option<Vec<String>>,
}
