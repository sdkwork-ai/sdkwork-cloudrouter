use serde::{Deserialize, Serialize};

/// Admin auth wechat official schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAuthWechatOfficial {
    /// Aes key ref field on admin auth wechat official.
    #[serde(rename = "aesKeyRef")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aes_key_ref: Option<String>,

    /// App id field on admin auth wechat official.
    #[serde(rename = "appId")]
    pub app_id: String,

    /// Enabled field on admin auth wechat official.
    pub enabled: bool,

    /// Key field on admin auth wechat official.
    pub key: String,

    /// Name field on admin auth wechat official.
    pub name: String,

    /// Original id field on admin auth wechat official.
    #[serde(rename = "originalId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub original_id: Option<String>,

    /// Primary field on admin auth wechat official.
    pub primary: bool,

    /// Scene field on admin auth wechat official.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scene: Option<String>,

    /// Secret ref field on admin auth wechat official.
    #[serde(rename = "secretRef")]
    pub secret_ref: String,

    /// Token ref field on admin auth wechat official.
    #[serde(rename = "tokenRef")]
    pub token_ref: String,

    /// Url field on admin auth wechat official.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
