use serde::{Deserialize, Serialize};

/// OpenAI-compatible role assignment object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRoleAssignment {
    /// Unix timestamp in seconds when the assignment was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Group identifier assigned to the role.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_id: Option<String>,

    /// Role assignment identifier.
    pub id: String,

    /// Object type, normally role.assignment.
    pub object: String,

    /// Project identifier associated with the assignment.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,

    /// Role identifier.
    pub role_id: String,

    /// User identifier assigned to the role.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
}
