use serde::{Deserialize, Serialize};

/// OpenAI-compatible thread object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiThread {
    /// Unix timestamp in seconds when the thread was created.
    pub created_at: i64,

    /// Thread identifier.
    pub id: String,

    /// Developer-defined thread metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Object type, normally thread.
    pub object: String,

    /// Resources available to assistant tools.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_resources: Option<String>,
}
