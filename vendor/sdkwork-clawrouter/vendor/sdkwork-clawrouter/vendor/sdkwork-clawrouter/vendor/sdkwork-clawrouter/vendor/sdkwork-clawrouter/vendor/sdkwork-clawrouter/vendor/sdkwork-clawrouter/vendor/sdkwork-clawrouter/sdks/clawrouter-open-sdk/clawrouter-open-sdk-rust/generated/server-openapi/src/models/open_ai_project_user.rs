use serde::{Deserialize, Serialize};

/// OpenAI-compatible project user object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectUser {
    /// Unix timestamp in seconds when the user was added to the project.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// User email address.
    pub email: String,

    /// Project user identifier.
    pub id: String,

    /// User display name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Object type, normally project.user.
    pub object: String,

    /// Project role identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}
