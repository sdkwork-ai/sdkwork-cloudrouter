use serde::{Deserialize, Serialize};

/// Persisted announcement snapshot returned by the backend.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnnouncementItem {
    /// Content field on admin announcement item.
    pub content: String,

    /// Date field on admin announcement item.
    pub date: String,

    /// Id field on admin announcement item.
    pub id: String,

    /// Show as popup field on admin announcement item.
    #[serde(rename = "showAsPopup")]
    pub show_as_popup: bool,

    /// Status field on admin announcement item.
    pub status: String,

    /// Target field on admin announcement item.
    pub target: String,

    /// Title field on admin announcement item.
    pub title: String,
}
