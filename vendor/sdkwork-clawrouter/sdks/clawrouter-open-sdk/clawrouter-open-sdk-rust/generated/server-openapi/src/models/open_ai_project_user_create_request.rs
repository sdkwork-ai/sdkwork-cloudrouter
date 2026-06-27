use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to add a user to a project.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectUserCreateRequest {
    /// Project role identifier.
    pub role: String,

    /// Organization user identifier.
    pub user_id: String,
}
