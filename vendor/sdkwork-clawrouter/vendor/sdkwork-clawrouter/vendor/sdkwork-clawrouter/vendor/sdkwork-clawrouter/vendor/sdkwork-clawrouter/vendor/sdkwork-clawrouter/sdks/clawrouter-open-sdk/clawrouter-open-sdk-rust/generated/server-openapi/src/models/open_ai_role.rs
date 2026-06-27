use serde::{Deserialize, Serialize};

/// OpenAI-compatible role object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRole {
    /// Unix timestamp in seconds when the role was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Human-readable role description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Role identifier.
    pub id: String,

    /// Human-readable role name.
    pub name: String,

    /// Object type, normally role.
    pub object: String,

    /// Permission identifiers granted by the role.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub permissions: Option<Vec<String>>,
}
