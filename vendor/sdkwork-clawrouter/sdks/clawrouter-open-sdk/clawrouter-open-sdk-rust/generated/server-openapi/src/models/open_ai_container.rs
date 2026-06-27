use serde::{Deserialize, Serialize};

/// OpenAI-compatible container object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiContainer {
    /// Unix timestamp in seconds when the container was created.
    pub created_at: i64,

    /// Unix timestamp in seconds when the container expires.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,

    /// Container identifier.
    pub id: String,

    /// Unix timestamp in seconds when the container was last active.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_active_at: Option<i64>,

    /// Memory limit or container size selected for tool execution.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memory_limit: Option<String>,

    /// Developer-defined container metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable container name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Object type, normally container.
    pub object: String,

    /// Container lifecycle status.
    pub status: String,
}
