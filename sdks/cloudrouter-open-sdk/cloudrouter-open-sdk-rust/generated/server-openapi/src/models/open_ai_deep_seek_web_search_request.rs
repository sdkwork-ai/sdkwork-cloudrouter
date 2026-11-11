use serde::{Deserialize, Serialize};

/// DeepSeek-compatible web search request.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiDeepSeekWebSearchRequest {
    /// Number of results to return; does not change the per-request price.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub count: Option<i64>,

    /// Optional IP address used to prefer localized search results.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub localization: Option<String>,

    /// Whether to return full page content in each result's content field. When false, content is always an empty string.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub need_content: Option<bool>,

    /// The user's original question that triggered the search, used to improve query understanding. A null value is treated as absent.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ori_question: Option<String>,

    /// Search query of 1 to 128 Unicode characters, not all whitespace. Supports the site:, -site:, -term, -"exact phrase", "exact phrase", lang:, after: and before: operators, which are forwarded unchanged.
    pub query: String,
}
