use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to compact response or conversation state.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponseCompactRequest {
    /// Responses API input, response state, or conversation state to compact.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input: Option<String>,

    /// Developer-defined metadata attached to the compaction request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Model id or Claw Router catalog key used for compaction.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Previous response identifier to compact from.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub previous_response_id: Option<String>,
}
