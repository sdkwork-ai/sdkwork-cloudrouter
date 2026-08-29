use serde::{Deserialize, Serialize};

use crate::models::{CreateCompletionLogprobs};

/// Single choice returned by the legacy OpenAI-compatible completions API.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateCompletionChoice {
    /// Reason generation finished, such as stop, length, or content_filter.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,

    /// Choice index in the returned choices array.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub index: Option<i64>,

    /// Logprobs field on the create completion choice, using the create completion logprobs module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logprobs: Option<CreateCompletionLogprobs>,

    /// Generated completion text.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}
