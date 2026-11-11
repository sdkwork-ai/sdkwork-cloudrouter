use serde::{Deserialize, Serialize};

/// Anthropic prompt-cache breakpoint.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicCacheControl {
    /// Cache breakpoint time-to-live.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ttl: Option<String>,

    /// Cache control type.
    pub r#type: String,
}
