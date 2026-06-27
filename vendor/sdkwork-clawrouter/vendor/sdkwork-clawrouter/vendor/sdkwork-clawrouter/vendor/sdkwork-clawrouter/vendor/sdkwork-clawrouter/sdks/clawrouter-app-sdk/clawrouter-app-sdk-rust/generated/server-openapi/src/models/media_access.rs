use serde::{Deserialize, Serialize};

/// Media access schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MediaAccess {
    /// Expires at field on media access.
    #[serde(rename = "expiresAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,

    /// Visibility field on media access.
    pub visibility: String,
}
