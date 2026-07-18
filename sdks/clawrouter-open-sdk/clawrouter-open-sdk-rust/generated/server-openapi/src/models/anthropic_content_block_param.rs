use serde::{Deserialize, Serialize};

use crate::models::{AnthropicContentSource};

/// Anthropic Claude anthropic content block param schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicContentBlockParam {
    /// Nested tool result content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,

    /// Tool use identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Input field on the anthropic content block param, using the anthropic tool input module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input: Option<std::collections::HashMap<String, String>>,

    /// Tool name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Source field on the anthropic content block param, using the anthropic content source module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<AnthropicContentSource>,

    /// Text content for text blocks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Tool use identifier answered by a tool result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_use_id: Option<String>,

    /// Content block type, such as text, image, document, tool_use, or tool_result.
    pub r#type: String,
}
