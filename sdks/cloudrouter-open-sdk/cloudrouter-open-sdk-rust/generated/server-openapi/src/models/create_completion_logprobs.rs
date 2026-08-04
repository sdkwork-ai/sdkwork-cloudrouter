use serde::{Deserialize, Serialize};

/// Token log probability details returned for a completion choice.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateCompletionLogprobs {
    /// Character offsets for returned tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text_offset: Option<Vec<i64>>,

    /// Log probabilities for returned tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token_logprobs: Option<Vec<f64>>,

    /// Generated or echoed token strings.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tokens: Option<Vec<String>>,

    /// Most likely token candidates and their log probabilities.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_logprobs: Option<Vec<std::collections::HashMap<String, serde_json::Value>>>,
}
