use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update stored chat completion metadata.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiChatCompletionUpdateRequest {
    /// Replacement developer-defined metadata for the stored chat completion.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,
}
