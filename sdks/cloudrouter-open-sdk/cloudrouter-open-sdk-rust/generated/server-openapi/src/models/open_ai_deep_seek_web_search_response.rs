use serde::{Deserialize, Serialize};

use crate::models::OpenAiDeepSeekWebSearchResult;

/// DeepSeek-compatible web search response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiDeepSeekWebSearchResponse {
    /// Ranked search results; empty when the search matched nothing. An empty array is a successful but unbilled request.
    pub results: Vec<OpenAiDeepSeekWebSearchResult>,
}
