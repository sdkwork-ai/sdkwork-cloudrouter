use serde::{Deserialize, Serialize};

use crate::models::{AdminAuthWechatMini, AdminAuthWechatOfficial};

/// Admin auth wechat settings schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAuthWechatSettings {
    /// Mini field on admin auth wechat settings.
    pub mini: Vec<AdminAuthWechatMini>,

    /// Official field on admin auth wechat settings.
    pub official: Vec<AdminAuthWechatOfficial>,
}
