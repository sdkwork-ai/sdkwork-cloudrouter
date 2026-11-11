use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to count tokens for a Responses API input (`POST /v1/responses/input_tokens`). Supply `input` or `previous_response_id`.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponseInputTokenCountRequest {
    /// Conversation reference or inline conversation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub conversation: Option<String>,

    /// Responses API input to count.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input: Option<String>,

    /// Optional system or developer instructions included in the count.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Model id or Cloud Router catalog key used for token counting.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Whether the model may call tools in parallel.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parallel_tool_calls: Option<bool>,

    /// Personality or style configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub personality: Option<String>,

    /// Count the input of a stored previous response instead of a fresh input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub previous_response_id: Option<String>,

    /// Reasoning configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<String>,

    /// Text output configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Tool choice configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<String>,

    /// Tools included in the count when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<String>>,

    /// Truncation strategy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub truncation: Option<String>,
}
