use serde::{Deserialize, Serialize};

use crate::models::{AdminAuthVerificationPolicy, AdminAuthWechatSettings};

/// Admin auth settings response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAuthSettingsResponse {
    /// Left rail mode field on admin auth settings response.
    #[serde(rename = "leftRailMode")]
    pub left_rail_mode: String,

    /// Login methods field on admin auth settings response.
    #[serde(rename = "loginMethods")]
    pub login_methods: Vec<String>,

    /// Oauth login enabled field on admin auth settings response.
    #[serde(rename = "oauthLoginEnabled")]
    pub oauth_login_enabled: bool,

    /// Oauth providers field on admin auth settings response.
    #[serde(rename = "oauthProviders")]
    pub oauth_providers: Vec<String>,

    /// Oauth region field on admin auth settings response.
    #[serde(rename = "oauthRegion")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub oauth_region: Option<String>,

    /// Qr login enabled field on admin auth settings response.
    #[serde(rename = "qrLoginEnabled")]
    pub qr_login_enabled: bool,

    /// Qr login type field on admin auth settings response.
    #[serde(rename = "qrLoginType")]
    pub qr_login_type: String,

    /// Recovery methods field on admin auth settings response.
    #[serde(rename = "recoveryMethods")]
    pub recovery_methods: Vec<String>,

    /// Register methods field on admin auth settings response.
    #[serde(rename = "registerMethods")]
    pub register_methods: Vec<String>,

    /// Verification policy field on admin auth settings response.
    #[serde(rename = "verificationPolicy")]
    pub verification_policy: AdminAuthVerificationPolicy,

    /// Wechat field on admin auth settings response.
    pub wechat: AdminAuthWechatSettings,
}
