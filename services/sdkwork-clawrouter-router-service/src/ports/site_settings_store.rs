use std::future::Future;
use std::pin::Pin;

use serde_json::{json, Value};

use crate::domain::DomainResult;

const DEFAULT_ICP_RECORD_NUMBER: &str = "京ICP备2026000000号-1";
const DEFAULT_ICP_RECORD_URL: &str = "https://beian.miit.gov.cn/";
const DEFAULT_POLICE_RECORD_NUMBER: &str = "京公网安备11010502000000号";
const DEFAULT_POLICE_RECORD_URL: &str =
    "https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=11010502000000";

pub type SiteSettingsFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SiteSettingsSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SiteSettings {
    pub site_name: String,
    pub short_name: String,
    pub description: String,
    pub logo: Value,
    pub icon: Value,
    pub favicon: Value,
    pub brand_color: String,
    pub accent_color: String,
    pub footer_copyright: String,
    pub icp_record_number: String,
    pub icp_record_url: String,
    pub police_record_number: String,
    pub police_record_url: String,
    pub seo_title: String,
    pub seo_description: String,
    pub support_url: String,
    pub docs_url: String,
    pub privacy_url: String,
    pub terms_url: String,
    pub custom_css: String,
}

impl Default for SiteSettings {
    fn default() -> Self {
        Self {
            site_name: "Claw Router".to_owned(),
            short_name: "Claw Router".to_owned(),
            description: "Unified AI gateway and model routing platform.".to_owned(),
            logo: empty_media_resource("image"),
            icon: empty_media_resource("image"),
            favicon: empty_media_resource("image"),
            brand_color: "#0f172a".to_owned(),
            accent_color: "#e9583f".to_owned(),
            footer_copyright: "Claw Router. All rights reserved.".to_owned(),
            icp_record_number: DEFAULT_ICP_RECORD_NUMBER.to_owned(),
            icp_record_url: DEFAULT_ICP_RECORD_URL.to_owned(),
            police_record_number: DEFAULT_POLICE_RECORD_NUMBER.to_owned(),
            police_record_url: DEFAULT_POLICE_RECORD_URL.to_owned(),
            seo_title: "Claw Router".to_owned(),
            seo_description: "Unified AI gateway and model routing platform.".to_owned(),
            support_url: String::new(),
            docs_url: "/docs".to_owned(),
            privacy_url: "/privacy".to_owned(),
            terms_url: "/terms".to_owned(),
            custom_css: String::new(),
        }
    }
}

impl SiteSettings {
    pub fn normalized(mut self) -> Self {
        normalize_required_string(&mut self.site_name, "Claw Router");
        normalize_required_string(&mut self.short_name, &self.site_name);
        normalize_optional_string(&mut self.description);
        normalize_media_resource(&mut self.logo, "image");
        normalize_media_resource(&mut self.icon, "image");
        normalize_media_resource(&mut self.favicon, "image");
        normalize_color(&mut self.brand_color, "#0f172a");
        normalize_color(&mut self.accent_color, "#e9583f");
        normalize_optional_string(&mut self.footer_copyright);
        if self.footer_copyright.is_empty() {
            self.footer_copyright = format!("{}. All rights reserved.", self.site_name);
        }
        normalize_optional_string(&mut self.icp_record_number);
        normalize_optional_string(&mut self.icp_record_url);
        normalize_optional_string(&mut self.police_record_number);
        normalize_optional_string(&mut self.police_record_url);
        if self.icp_record_number.is_empty() {
            self.icp_record_number = DEFAULT_ICP_RECORD_NUMBER.to_owned();
        }
        if self.icp_record_url.is_empty() {
            self.icp_record_url = DEFAULT_ICP_RECORD_URL.to_owned();
        }
        if self.police_record_number.is_empty() {
            self.police_record_number = DEFAULT_POLICE_RECORD_NUMBER.to_owned();
        }
        if self.police_record_url.is_empty() {
            self.police_record_url = DEFAULT_POLICE_RECORD_URL.to_owned();
        }
        normalize_required_string(&mut self.seo_title, &self.site_name);
        normalize_optional_string(&mut self.seo_description);
        if self.seo_description.is_empty() {
            self.seo_description = self.description.clone();
        }
        normalize_optional_string(&mut self.support_url);
        normalize_optional_string(&mut self.docs_url);
        normalize_optional_string(&mut self.privacy_url);
        normalize_optional_string(&mut self.terms_url);
        normalize_optional_string(&mut self.custom_css);
        self
    }
}

fn normalize_required_string(value: &mut String, fallback: &str) {
    normalize_optional_string(value);
    if value.is_empty() {
        *value = fallback.to_owned();
    }
}

fn normalize_optional_string(value: &mut String) {
    *value = value.trim().to_owned();
}

fn normalize_color(value: &mut String, fallback: &str) {
    normalize_optional_string(value);
    if !is_hex_color(value) {
        *value = fallback.to_owned();
    }
}

fn is_hex_color(value: &str) -> bool {
    let bytes = value.as_bytes();
    if !(bytes.len() == 4 || bytes.len() == 7) || bytes.first() != Some(&b'#') {
        return false;
    }
    bytes[1..].iter().all(u8::is_ascii_hexdigit)
}

fn normalize_media_resource(value: &mut Value, fallback_kind: &str) {
    let Some(object) = value.as_object_mut() else {
        *value = empty_media_resource(fallback_kind);
        return;
    };
    let kind = object
        .get("kind")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback_kind)
        .to_owned();
    let source = object
        .get("source")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("external_url")
        .to_owned();
    object.insert("kind".to_owned(), Value::String(kind));
    object.insert("source".to_owned(), Value::String(source));
}

fn empty_media_resource(kind: &str) -> Value {
    json!({
        "kind": kind,
        "source": "external_url"
    })
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GetSiteSettingsQuery {
    pub subject: SiteSettingsSubject,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GetSiteSettingsScopeQuery {
    pub tenant_code: Option<String>,
    pub organization_code: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateSiteSettingsCommand {
    pub subject: SiteSettingsSubject,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub settings: SiteSettings,
    pub request_id: String,
    pub requested_at: String,
}

pub trait SiteSettingsStore {
    fn get_site_settings<'a>(
        &'a self,
        query: GetSiteSettingsQuery,
    ) -> SiteSettingsFuture<'a, SiteSettings>;

    fn get_site_settings_for_scope<'a>(
        &'a self,
        query: GetSiteSettingsScopeQuery,
    ) -> SiteSettingsFuture<'a, SiteSettings>;

    fn update_site_settings<'a>(
        &'a self,
        command: UpdateSiteSettingsCommand,
    ) -> SiteSettingsFuture<'a, SiteSettings>;
}
