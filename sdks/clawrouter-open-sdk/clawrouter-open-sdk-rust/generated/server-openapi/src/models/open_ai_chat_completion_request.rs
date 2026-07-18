use serde::{Deserialize, Serialize};

use crate::models::{OpenAiChatAudioConfig, OpenAiChatMessage, OpenAiFunctionCallChoice, OpenAiFunctionDefinition, OpenAiPredictionConfig, OpenAiResponseFormat, OpenAiStreamOptions, OpenAiTool, OpenAiToolChoice};

/// OpenAI-compatible open ai chat completion request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiChatCompletionRequest {
    /// Audio field on the open ai chat completion request, using the open ai chat audio config module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio: Option<OpenAiChatAudioConfig>,

    /// Penalty applied to repeated tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frequency_penalty: Option<f64>,

    /// Function call field on the open ai chat completion request, using the open ai function call choice module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub function_call: Option<OpenAiFunctionCallChoice>,

    /// Legacy function definitions passed through for compatible upstreams.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub functions: Option<Vec<OpenAiFunctionDefinition>>,

    /// Token bias map keyed by token id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logit_bias: Option<std::collections::HashMap<String, f64>>,

    /// Whether to return token log probabilities when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logprobs: Option<bool>,

    /// Upper bound for generated completion tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_completion_tokens: Option<i64>,

    /// Legacy upper bound for generated tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<i64>,

    /// Conversation messages in OpenAI-compatible chat format.
    pub messages: Vec<OpenAiChatMessage>,

    /// Developer-defined metadata attached to the request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Requested output modalities, such as text or audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modalities: Option<Vec<String>>,

    /// Model id or Claw Router catalog key routed to a provider account.
    pub model: String,

    /// Number of chat completion choices to generate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<i64>,

    /// Whether tool calls may be executed in parallel by compatible upstreams.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parallel_tool_calls: Option<bool>,

    /// Prediction field on the open ai chat completion request, using the open ai prediction config module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prediction: Option<OpenAiPredictionConfig>,

    /// Penalty applied to new topic tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f64>,

    /// Reasoning effort hint for reasoning models.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reasoning_effort: Option<String>,

    /// Response format field on the open ai chat completion request, using the open ai response format module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<OpenAiResponseFormat>,

    /// Best-effort deterministic sampling seed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Requested upstream service tier when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_tier: Option<String>,

    /// Stop sequence or list of stop sequences.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stop: Option<String>,

    /// Whether the upstream should store the chat completion when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub store: Option<bool>,

    /// Whether to stream chat completion chunks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Stream options field on the open ai chat completion request, using the open ai stream options module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream_options: Option<OpenAiStreamOptions>,

    /// Sampling temperature.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,

    /// Tool choice field on the open ai chat completion request, using the open ai tool choice module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<OpenAiToolChoice>,

    /// Tool definitions available to the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<OpenAiTool>>,

    /// Number of most likely tokens to return at each position.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_logprobs: Option<i64>,

    /// Nucleus sampling probability mass.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,

    /// End-user identifier forwarded to compatible upstreams.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}
