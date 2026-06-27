use serde::{Deserialize, Serialize};

/// OpenAI-compatible project API key object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectApiKey {
    /// Unix timestamp in seconds when the key was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Project API key identifier.
    pub id: String,

    /// Unix timestamp in seconds when the key was last used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_used_at: Option<i64>,

    /// Human-readable API key name.
    pub name: String,

    /// Object type, normally project.api_key.
    pub object: String,

    /// Owner user or service account.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner: Option<String>,

    /// Redacted API key value.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub redacted_value: Option<String>,
}
