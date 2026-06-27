use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to add a user to an organization group.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationGroupUserCreateRequest {
    /// Organization user identifier.
    pub user_id: String,
}
