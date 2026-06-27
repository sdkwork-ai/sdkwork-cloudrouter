use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AdminAuthSettingsFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminAuthSettingsSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminAuthVerificationPolicy {
    pub email_code_login_enabled: bool,
    pub email_registration_verification_required: bool,
    pub phone_code_login_enabled: bool,
    pub phone_registration_verification_required: bool,
}

impl Default for AdminAuthVerificationPolicy {
    fn default() -> Self {
        Self {
            email_code_login_enabled: false,
            email_registration_verification_required: false,
            phone_code_login_enabled: false,
            phone_registration_verification_required: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminAuthWechatOfficial {
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminAuthWechatMini {
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

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct AdminAuthWechatSettings {
    pub official: Vec<AdminAuthWechatOfficial>,
    pub mini: Vec<AdminAuthWechatMini>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminAuthSettings {
    pub left_rail_mode: String,
    pub login_methods: Vec<String>,
    pub oauth_login_enabled: bool,
    pub oauth_providers: Vec<String>,
    pub oauth_region: String,
    pub qr_login_enabled: bool,
    pub qr_login_type: String,
    pub recovery_methods: Vec<String>,
    pub register_methods: Vec<String>,
    pub verification_policy: AdminAuthVerificationPolicy,
    pub wechat: AdminAuthWechatSettings,
}

impl Default for AdminAuthSettings {
    fn default() -> Self {
        Self {
            left_rail_mode: "highlights-only".to_owned(),
            login_methods: vec!["password".to_owned()],
            oauth_login_enabled: false,
            oauth_providers: Vec::new(),
            oauth_region: "mainland".to_owned(),
            qr_login_enabled: true,
            qr_login_type: "web".to_owned(),
            recovery_methods: vec!["email".to_owned(), "phone".to_owned()],
            register_methods: vec!["email".to_owned(), "phone".to_owned()],
            verification_policy: AdminAuthVerificationPolicy::default(),
            wechat: AdminAuthWechatSettings::default(),
        }
    }
}

impl AdminAuthSettings {
    pub fn normalized(mut self) -> Self {
        if !matches!(
            self.left_rail_mode.as_str(),
            "auto" | "highlights-only" | "qr-only"
        ) {
            self.left_rail_mode = "highlights-only".to_owned();
        }
        if !matches!(self.oauth_region.as_str(), "mainland" | "overseas") {
            self.oauth_region = "mainland".to_owned();
        }
        self.qr_login_type = normalize_qr_login_type(&self.qr_login_type);
        normalize_wechat_settings(&mut self.wechat);

        sync_login_method(
            &mut self.login_methods,
            "emailCode",
            self.verification_policy.email_code_login_enabled,
        );
        sync_login_method(
            &mut self.login_methods,
            "phoneCode",
            self.verification_policy.phone_code_login_enabled,
        );
        self.login_methods = ordered_values(
            &self.login_methods,
            &["password", "emailCode", "phoneCode", "sessionBridge"],
        );
        if self.login_methods.is_empty() {
            self.login_methods.push("password".to_owned());
        }

        self.recovery_methods = ordered_values(&self.recovery_methods, &["email", "phone"]);
        if self.recovery_methods.is_empty() {
            self.recovery_methods = vec!["email".to_owned(), "phone".to_owned()];
        }
        self.register_methods = ordered_values(&self.register_methods, &["email", "phone"]);
        if self.register_methods.is_empty() {
            self.register_methods = vec!["email".to_owned(), "phone".to_owned()];
        }

        if !self.qr_login_enabled && self.left_rail_mode == "qr-only" {
            self.left_rail_mode = "highlights-only".to_owned();
        }

        self
    }
}

fn normalize_qr_login_type(value: &str) -> String {
    match value.trim() {
        "official" | "wechat_official_account" | "official_account" | "wechat-official" => {
            "official".to_owned()
        }
        "mini" | "wechat_mini_program" | "miniapp" | "wechat-mini-program" => "mini".to_owned(),
        "web" | "sdkwork_app" | "sdkwork-app" | "mobile_app" | "" => "web".to_owned(),
        _ => "web".to_owned(),
    }
}

fn normalize_wechat_settings(settings: &mut AdminAuthWechatSettings) {
    normalize_wechat_official_entries(&mut settings.official);
    normalize_wechat_mini_entries(&mut settings.mini);
}

fn normalize_wechat_official_entries(entries: &mut Vec<AdminAuthWechatOfficial>) {
    entries.retain(|entry| {
        !entry.key.trim().is_empty()
            && !entry.name.trim().is_empty()
            && !entry.app_id.trim().is_empty()
            && !entry.secret_ref.trim().is_empty()
            && !entry.token_ref.trim().is_empty()
    });
    let mut has_primary = false;
    for entry in entries {
        entry.key = compact_ascii(&entry.key, 64);
        entry.name = compact_text(&entry.name, 64);
        entry.app_id = compact_ascii(&entry.app_id, 64);
        entry.original_id = compact_ascii(&entry.original_id, 64);
        entry.secret_ref = compact_ascii(&entry.secret_ref, 256);
        entry.token_ref = compact_ascii(&entry.token_ref, 256);
        entry.aes_key_ref = compact_ascii(&entry.aes_key_ref, 256);
        entry.url = compact_ascii(&entry.url, 2048);
        entry.scene = compact_ascii(&entry.scene, 64);
        if !entry.enabled {
            entry.primary = false;
        } else if entry.primary && !has_primary {
            has_primary = true;
        } else {
            entry.primary = false;
        }
    }
}

fn normalize_wechat_mini_entries(entries: &mut Vec<AdminAuthWechatMini>) {
    entries.retain(|entry| {
        !entry.key.trim().is_empty()
            && !entry.name.trim().is_empty()
            && !entry.app_id.trim().is_empty()
            && !entry.secret_ref.trim().is_empty()
            && !entry.path.trim().is_empty()
    });
    let mut has_primary = false;
    for entry in entries {
        entry.key = compact_ascii(&entry.key, 64);
        entry.name = compact_text(&entry.name, 64);
        entry.app_id = compact_ascii(&entry.app_id, 64);
        entry.secret_ref = compact_ascii(&entry.secret_ref, 256);
        entry.url = compact_ascii(&entry.url, 2048);
        entry.path = normalize_mini_path_for_snapshot(&entry.path);
        entry.env = match entry.env.trim() {
            "trial" => "trial".to_owned(),
            "develop" => "develop".to_owned(),
            _ => "release".to_owned(),
        };
        if !entry.enabled {
            entry.primary = false;
        } else if entry.primary && !has_primary {
            has_primary = true;
        } else {
            entry.primary = false;
        }
    }
}

fn compact_ascii(value: &str, max_len: usize) -> String {
    value
        .trim()
        .chars()
        .filter(|ch| ch.is_ascii() && !ch.is_ascii_control())
        .take(max_len)
        .collect()
}

fn compact_text(value: &str, max_len: usize) -> String {
    value.trim().chars().take(max_len).collect()
}

fn normalize_mini_path_for_snapshot(value: &str) -> String {
    let value = value.trim().trim_start_matches('/');
    value
        .split(['?', '#'])
        .next()
        .unwrap_or_default()
        .chars()
        .filter(|ch| ch.is_ascii() && !ch.is_ascii_control())
        .take(128)
        .collect()
}

fn sync_login_method(methods: &mut Vec<String>, method: &str, enabled: bool) {
    if enabled {
        if !methods.iter().any(|item| item == method) {
            methods.push(method.to_owned());
        }
    } else {
        methods.retain(|item| item != method);
    }
}

fn ordered_values(values: &[String], allowed: &[&str]) -> Vec<String> {
    allowed
        .iter()
        .filter(|allowed_value| values.iter().any(|value| value == *allowed_value))
        .map(|value| (*value).to_owned())
        .collect()
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GetAdminAuthSettingsQuery {
    pub subject: AdminAuthSettingsSubject,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GetAdminAuthSettingsScopeQuery {
    pub tenant_code: Option<String>,
    pub organization_code: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminAuthSettingsCommand {
    pub subject: AdminAuthSettingsSubject,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub settings: AdminAuthSettings,
    pub request_id: String,
    pub requested_at: String,
}

pub trait AdminAuthSettingsStore {
    fn get_auth_settings<'a>(
        &'a self,
        query: GetAdminAuthSettingsQuery,
    ) -> AdminAuthSettingsFuture<'a, AdminAuthSettings>;

    fn get_auth_settings_for_scope<'a>(
        &'a self,
        query: GetAdminAuthSettingsScopeQuery,
    ) -> AdminAuthSettingsFuture<'a, AdminAuthSettings>;

    fn update_auth_settings<'a>(
        &'a self,
        command: UpdateAdminAuthSettingsCommand,
    ) -> AdminAuthSettingsFuture<'a, AdminAuthSettings>;
}
