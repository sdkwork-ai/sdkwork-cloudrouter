use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to search a vector store.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVectorStoreSearchRequest {
    /// Structured metadata filters for the vector store search.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filters: Option<String>,

    /// Maximum number of search results to return.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_num_results: Option<i64>,

    /// Search query text or structured query payload.
    pub query: String,

    /// Ranking options forwarded to compatible upstreams.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ranking_options: Option<String>,

    /// Whether the upstream may rewrite the query.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rewrite_query: Option<bool>,
}
