use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic thinking config schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicThinkingConfig {
    /// Thinking token budget.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub budget_tokens: Option<i64>,

    /// Thinking mode.
    pub r#type: String,
}
