use serde::{Deserialize, Serialize};

use crate::models::{OpenAiFunctionCall, OpenAiToolCall};

/// OpenAI-compatible open ai chat message schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiChatMessage {
    /// Message content as plain text, multimodal content parts, or null for tool call messages.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,

    /// Function call field on the open ai chat message, using the open ai function call module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub function_call: Option<OpenAiFunctionCall>,

    /// Optional participant name for the message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Refusal text emitted by compatible upstreams.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub refusal: Option<String>,

    /// Message role, such as developer, system, user, assistant, tool, or function.
    pub role: String,

    /// Tool call identifier that this tool message answers.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,

    /// Tool calls requested by an assistant message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<OpenAiToolCall>>,
}
