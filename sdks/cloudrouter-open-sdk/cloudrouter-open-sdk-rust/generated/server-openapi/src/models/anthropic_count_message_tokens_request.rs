use serde::{Deserialize, Serialize};

use crate::models::{
    AnthropicCacheControl, AnthropicMessageParam, AnthropicOutputConfig, AnthropicThinkingConfig,
    AnthropicTool, AnthropicToolChoice,
};

/// Anthropic token-counting request (`POST /v1/messages/count_tokens`). The vendor accepts the conversation, system prompt, tools, and thinking configuration, but not the generation controls.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicCountMessageTokensRequest {
    /// Top-level cache control marker applied to the last cacheable block.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cache_control: Option<AnthropicCacheControl>,

    /// Input conversation messages.
    pub messages: Vec<AnthropicMessageParam>,

    /// Claude model identifier.
    pub model: String,

    /// Output configuration such as effort and JSON output format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_config: Option<AnthropicOutputConfig>,

    /// Inference speed mode; `fast` raises output tokens per second.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub speed: Option<String>,

    /// System prompt content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system: Option<String>,

    /// Thinking field on the anthropic count message tokens request, using the anthropic thinking config module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thinking: Option<AnthropicThinkingConfig>,

    /// Tool choice field on the anthropic count message tokens request, using the anthropic tool choice module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<AnthropicToolChoice>,

    /// Tool definitions available to Claude: custom client tools or server tools.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<AnthropicTool>>,
}
