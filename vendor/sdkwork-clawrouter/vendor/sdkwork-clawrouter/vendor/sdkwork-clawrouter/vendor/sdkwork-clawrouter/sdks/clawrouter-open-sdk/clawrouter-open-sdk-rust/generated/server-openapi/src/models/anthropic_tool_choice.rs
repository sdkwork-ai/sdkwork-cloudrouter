use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic tool choice schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicToolChoice {
    /// Tool name when forcing a specific tool.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Tool choice type such as auto, any, tool, or none.
    pub r#type: String,
}
