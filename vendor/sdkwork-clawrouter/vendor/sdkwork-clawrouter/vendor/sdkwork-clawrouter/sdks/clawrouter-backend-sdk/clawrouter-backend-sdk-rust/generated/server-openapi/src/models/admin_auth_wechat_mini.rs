use serde::{Deserialize, Serialize};

/// Admin auth wechat mini schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAuthWechatMini {
    /// App id field on admin auth wechat mini.
    #[serde(rename = "appId")]
    pub app_id: String,

    /// Enabled field on admin auth wechat mini.
    pub enabled: bool,

    /// Env field on admin auth wechat mini.
    pub env: String,

    /// Key field on admin auth wechat mini.
    pub key: String,

    /// Name field on admin auth wechat mini.
    pub name: String,

    /// Path field on admin auth wechat mini.
    pub path: String,

    /// Primary field on admin auth wechat mini.
    pub primary: bool,

    /// Secret ref field on admin auth wechat mini.
    #[serde(rename = "secretRef")]
    pub secret_ref: String,

    /// Url field on admin auth wechat mini.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
