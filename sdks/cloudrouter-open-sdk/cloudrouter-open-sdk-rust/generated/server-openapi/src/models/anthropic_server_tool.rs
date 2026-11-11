use serde::{Deserialize, Serialize};

use crate::models::{AnthropicCacheControl};

/// Anthropic server tool definition (bash, text editor, web search, or tool search).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicServerTool {
    /// Callers allowed to invoke the tool.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub allowed_callers: Option<Vec<String>>,

    /// Only include results from these domains; mutually exclusive with `blocked_domains`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub allowed_domains: Option<Vec<String>>,

    /// Never include results from these domains; mutually exclusive with `allowed_domains`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub blocked_domains: Option<Vec<String>>,

    /// Cache control field on the anthropic server tool, using the anthropic cache control module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cache_control: Option<AnthropicCacheControl>,

    /// Load the tool lazily via `tool_reference`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub defer_loading: Option<bool>,

    /// Display height in pixels (computer use).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_height_px: Option<i64>,

    /// Display number (computer use).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_number: Option<i64>,

    /// Display width in pixels (computer use).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_width_px: Option<i64>,

    /// Maximum characters displayed when viewing a file (text editor).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_characters: Option<i64>,

    /// Maximum number of times the tool can be used in the request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_uses: Option<i64>,

    /// Server tool name.
    pub name: String,

    /// Guarantee schema validation on tool names and inputs.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub strict: Option<bool>,

    /// Server tool version id.
    pub r#type: String,

    /// Approximate user location for search results.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_location: Option<std::collections::HashMap<String, String>>,
}
