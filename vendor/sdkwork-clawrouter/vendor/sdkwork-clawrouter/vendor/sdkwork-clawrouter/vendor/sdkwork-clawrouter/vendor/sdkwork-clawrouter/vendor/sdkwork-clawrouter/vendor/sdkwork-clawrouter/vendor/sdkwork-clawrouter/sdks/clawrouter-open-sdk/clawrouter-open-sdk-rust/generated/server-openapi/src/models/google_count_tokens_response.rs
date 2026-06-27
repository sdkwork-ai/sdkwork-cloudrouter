use serde::{Deserialize, Serialize};

/// Google Gemini google count tokens response schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleCountTokensResponse {
    /// Cached content token count.
    #[serde(rename = "cachedContentTokenCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cached_content_token_count: Option<i64>,

    /// Total token count.
    #[serde(rename = "totalTokens")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<i64>,
}
