use serde::{Deserialize, Serialize};

use crate::models::{CreateCompletionChoice, OpenAiTokenUsage};

/// OpenAI-compatible legacy text completion response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiCompletion {
    /// Generated completion choices.
    pub choices: Vec<CreateCompletionChoice>,

    /// Unix timestamp in seconds when the completion was created.
    pub created: i64,

    /// Completion identifier.
    pub id: String,

    /// Model id used by the completion.
    pub model: String,

    /// Object type, normally text_completion.
    pub object: String,

    /// Backend fingerprint used to debug deterministic sampling changes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system_fingerprint: Option<String>,

    /// Usage field on the open ai completion, using the open ai token usage module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<OpenAiTokenUsage>,
}
