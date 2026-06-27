use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic message param schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicMessageParam {
    /// Message content.
    pub content: String,

    /// Message role.
    pub role: String,
}
