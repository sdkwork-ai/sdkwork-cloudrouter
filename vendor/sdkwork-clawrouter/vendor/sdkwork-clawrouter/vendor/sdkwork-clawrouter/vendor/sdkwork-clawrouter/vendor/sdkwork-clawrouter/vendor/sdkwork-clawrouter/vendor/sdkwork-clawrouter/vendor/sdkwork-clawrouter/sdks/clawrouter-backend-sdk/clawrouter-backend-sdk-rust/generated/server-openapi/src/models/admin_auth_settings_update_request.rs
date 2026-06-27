use serde::{Deserialize, Serialize};

use crate::models::{AdminAuthVerificationPolicy, AdminAuthWechatSettingsUpdate};

/// Admin auth settings update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAuthSettingsUpdateRequest {
    /// Left rail mode field on admin auth settings update request.
    #[serde(rename = "leftRailMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub left_rail_mode: Option<String>,

    /// Login methods field on admin auth settings update request.
    #[serde(rename = "loginMethods")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub login_methods: Option<Vec<String>>,

    /// Oauth login enabled field on admin auth settings update request.
    #[serde(rename = "oauthLoginEnabled")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub oauth_login_enabled: Option<bool>,

    /// Oauth providers field on admin auth settings update request.
    #[serde(rename = "oauthProviders")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub oauth_providers: Option<Vec<String>>,

    /// Oauth region field on admin auth settings update request.
    #[serde(rename = "oauthRegion")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub oauth_region: Option<String>,

    /// Qr login enabled field on admin auth settings update request.
    #[serde(rename = "qrLoginEnabled")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qr_login_enabled: Option<bool>,

    /// Qr login type field on admin auth settings update request.
    #[serde(rename = "qrLoginType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qr_login_type: Option<String>,

    /// Recovery methods field on admin auth settings update request.
    #[serde(rename = "recoveryMethods")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub recovery_methods: Option<Vec<String>>,

    /// Register methods field on admin auth settings update request.
    #[serde(rename = "registerMethods")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub register_methods: Option<Vec<String>>,

    /// Verification policy field on admin auth settings update request.
    #[serde(rename = "verificationPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub verification_policy: Option<AdminAuthVerificationPolicy>,

    /// Wechat field on admin auth settings update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wechat: Option<AdminAuthWechatSettingsUpdate>,
}
