use serde::{Deserialize, Serialize};

/// OpenAI-compatible organization admin API key object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationAdminApiKey {
    /// Unix timestamp in seconds when the key was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Admin API key identifier.
    pub id: String,

    /// Unix timestamp in seconds when the key was last used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_used_at: Option<i64>,

    /// Human-readable API key name.
    pub name: String,

    /// Object type, normally organization.admin_api_key.
    pub object: String,

    /// Owner user or service account.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner: Option<String>,

    /// Redacted API key value.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub redacted_value: Option<String>,

    /// Full API key value returned only at creation time.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
}
