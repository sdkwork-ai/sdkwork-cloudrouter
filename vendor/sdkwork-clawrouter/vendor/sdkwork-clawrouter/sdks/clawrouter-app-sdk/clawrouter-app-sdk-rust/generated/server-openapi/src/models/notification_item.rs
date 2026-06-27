use serde::{Deserialize, Serialize};

/// Notification item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct NotificationItem {
    /// Action url field on notification item.
    #[serde(rename = "actionUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action_url: Option<String>,

    /// App id field on notification item.
    #[serde(rename = "appId")]
    pub app_id: String,

    /// Archived field on notification item.
    pub archived: bool,

    /// Content field on notification item.
    pub content: String,

    /// Desc field on notification item.
    pub desc: String,

    /// Id field on notification item.
    pub id: String,

    /// Popup seen field on notification item.
    #[serde(rename = "popupSeen")]
    pub popup_seen: bool,

    /// Read field on notification item.
    pub read: bool,

    /// Show as popup field on notification item.
    #[serde(rename = "showAsPopup")]
    pub show_as_popup: bool,

    /// Time field on notification item.
    pub time: String,

    /// Title field on notification item.
    pub title: String,

    /// Type field on notification item.
    pub r#type: String,
}
