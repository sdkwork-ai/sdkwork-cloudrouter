use serde::{Deserialize, Serialize};

/// OpenAI-compatible organization usage bucket.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationUsageBucket {
    /// Unix timestamp for the bucket end.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end_time: Option<i64>,

    /// Input token count when returned directly.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_tokens: Option<i64>,

    /// Request count when returned directly.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub num_requests: Option<i64>,

    /// Object type returned by the usage endpoint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,

    /// Output token count when returned directly.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<i64>,

    /// Usage results grouped inside this bucket.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub results: Option<Vec<String>>,

    /// Unix timestamp for the bucket start.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub start_time: Option<i64>,
}
