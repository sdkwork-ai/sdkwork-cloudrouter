use serde::{Deserialize, Serialize};

/// Admin announcement create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnnouncementCreateRequest {
    /// Announcement body content.
    pub content: String,

    /// Whether eligible users should see this announcement as a popup when the frontend loads.
    #[serde(rename = "showAsPopup")]
    pub show_as_popup: bool,

    /// Publication state for the announcement.
    pub status: String,

    /// Audience segment that should receive the announcement.
    pub target: String,

    /// Announcement title displayed in admin and console surfaces.
    pub title: String,
}
