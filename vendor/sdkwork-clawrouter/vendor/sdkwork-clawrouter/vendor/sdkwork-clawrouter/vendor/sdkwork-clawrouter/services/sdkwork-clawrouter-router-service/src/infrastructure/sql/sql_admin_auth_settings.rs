use serde::{Deserialize, Serialize};

use crate::domain::{DomainError, DomainResult};
use crate::ports::{
    AdminAuthSettings, AdminAuthVerificationPolicy, AdminAuthWechatMini, AdminAuthWechatOfficial,
    AdminAuthWechatSettings,
};

pub(crate) const AUTH_SETTINGS_SOURCE_TABLE: &str = "iam_auth_runtime_settings";
pub(crate) const AUTH_SETTINGS_AUDIT_TARGET_TYPE: i32 = 65;
pub(crate) const CONFIG_SCOPE_AUTH: i32 = 30;
pub(crate) const CONFIG_TYPE_AUTH_SETTINGS: i32 = AUTH_SETTINGS_AUDIT_TARGET_TYPE;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub(crate) struct StoredAuthSettings {
    pub left_rail_mode: String,
    pub login_methods: Vec<String>,
    pub oauth_login_enabled: bool,
    pub oauth_providers: Vec<String>,
    pub oauth_region: String,
    pub qr_login_enabled: bool,
    pub qr_login_type: String,
    pub recovery_methods: Vec<String>,
    pub register_methods: Vec<String>,
    pub verification_policy: StoredAuthVerificationPolicy,
    pub wechat: StoredAuthWechatSettings,
}

impl Default for StoredAuthSettings {
    fn default() -> Self {
        AdminAuthSettings::default().into()
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub(crate) struct StoredAuthVerificationPolicy {
    pub email_code_login_enabled: bool,
    pub email_registration_verification_required: bool,
    pub phone_code_login_enabled: bool,
    pub phone_registration_verification_required: bool,
}

impl Default for StoredAuthVerificationPolicy {
    fn default() -> Self {
        AdminAuthVerificationPolicy::default().into()
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub(crate) struct StoredAuthWechatSettings {
    pub official: Vec<StoredAuthWechatOfficial>,
    pub mini: Vec<StoredAuthWechatMini>,
}

impl Default for StoredAuthWechatSettings {
    fn default() -> Self {
        AdminAuthWechatSettings::default().into()
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub(crate) struct StoredAuthWechatOfficial {
    pub key: String,
    pub name: String,
    pub app_id: String,
    pub original_id: String,
    pub secret_ref: String,
    pub token_ref: String,
    pub aes_key_ref: String,
    pub url: String,
    pub enabled: bool,
    pub primary: bool,
    pub scene: String,
}

impl Default for StoredAuthWechatOfficial {
    fn default() -> Self {
        Self {
            key: String::new(),
            name: String::new(),
            app_id: String::new(),
            original_id: String::new(),
            secret_ref: String::new(),
            token_ref: String::new(),
            aes_key_ref: String::new(),
            url: String::new(),
            enabled: true,
            primary: false,
            scene: String::new(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub(crate) struct StoredAuthWechatMini {
    pub key: String,
    pub name: String,
    pub app_id: String,
    pub secret_ref: String,
    pub url: String,
    pub enabled: bool,
    pub primary: bool,
    pub path: String,
    pub env: String,
}

impl Default for StoredAuthWechatMini {
    fn default() -> Self {
        Self {
            key: String::new(),
            name: String::new(),
            app_id: String::new(),
            secret_ref: String::new(),
            url: String::new(),
            enabled: true,
            primary: false,
            path: String::new(),
            env: "release".to_owned(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredAuthSettingsEnvelope {
    action: Option<String>,
    settings: StoredAuthSettings,
}

impl From<AdminAuthSettings> for StoredAuthSettings {
    fn from(value: AdminAuthSettings) -> Self {
        Self {
            left_rail_mode: value.left_rail_mode,
            login_methods: value.login_methods,
            oauth_login_enabled: value.oauth_login_enabled,
            oauth_providers: value.oauth_providers,
            oauth_region: value.oauth_region,
            qr_login_enabled: value.qr_login_enabled,
            qr_login_type: value.qr_login_type,
            recovery_methods: value.recovery_methods,
            register_methods: value.register_methods,
            verification_policy: value.verification_policy.into(),
            wechat: value.wechat.into(),
        }
    }
}

impl From<StoredAuthSettings> for AdminAuthSettings {
    fn from(value: StoredAuthSettings) -> Self {
        Self {
            left_rail_mode: value.left_rail_mode,
            login_methods: value.login_methods,
            oauth_login_enabled: value.oauth_login_enabled,
            oauth_providers: value.oauth_providers,
            oauth_region: value.oauth_region,
            qr_login_enabled: value.qr_login_enabled,
            qr_login_type: value.qr_login_type,
            recovery_methods: value.recovery_methods,
            register_methods: value.register_methods,
            verification_policy: value.verification_policy.into(),
            wechat: value.wechat.into(),
        }
    }
}

impl From<AdminAuthVerificationPolicy> for StoredAuthVerificationPolicy {
    fn from(value: AdminAuthVerificationPolicy) -> Self {
        Self {
            email_code_login_enabled: value.email_code_login_enabled,
            email_registration_verification_required: value
                .email_registration_verification_required,
            phone_code_login_enabled: value.phone_code_login_enabled,
            phone_registration_verification_required: value
                .phone_registration_verification_required,
        }
    }
}

impl From<StoredAuthVerificationPolicy> for AdminAuthVerificationPolicy {
    fn from(value: StoredAuthVerificationPolicy) -> Self {
        Self {
            email_code_login_enabled: value.email_code_login_enabled,
            email_registration_verification_required: value
                .email_registration_verification_required,
            phone_code_login_enabled: value.phone_code_login_enabled,
            phone_registration_verification_required: value
                .phone_registration_verification_required,
        }
    }
}

impl From<AdminAuthWechatSettings> for StoredAuthWechatSettings {
    fn from(value: AdminAuthWechatSettings) -> Self {
        Self {
            official: value.official.into_iter().map(Into::into).collect(),
            mini: value.mini.into_iter().map(Into::into).collect(),
        }
    }
}

impl From<StoredAuthWechatSettings> for AdminAuthWechatSettings {
    fn from(value: StoredAuthWechatSettings) -> Self {
        Self {
            official: value.official.into_iter().map(Into::into).collect(),
            mini: value.mini.into_iter().map(Into::into).collect(),
        }
    }
}

impl From<AdminAuthWechatOfficial> for StoredAuthWechatOfficial {
    fn from(value: AdminAuthWechatOfficial) -> Self {
        Self {
            key: value.key,
            name: value.name,
            app_id: value.app_id,
            original_id: value.original_id,
            secret_ref: value.secret_ref,
            token_ref: value.token_ref,
            aes_key_ref: value.aes_key_ref,
            url: value.url,
            enabled: value.enabled,
            primary: value.primary,
            scene: value.scene,
        }
    }
}

impl From<StoredAuthWechatOfficial> for AdminAuthWechatOfficial {
    fn from(value: StoredAuthWechatOfficial) -> Self {
        Self {
            key: value.key,
            name: value.name,
            app_id: value.app_id,
            original_id: value.original_id,
            secret_ref: value.secret_ref,
            token_ref: value.token_ref,
            aes_key_ref: value.aes_key_ref,
            url: value.url,
            enabled: value.enabled,
            primary: value.primary,
            scene: value.scene,
        }
    }
}

impl From<AdminAuthWechatMini> for StoredAuthWechatMini {
    fn from(value: AdminAuthWechatMini) -> Self {
        Self {
            key: value.key,
            name: value.name,
            app_id: value.app_id,
            secret_ref: value.secret_ref,
            url: value.url,
            enabled: value.enabled,
            primary: value.primary,
            path: value.path,
            env: value.env,
        }
    }
}

impl From<StoredAuthWechatMini> for AdminAuthWechatMini {
    fn from(value: StoredAuthWechatMini) -> Self {
        Self {
            key: value.key,
            name: value.name,
            app_id: value.app_id,
            secret_ref: value.secret_ref,
            url: value.url,
            enabled: value.enabled,
            primary: value.primary,
            path: value.path,
            env: value.env,
        }
    }
}

pub(crate) fn settings_payload(settings: &AdminAuthSettings) -> DomainResult<String> {
    serde_json::to_string(&StoredAuthSettings::from(settings.clone()))
        .map_err(|error| DomainError::new(error.to_string()))
}

pub(crate) fn settings_snapshot_payload(settings: &AdminAuthSettings) -> DomainResult<String> {
    serde_json::to_string(&StoredAuthSettingsEnvelope {
        action: Some("update_auth_settings".to_owned()),
        settings: StoredAuthSettings::from(settings.clone()),
    })
    .map_err(|error| DomainError::new(error.to_string()))
}

pub(crate) fn settings_from_payload(payload: &str) -> DomainResult<AdminAuthSettings> {
    if payload.trim().is_empty() {
        return Ok(AdminAuthSettings::default());
    }
    let value = serde_json::from_str::<serde_json::Value>(payload)
        .map_err(|error| DomainError::new(error.to_string()))?;
    let settings = value.get("settings").cloned().unwrap_or(value);
    serde_json::from_value::<StoredAuthSettings>(settings)
        .map(AdminAuthSettings::from)
        .map(AdminAuthSettings::normalized)
        .map_err(|error| DomainError::new(error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::settings_from_payload;

    #[test]
    fn settings_from_payload_accepts_legacy_partial_snapshot() {
        let settings = settings_from_payload(
            r#"{"action":"update_auth_settings","settings":{"leftRailMode":"qr-only","qrLoginEnabled":false,"verificationPolicy":{"phoneCodeLoginEnabled":true}}}"#,
        )
        .unwrap();

        assert_eq!("highlights-only", settings.left_rail_mode);
        assert_eq!(
            vec!["password".to_owned(), "phoneCode".to_owned()],
            settings.login_methods
        );
        assert!(!settings.qr_login_enabled);
        assert!(!settings.verification_policy.email_code_login_enabled);
        assert!(settings.verification_policy.phone_code_login_enabled);
        assert_eq!(
            vec!["email".to_owned(), "phone".to_owned()],
            settings.register_methods
        );
        assert_eq!(
            vec!["email".to_owned(), "phone".to_owned()],
            settings.recovery_methods
        );
    }

    #[test]
    fn settings_from_payload_round_trips_compact_wechat_qr_settings() {
        let settings = settings_from_payload(
            r#"{
                "settings": {
                    "qrLoginEnabled": true,
                    "qrLoginType": "mini",
                    "wechat": {
                        "official": [
                            {
                                "key": "oa-main",
                                "name": "Main OA",
                                "appId": "wx1234567890abcdef",
                                "originalId": "gh_123456",
                                "secretRef": "secret://wechat/oa-main/secret",
                                "tokenRef": "secret://wechat/oa-main/token",
                                "aesKeyRef": "secret://wechat/oa-main/aes",
                                "enabled": true,
                                "primary": true,
                                "scene": "login"
                            }
                        ],
                        "mini": [
                            {
                                "key": "mini-main",
                                "name": "Main Mini",
                                "appId": "wxabcdef1234567890",
                                "secretRef": "secret://wechat/mini-main/secret",
                                "enabled": true,
                                "primary": true,
                                "path": "pages/auth/login",
                                "env": "trial"
                            }
                        ]
                    }
                }
            }"#,
        )
        .unwrap();

        assert!(settings.qr_login_enabled);
        assert_eq!("mini", settings.qr_login_type);
        assert_eq!(1, settings.wechat.official.len());
        assert_eq!("oa-main", settings.wechat.official[0].key);
        assert_eq!("gh_123456", settings.wechat.official[0].original_id);
        assert_eq!(1, settings.wechat.mini.len());
        assert_eq!("mini-main", settings.wechat.mini[0].key);
        assert_eq!("pages/auth/login", settings.wechat.mini[0].path);
        assert_eq!("trial", settings.wechat.mini[0].env);
    }
}
