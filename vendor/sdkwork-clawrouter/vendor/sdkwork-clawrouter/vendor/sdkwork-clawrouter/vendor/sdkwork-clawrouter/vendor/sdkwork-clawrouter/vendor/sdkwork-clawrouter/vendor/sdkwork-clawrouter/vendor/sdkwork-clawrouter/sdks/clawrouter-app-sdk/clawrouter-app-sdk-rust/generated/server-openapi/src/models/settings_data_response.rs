use serde::{Deserialize, Serialize};

use crate::models::{SettingsNotifications};

/// Settings data response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SettingsDataResponse {
    /// Language field on settings data response.
    pub language: String,

    /// Notifications field on settings data response.
    pub notifications: SettingsNotifications,

    /// Timezone field on settings data response.
    pub timezone: String,

    /// Webhook url field on settings data response.
    #[serde(rename = "webhookUrl")]
    pub webhook_url: String,
}
