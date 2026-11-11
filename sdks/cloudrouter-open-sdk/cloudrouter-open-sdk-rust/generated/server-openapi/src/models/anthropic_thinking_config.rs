use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic thinking config schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicThinkingConfig {
    /// Thinking token budget; must be at least 1024 and less than `max_tokens`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub budget_tokens: Option<i64>,

    /// How thinking content appears in the response when the mode is `adaptive`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display: Option<String>,

    /// Thinking mode.
    pub r#type: String,
}
