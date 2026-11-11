use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic tool choice schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicToolChoice {
    /// Emit at most one tool use (or exactly one for `any`/`tool`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub disable_parallel_tool_use: Option<bool>,

    /// Tool name when forcing a specific tool.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// How the model should use the provided tools.
    pub r#type: String,
}
