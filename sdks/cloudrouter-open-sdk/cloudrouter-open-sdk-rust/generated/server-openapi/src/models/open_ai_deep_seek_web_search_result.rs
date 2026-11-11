use serde::{Deserialize, Serialize};

/// One ranked DeepSeek web search result.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiDeepSeekWebSearchResult {
    /// Page authority from 0 to 4, where -1 means unknown.
    pub authority: i64,

    /// Full page content when need_content is true, otherwise empty.
    pub content: String,

    /// Publication time in UTC RFC 3339 format, or null when unknown.
    pub date: String,

    /// Relevance score from 0 to 3 combining relevance, authority and freshness; 1.5 or above is considered high quality.
    pub rerank_score: f64,

    /// Site icon URL, or null when unavailable.
    pub site_icon: String,

    /// Site name, or null when unavailable.
    pub site_name: String,

    /// Short query-relevant excerpt intended for display.
    pub snippet: String,

    /// Longer query-relevant summary intended for model consumption.
    pub summary: String,

    /// Result title.
    pub title: String,

    /// Result URL.
    pub url: String,
}
