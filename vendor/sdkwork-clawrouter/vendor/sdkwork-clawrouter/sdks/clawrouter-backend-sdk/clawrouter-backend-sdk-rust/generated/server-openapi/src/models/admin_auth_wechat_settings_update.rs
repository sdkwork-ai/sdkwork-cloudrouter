use serde::{Deserialize, Serialize};

use crate::models::{AdminAuthWechatMini, AdminAuthWechatOfficial};

/// Admin auth wechat settings update schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAuthWechatSettingsUpdate {
    /// Mini field on admin auth wechat settings update.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mini: Option<Vec<AdminAuthWechatMini>>,

    /// Official field on admin auth wechat settings update.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub official: Option<Vec<AdminAuthWechatOfficial>>,
}
