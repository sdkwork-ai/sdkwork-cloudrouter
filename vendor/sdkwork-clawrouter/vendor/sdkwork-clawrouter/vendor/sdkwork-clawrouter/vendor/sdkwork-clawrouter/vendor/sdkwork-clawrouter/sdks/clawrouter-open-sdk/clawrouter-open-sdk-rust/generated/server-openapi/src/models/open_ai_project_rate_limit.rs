use serde::{Deserialize, Serialize};

/// OpenAI-compatible project rate limit object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectRateLimit {
    /// Maximum batch input tokens per day.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub batch_1_day_max_input_tokens: Option<i64>,

    /// Project rate limit identifier.
    pub id: String,

    /// Maximum images per minute.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_images_per_1_minute: Option<i64>,

    /// Maximum requests per minute.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_requests_per_1_minute: Option<i64>,

    /// Maximum tokens per minute.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_tokens_per_1_minute: Option<i64>,

    /// Model identifier the rate limit applies to.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Object type, normally project.rate_limit.
    pub object: String,
}
