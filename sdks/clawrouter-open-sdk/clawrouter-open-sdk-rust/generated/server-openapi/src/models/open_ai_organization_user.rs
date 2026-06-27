use serde::{Deserialize, Serialize};

/// OpenAI-compatible organization user object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationUser {
    /// Unix timestamp in seconds when the user was added.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// User email address.
    pub email: String,

    /// Organization user identifier.
    pub id: String,

    /// Developer-defined user metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// User display name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Object type, normally organization.user.
    pub object: String,

    /// Organization role identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,

    /// User status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
