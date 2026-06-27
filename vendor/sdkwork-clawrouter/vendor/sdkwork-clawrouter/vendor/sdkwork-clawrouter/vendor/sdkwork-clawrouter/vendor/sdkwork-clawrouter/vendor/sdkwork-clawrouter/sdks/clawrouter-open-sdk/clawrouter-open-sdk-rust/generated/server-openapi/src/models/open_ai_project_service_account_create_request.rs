use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a project service account.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectServiceAccountCreateRequest {
    /// Human-readable service account name.
    pub name: String,

    /// Project role identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}
