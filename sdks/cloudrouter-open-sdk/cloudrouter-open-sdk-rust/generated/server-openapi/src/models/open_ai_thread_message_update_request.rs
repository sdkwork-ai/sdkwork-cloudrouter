use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update a thread message.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiThreadMessageUpdateRequest {
    /// Developer-defined message metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,
}
