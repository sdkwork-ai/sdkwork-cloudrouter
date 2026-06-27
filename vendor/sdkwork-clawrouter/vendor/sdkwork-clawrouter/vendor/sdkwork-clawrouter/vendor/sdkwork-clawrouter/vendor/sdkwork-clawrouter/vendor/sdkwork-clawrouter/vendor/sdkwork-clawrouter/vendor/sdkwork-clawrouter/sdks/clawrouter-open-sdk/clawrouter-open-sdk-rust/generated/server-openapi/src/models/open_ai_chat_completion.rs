use serde::{Deserialize, Serialize};

use crate::models::{OpenAiChatCompletionChoice, OpenAiTokenUsage};

/// OpenAI-compatible open ai chat completion schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiChatCompletion {
    /// Generated chat completion choices.
    pub choices: Vec<OpenAiChatCompletionChoice>,

    /// Unix timestamp in seconds when the completion was created.
    pub created: i64,

    /// Chat completion identifier.
    pub id: String,

    /// Model id used by the upstream response.
    pub model: String,

    /// Object type, normally chat.completion.
    pub object: String,

    /// Upstream request identifier when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,

    /// Service tier used by the upstream when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_tier: Option<String>,

    /// Backend fingerprint for deterministic debugging when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system_fingerprint: Option<String>,

    /// Usage field on the open ai chat completion, using the open ai token usage module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<OpenAiTokenUsage>,
}
