use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update a thread run.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRunUpdateRequest {
    /// Developer-defined run metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,
}
