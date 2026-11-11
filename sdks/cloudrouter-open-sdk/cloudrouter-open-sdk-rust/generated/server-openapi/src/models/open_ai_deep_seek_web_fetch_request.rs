use serde::{Deserialize, Serialize};

/// DeepSeek-compatible request to fetch a single web page as Markdown.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiDeepSeekWebFetchRequest {
    /// Absolute HTTP or HTTPS URL to fetch. Must contain a host, must not carry a username or password, and is limited to 8192 characters.
    pub url: String,
}
