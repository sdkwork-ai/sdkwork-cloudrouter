use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create an organization admin API key.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationAdminApiKeyCreateRequest {
    /// Human-readable API key name.
    pub name: String,
}
