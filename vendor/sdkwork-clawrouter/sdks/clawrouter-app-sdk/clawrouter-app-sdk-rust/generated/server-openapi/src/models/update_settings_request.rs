use serde::{Deserialize, Serialize};

use crate::models::{SettingsNotifications};

/// Update settings request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UpdateSettingsRequest {
    /// Language field on update settings request.
    pub language: String,

    /// Notifications field on update settings request.
    pub notifications: SettingsNotifications,

    /// Timezone field on update settings request.
    pub timezone: String,

    /// Webhook url field on update settings request.
    #[serde(rename = "webhookUrl")]
    pub webhook_url: String,
}
