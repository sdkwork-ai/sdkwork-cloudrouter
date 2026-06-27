use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update a project user.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectUserUpdateRequest {
    /// Project role identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}
