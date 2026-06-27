use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create an organization invite.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationInviteCreateRequest {
    /// Invitee email address.
    pub email: String,

    /// Project memberships or roles to include in the invite.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub projects: Option<Vec<String>>,

    /// Organization role identifier.
    pub role: String,
}
