use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic content block schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicContentBlock {
    /// Tool use identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Input field on the anthropic content block, using the anthropic tool input module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input: Option<std::collections::HashMap<String, String>>,

    /// Tool name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Text output.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Output content block type.
    pub r#type: String,
}
