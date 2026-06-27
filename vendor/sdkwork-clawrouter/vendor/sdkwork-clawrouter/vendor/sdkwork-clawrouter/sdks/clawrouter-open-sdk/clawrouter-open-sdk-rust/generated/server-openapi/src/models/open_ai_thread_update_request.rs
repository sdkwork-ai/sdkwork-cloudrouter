use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update a thread.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiThreadUpdateRequest {
    /// Developer-defined thread metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Resources available to assistant tools.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_resources: Option<String>,
}
