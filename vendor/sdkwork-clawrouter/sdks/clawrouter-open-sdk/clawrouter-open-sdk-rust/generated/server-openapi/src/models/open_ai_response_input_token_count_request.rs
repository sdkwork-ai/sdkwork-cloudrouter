use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to count tokens for a Responses API input.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponseInputTokenCountRequest {
    /// Responses API input to count.
    pub input: String,

    /// Optional system or developer instructions included in the count.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Model id or Claw Router catalog key used for token counting.
    pub model: String,

    /// Tools included in the count when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<String>>,
}
