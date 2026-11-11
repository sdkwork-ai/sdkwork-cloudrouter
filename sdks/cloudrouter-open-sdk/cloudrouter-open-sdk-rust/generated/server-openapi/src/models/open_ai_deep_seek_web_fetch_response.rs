use serde::{Deserialize, Serialize};

/// DeepSeek-compatible fetched page: title plus Markdown body.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiDeepSeekWebFetchResponse {
    /// Extracted page body rendered as Markdown. A response whose body could not be extracted is never billed, which is why an empty body is a free call rather than a chargeable one.
    pub content: String,

    /// Page title; an empty string when the page declares none.
    pub title: String,
}
