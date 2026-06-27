use serde::{Deserialize, Serialize};

/// Google Gemini google thinking config schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleThinkingConfig {
    /// Whether thought summaries should be included when supported.
    #[serde(rename = "includeThoughts")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub include_thoughts: Option<bool>,

    /// Requested thinking token budget.
    #[serde(rename = "thinkingBudget")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thinking_budget: Option<i64>,
}
