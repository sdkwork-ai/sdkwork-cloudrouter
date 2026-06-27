use serde::{Deserialize, Serialize};

use crate::models::{
    OpenAiPromptReference, OpenAiReasoningConfig, OpenAiTextConfig, OpenAiTool, OpenAiToolChoice,
};

/// OpenAI-compatible open ai responses request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponsesRequest {
    /// Whether the response may run in the background when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<bool>,

    /// Conversation identifier or object for stateful response creation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub conversation: Option<String>,

    /// Additional response fields to include.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub include: Option<Vec<String>>,

    /// Text or structured multimodal input items for the Responses API.
    pub input: String,

    /// System or developer instructions for the response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Maximum number of output tokens to generate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<i64>,

    /// Maximum number of tool calls the model may make.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_tool_calls: Option<i64>,

    /// Developer-defined metadata attached to the response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Model id or Claw Router catalog key routed to a provider account.
    pub model: String,

    /// Whether compatible upstreams may issue parallel tool calls.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parallel_tool_calls: Option<bool>,

    /// Previous response identifier for chained responses.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub previous_response_id: Option<String>,

    /// Prompt field on the open ai responses request, using the open ai prompt reference module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<OpenAiPromptReference>,

    /// Application supplied cache key for prompt caching.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_cache_key: Option<String>,

    /// Reasoning field on the open ai responses request, using the open ai reasoning config module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<OpenAiReasoningConfig>,

    /// Requested upstream service tier when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_tier: Option<String>,

    /// Whether the upstream should store the response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub store: Option<bool>,

    /// Whether to stream response events.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Sampling temperature.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,

    /// Text field on the open ai responses request, using the open ai text config module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<OpenAiTextConfig>,

    /// Tool choice field on the open ai responses request, using the open ai tool choice module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<OpenAiToolChoice>,

    /// Tools available to the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<OpenAiTool>>,

    /// Number of likely token options to include when logprobs are requested.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_logprobs: Option<i64>,

    /// Nucleus sampling probability mass.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,

    /// Input truncation strategy for long context requests.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub truncation: Option<String>,

    /// End-user identifier forwarded to compatible upstreams.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}
