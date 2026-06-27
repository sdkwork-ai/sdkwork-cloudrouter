use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update a project rate limit.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectRateLimitUpdateRequest {
    /// Maximum batch input tokens per day.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub batch_1_day_max_input_tokens: Option<i64>,

    /// Maximum images per minute.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_images_per_1_minute: Option<i64>,

    /// Maximum requests per minute.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_requests_per_1_minute: Option<i64>,

    /// Maximum tokens per minute.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_tokens_per_1_minute: Option<i64>,
}
