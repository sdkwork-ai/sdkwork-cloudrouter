use serde::{Deserialize, Serialize};

use crate::models::{AnthropicContentBlock, AnthropicUsage};

/// Anthropic Claude anthropic message schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicMessage {
    /// Generated content blocks.
    pub content: Vec<AnthropicContentBlock>,

    /// Anthropic message identifier.
    pub id: String,

    /// Claude model used for generation.
    pub model: String,

    /// Role of the generated message.
    pub role: String,

    /// Reason generation stopped.
    pub stop_reason: String,

    /// Stop sequence that ended generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stop_sequence: Option<String>,

    /// Object type, always message.
    pub r#type: String,

    /// Usage field on the anthropic message, using the anthropic usage module.
    pub usage: AnthropicUsage,
}
