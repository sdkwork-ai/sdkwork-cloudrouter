use serde::{Deserialize, Serialize};

use crate::models::{AnthropicCacheControl, AnthropicContentSource};

/// Anthropic content block (union member of `ContentBlockParam`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicContentBlockParam {
    /// Cache control field on the anthropic content block param, using the anthropic cache control module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cache_control: Option<AnthropicCacheControl>,

    /// Tool invocation caller (`direct` or a server tool caller).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub caller: Option<std::collections::HashMap<String, String>>,

    /// Citations attached to a text or document block.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub citations: Option<Vec<std::collections::HashMap<String, String>>>,

    /// Nested tool result content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,

    /// Document context.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,

    /// Opaque encrypted payload for redacted thinking blocks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<String>,

    /// Tool use identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Input field on the anthropic content block param, using the anthropic tool input module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input: Option<std::collections::HashMap<String, String>>,

    /// Whether a tool result represents an error.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_error: Option<bool>,

    /// Tool name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Opaque signature for a thinking block.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub signature: Option<String>,

    /// Source field on the anthropic content block param, using the anthropic content source module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<AnthropicContentSource>,

    /// Text content for text blocks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Thinking text for thinking blocks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thinking: Option<String>,

    /// Document title.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,

    /// Tool use identifier answered by a tool result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_use_id: Option<String>,

    /// Toolset family a tool-use member belongs to.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub toolset_name: Option<String>,

    /// Content block type.
    pub r#type: String,
}
