use serde::{Deserialize, Serialize};

/// Admin announcement update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnnouncementUpdateRequest {
    /// Optional announcement body content update.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,

    /// Optional popup-display toggle update.
    #[serde(rename = "showAsPopup")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub show_as_popup: Option<bool>,

    /// Optional announcement publication state update.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Optional announcement audience segment update.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,

    /// Optional announcement title update.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}
