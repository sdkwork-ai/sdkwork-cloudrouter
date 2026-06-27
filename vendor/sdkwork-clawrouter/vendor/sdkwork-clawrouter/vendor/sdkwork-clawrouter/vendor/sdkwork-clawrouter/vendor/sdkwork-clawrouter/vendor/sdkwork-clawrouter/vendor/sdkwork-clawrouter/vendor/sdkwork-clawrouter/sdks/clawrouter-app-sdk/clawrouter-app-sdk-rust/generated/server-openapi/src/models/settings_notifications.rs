use serde::{Deserialize, Serialize};

/// Settings notifications schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SettingsNotifications {
    /// Api monitor field on settings notifications.
    #[serde(rename = "apiMonitor")]
    pub api_monitor: bool,

    /// Bill reminder field on settings notifications.
    #[serde(rename = "billReminder")]
    pub bill_reminder: bool,

    /// Quota warning field on settings notifications.
    #[serde(rename = "quotaWarning")]
    pub quota_warning: bool,
}
