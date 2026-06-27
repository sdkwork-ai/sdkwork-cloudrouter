use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a role assignment.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRoleAssignmentCreateRequest {
    /// Role identifier to assign.
    pub role_id: String,
}
