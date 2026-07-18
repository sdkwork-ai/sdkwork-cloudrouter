use serde::{Deserialize, Serialize};

use crate::models::{OpenAiResponseInputTokensDetails};

/// OpenAI-compatible response input token count result.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponseInputTokenCount {
    /// Number of input tokens counted.
    pub input_tokens: i64,

    /// Input tokens details field on the open ai response input token count, using the open ai response input tokens details module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_tokens_details: Option<OpenAiResponseInputTokensDetails>,

    /// Model used for token counting.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Object type returned by the token count endpoint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,
}
