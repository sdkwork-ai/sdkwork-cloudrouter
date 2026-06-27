use serde::{Deserialize, Serialize};

use crate::models::OpenAiRoleAssignment;

/// OpenAI-compatible paginated list of role assignments.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRoleAssignmentList {
    /// Role assignments in the returned page.
    pub data: Vec<OpenAiRoleAssignment>,

    /// Identifier of the first object in this page when provided.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub first_id: Option<String>,

    /// Whether additional pages are available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub has_more: Option<bool>,

    /// Identifier of the last object in this page when provided.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_id: Option<String>,

    /// Object type, normally list.
    pub object: String,
}
