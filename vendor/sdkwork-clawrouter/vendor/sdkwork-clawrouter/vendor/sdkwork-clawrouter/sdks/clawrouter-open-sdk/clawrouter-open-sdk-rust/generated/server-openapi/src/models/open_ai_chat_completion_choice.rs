use serde::{Deserialize, Serialize};

use crate::models::{OpenAiChatMessage, OpenAiChoiceLogprobs};

/// OpenAI-compatible open ai chat completion choice schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiChatCompletionChoice {
    /// Reason generation finished, such as stop, length, content_filter, or tool_calls.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,

    /// Choice index in the response.
    pub index: i64,

    /// Logprobs field on the open ai chat completion choice, using the open ai choice logprobs module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logprobs: Option<OpenAiChoiceLogprobs>,

    /// Message field on the open ai chat completion choice, using the open ai chat message module.
    pub message: OpenAiChatMessage,
}
