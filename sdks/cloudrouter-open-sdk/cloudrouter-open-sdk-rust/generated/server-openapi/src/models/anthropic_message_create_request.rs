use serde::{Deserialize, Serialize};

use crate::models::{
    AnthropicCacheControl, AnthropicContainer, AnthropicDiagnostics, AnthropicMessageParam,
    AnthropicMetadata, AnthropicOutputConfig, AnthropicThinkingConfig, AnthropicTool,
    AnthropicToolChoice,
};

/// Anthropic Claude anthropic message create request schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicMessageCreateRequest {
    /// Top-level cache control marker applied to the last cacheable block.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cache_control: Option<AnthropicCacheControl>,

    /// Container identifier and skills reused across requests.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub container: Option<AnthropicContainer>,

    /// Request-level diagnostics for prompt-cache divergence.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub diagnostics: Option<AnthropicDiagnostics>,

    /// Geographic region for inference; defaults to the workspace `default_inference_geo`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inference_geo: Option<String>,

    /// Maximum number of tokens to generate; `0` pre-warms the prompt cache without generating a response.
    pub max_tokens: i64,

    /// Input conversation messages.
    pub messages: Vec<AnthropicMessageParam>,

    /// Request metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<AnthropicMetadata>,

    /// Claude model identifier.
    pub model: String,

    /// Output configuration such as effort and JSON output format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_config: Option<AnthropicOutputConfig>,

    /// Priority or standard capacity for this request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_tier: Option<String>,

    /// Inference speed mode; `fast` raises output tokens per second.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub speed: Option<String>,

    /// Custom stop sequences.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stop_sequences: Option<Vec<String>>,

    /// Whether to stream server-sent events.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// System prompt content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system: Option<String>,

    /// Legacy sampling temperature; current Messages documentation moves output-shape controls to `output_config`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,

    /// Thinking field on the anthropic message create request, using the anthropic thinking config module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thinking: Option<AnthropicThinkingConfig>,

    /// Tool choice field on the anthropic message create request, using the anthropic tool choice module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<AnthropicToolChoice>,

    /// Tool definitions available to Claude: custom client tools or server tools.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<AnthropicTool>>,

    /// Legacy top-k sampling value.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_k: Option<i64>,

    /// Legacy nucleus sampling value.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,
}
