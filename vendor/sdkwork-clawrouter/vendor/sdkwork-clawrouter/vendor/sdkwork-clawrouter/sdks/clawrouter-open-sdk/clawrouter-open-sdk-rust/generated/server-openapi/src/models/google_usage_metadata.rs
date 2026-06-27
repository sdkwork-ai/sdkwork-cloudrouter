use serde::{Deserialize, Serialize};

/// Google Gemini google usage metadata schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleUsageMetadata {
    /// Cached content token count.
    #[serde(rename = "cachedContentTokenCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cached_content_token_count: Option<i64>,

    /// Candidate output token count.
    #[serde(rename = "candidatesTokenCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub candidates_token_count: Option<i64>,

    /// Input token count.
    #[serde(rename = "promptTokenCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_token_count: Option<i64>,

    /// Thinking token count.
    #[serde(rename = "thoughtsTokenCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thoughts_token_count: Option<i64>,

    /// Total token count.
    #[serde(rename = "totalTokenCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_token_count: Option<i64>,
}
