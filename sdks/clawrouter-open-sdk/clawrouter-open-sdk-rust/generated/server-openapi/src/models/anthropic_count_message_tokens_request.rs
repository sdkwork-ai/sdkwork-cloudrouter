use serde::{Deserialize, Serialize};

use crate::models::{AnthropicMessageParam, AnthropicThinkingConfig, AnthropicTool, AnthropicToolChoice};

/// Anthropic Claude anthropic count message tokens request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicCountMessageTokensRequest {
    /// Maximum number of tokens to generate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<i64>,

    /// Input conversation messages.
    pub messages: Vec<AnthropicMessageParam>,

    /// Metadata field on the anthropic message create request, using the provider metadata module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Claude model identifier.
    pub model: String,

    /// Custom stop sequences.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stop_sequences: Option<Vec<String>>,

    /// Whether to stream server-sent events.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// System prompt content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system: Option<String>,

    /// Sampling temperature.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,

    /// Thinking field on the anthropic message create request, using the anthropic thinking config module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thinking: Option<AnthropicThinkingConfig>,

    /// Tool choice field on the anthropic message create request, using the anthropic tool choice module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<AnthropicToolChoice>,

    /// Tool definitions available to Claude.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<AnthropicTool>>,

    /// Top-k sampling value.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_k: Option<i64>,

    /// Nucleus sampling value.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,
}
