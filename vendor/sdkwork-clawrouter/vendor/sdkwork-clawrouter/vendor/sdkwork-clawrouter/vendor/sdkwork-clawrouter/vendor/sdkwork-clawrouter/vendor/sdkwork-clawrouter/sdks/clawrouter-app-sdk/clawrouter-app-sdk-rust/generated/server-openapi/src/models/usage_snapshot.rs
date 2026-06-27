use serde::{Deserialize, Serialize};

/// Usage snapshot schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UsageSnapshot {
    /// Cached tokens field on usage snapshot.
    #[serde(rename = "cachedTokens")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cached_tokens: Option<String>,

    /// Input tokens field on usage snapshot.
    #[serde(rename = "inputTokens")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_tokens: Option<String>,

    /// Output tokens field on usage snapshot.
    #[serde(rename = "outputTokens")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<String>,

    /// Total tokens field on usage snapshot.
    #[serde(rename = "totalTokens")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<String>,
}
