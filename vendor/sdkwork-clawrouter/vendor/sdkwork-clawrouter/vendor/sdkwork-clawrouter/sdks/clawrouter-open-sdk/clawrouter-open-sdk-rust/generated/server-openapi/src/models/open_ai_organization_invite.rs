use serde::{Deserialize, Serialize};

/// OpenAI-compatible organization invite object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationInvite {
    /// Unix timestamp in seconds when the invite was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Invitee email address.
    pub email: String,

    /// Unix timestamp in seconds when the invite expires.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,

    /// Organization invite identifier.
    pub id: String,

    /// Object type, normally organization.invite.
    pub object: String,

    /// Projects or project roles included in the invite.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub projects: Option<Vec<String>>,

    /// Invited organization role.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,

    /// Invite status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
