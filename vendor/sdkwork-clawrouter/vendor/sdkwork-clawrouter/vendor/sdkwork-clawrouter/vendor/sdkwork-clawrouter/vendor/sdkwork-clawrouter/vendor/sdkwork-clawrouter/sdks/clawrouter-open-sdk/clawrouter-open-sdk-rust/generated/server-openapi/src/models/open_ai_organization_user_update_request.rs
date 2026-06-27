use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update an organization user.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationUserUpdateRequest {
    /// Developer-defined user metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Organization role identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}
