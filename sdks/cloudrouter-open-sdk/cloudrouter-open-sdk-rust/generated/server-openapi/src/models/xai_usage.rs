use serde::{Deserialize, Serialize};

/// xAI usage block. cost_in_usd_ticks is the authoritative charge: divide by 10,000,000 for USD.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiUsage {
    /// Total completion tokens used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completion_tokens: Option<i64>,

    /// Accurate cost of this request in USD ticks.
    pub cost_in_usd_ticks: i64,

    /// Number of live-search sources used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub num_sources_used: Option<i64>,

    /// Total prompt tokens used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_tokens: Option<i64>,

    /// Prompt plus completion tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<i64>,
}
