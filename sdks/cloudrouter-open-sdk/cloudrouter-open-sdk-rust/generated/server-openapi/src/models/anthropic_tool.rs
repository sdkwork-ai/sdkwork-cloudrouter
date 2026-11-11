use serde::{Deserialize, Serialize};

use crate::models::{AnthropicCacheControl, ProviderJsonSchema};

/// Anthropic custom client tool definition (the `Tool` member of `ToolUnion`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicTool {
    /// Callers allowed to invoke the tool.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub allowed_callers: Option<Vec<String>>,

    /// Cache control field on the anthropic tool, using the anthropic cache control module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cache_control: Option<AnthropicCacheControl>,

    /// Load the tool lazily via `tool_reference` instead of the initial system prompt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub defer_loading: Option<bool>,

    /// Tool description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Stream tool input incrementally while it is generated.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub eager_input_streaming: Option<bool>,

    /// Example inputs used for tool-use training hints.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_examples: Option<Vec<std::collections::HashMap<String, String>>>,

    /// Input schema field on the anthropic tool, using the provider json schema module.
    pub input_schema: ProviderJsonSchema,

    /// Tool name as it appears in `tool_use` blocks.
    pub name: String,

    /// Guarantee schema validation on tool names and inputs.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub strict: Option<bool>,

    /// Tool type; omit or set `custom` for client tools.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
}
