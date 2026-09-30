use std::collections::BTreeMap;
use std::future::Future;
use std::pin::Pin;

use sdkwork_cloudrouter_http::normalize_locale_tag;
use serde_json::{json, Value};

use crate::domain::DomainResult;

/// Locale-keyed overrides for the user-visible copy fields, keyed by canonical BCP 47 tag.
///
/// Mirrors the established runtime-config convention
/// (`ai_upstream_account_group.group_name_i18n`): the base field stays the required,
/// always-present value and this map only overrides it per locale. A locale with no entry,
/// or with a blank override, resolves to the base field — so clearing an override can never
/// blank the published copy.
///
/// Only the seven canonical SDKWork locales are addressable. Aliases are rejected rather
/// than folded: `normalize_locale_tag` collapses `zh-HK` onto `zh-CN`, which for an override
/// map would silently overwrite one language's copy with another's.
pub type SiteSettingsI18n = BTreeMap<String, String>;

/// Returns the canonical locale tag for an override key, or `None` when the key is not a
/// supported canonical tag.
pub fn canonical_site_settings_locale(tag: &str) -> Option<String> {
    let normalized = normalize_locale_tag(tag)?;
    (normalized == tag.trim()).then_some(normalized)
}

/// Drops every unusable entry from an override map.
///
/// Used on both the read and the write path: the read path must survive a payload written
/// by an older build, and the write path normalizes whatever the operator's form sent.
fn normalize_i18n_map(map: &mut SiteSettingsI18n) {
    let mut normalized = SiteSettingsI18n::new();
    for (tag, value) in std::mem::take(map) {
        let Some(tag) = canonical_site_settings_locale(&tag) else {
            continue;
        };
        let value = value.trim();
        if value.is_empty() {
            continue;
        }
        normalized.insert(tag, value.to_owned());
    }
    *map = normalized;
}

/// Names every override key that is not a supported canonical locale tag.
///
/// The write path rejects a map containing one of these rather than dropping the offending
/// entry, so an operator never watches a save succeed while the copy they typed never renders.
/// Returning the keys rather than a bare flag is what lets the rejection name them.
pub fn unsupported_site_settings_locale_keys(map: &SiteSettingsI18n) -> Vec<&str> {
    map.keys()
        .filter(|tag| canonical_site_settings_locale(tag).is_none())
        .map(String::as_str)
        .collect()
}

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
    pub site_name_i18n: SiteSettingsI18n,
    pub short_name: String,
    pub short_name_i18n: SiteSettingsI18n,
    pub description: String,
    pub description_i18n: SiteSettingsI18n,
    pub logo: Value,
    pub icon: Value,
    pub favicon: Value,
    pub official_account_qr_code: Value,
    pub community_group_qr_code: Value,
    pub video_channel_qr_code: Value,
    pub douyin_qr_code: Value,

    // Per-channel visibility for the footer QR block. All four default to visible so a
    // deployment that never opens the admin page keeps every channel it rendered before.
    pub official_account_qr_code_enabled: bool,
    pub community_group_qr_code_enabled: bool,
    pub video_channel_qr_code_enabled: bool,
    pub douyin_qr_code_enabled: bool,
    pub brand_color: String,
    pub accent_color: String,
    pub footer_copyright: String,
    pub footer_copyright_i18n: SiteSettingsI18n,
    pub icp_record_number: String,
    pub icp_record_url: String,
    pub police_record_number: String,
    pub police_record_url: String,
    pub seo_title: String,
    pub seo_title_i18n: SiteSettingsI18n,
    pub seo_description: String,
    pub seo_description_i18n: SiteSettingsI18n,
    pub support_url: String,
    pub docs_url: String,
    pub privacy_url: String,
    pub terms_url: String,
    pub custom_css: String,

    // --- Footer composition (added with the configurable follow-us row) ---------------
    // Section visibility toggles. Every one defaults to `true`: a deployment that never
    // touches them keeps exactly the footer it had before these fields existed.
    pub footer_brand_enabled: bool,
    pub footer_newsletter_enabled: bool,
    pub footer_product_links_enabled: bool,
    pub footer_resource_links_enabled: bool,
    pub footer_company_links_enabled: bool,
    pub footer_qr_codes_enabled: bool,
    pub footer_social_enabled: bool,
    pub footer_legal_enabled: bool,
    pub footer_social_github_enabled: bool,
    pub footer_social_github_url: String,
    pub footer_social_twitter_enabled: bool,
    pub footer_social_twitter_url: String,
    pub footer_social_linkedin_enabled: bool,
    pub footer_social_linkedin_url: String,
    pub footer_social_youtube_enabled: bool,
    pub footer_social_youtube_url: String,
    pub footer_social_weibo_enabled: bool,
    pub footer_social_weibo_url: String,
    pub footer_social_xiaohongshu_enabled: bool,
    pub footer_social_xiaohongshu_url: String,
    pub footer_social_bilibili_enabled: bool,
    pub footer_social_bilibili_url: String,
    pub footer_social_douyin_enabled: bool,
    pub footer_social_douyin_url: String,
    pub footer_social_zhihu_enabled: bool,
    pub footer_social_zhihu_url: String,
    pub footer_social_telegram_enabled: bool,
    pub footer_social_telegram_url: String,
    pub footer_social_discord_enabled: bool,
    pub footer_social_discord_url: String,
    pub footer_social_email_enabled: bool,
    pub footer_social_email_url: String,

    // --- Console-authored content documents (homepage copy + download catalog) ---------
    // Both are free-form operator documents whose shape is owned by the consuming package
    // (`sdkwork-cloudrouter-pc-home`), not by this struct: the homepage contract is a
    // deep tree of headline/feature/section overrides, and the download contract is a
    // product/card/artifact tree that gains platforms over time. Modelling either as a
    // Rust struct here would mean a service release for every field the portal adds, so
    // they are carried verbatim as JSON — the same treatment `logo` and the QR codes get.
    //
    // The empty object is the "operator has not authored anything" signal, and it is
    // deliberately not `null`: the portal reads these through a record reader that maps
    // anything non-object to `{}`, so both spellings behave identically, and `{}` keeps
    // the stored payload self-describing for anyone reading the JSONB column directly.
    pub homepage: Value,
    pub downloads: Value,
}

impl Default for SiteSettings {
    fn default() -> Self {
        Self {
            site_name: "Cloud Router".to_owned(),
            site_name_i18n: SiteSettingsI18n::new(),
            short_name: "Cloud Router".to_owned(),
            short_name_i18n: SiteSettingsI18n::new(),
            description: "Unified AI gateway and model routing platform.".to_owned(),
            description_i18n: SiteSettingsI18n::new(),
            logo: empty_media_resource("image"),
            icon: empty_media_resource("image"),
            favicon: empty_media_resource("image"),
            official_account_qr_code: empty_media_resource("image"),
            community_group_qr_code: empty_media_resource("image"),
            video_channel_qr_code: empty_media_resource("image"),
            douyin_qr_code: empty_media_resource("image"),
            official_account_qr_code_enabled: true,
            community_group_qr_code_enabled: true,
            video_channel_qr_code_enabled: true,
            douyin_qr_code_enabled: true,
            brand_color: "#0f172a".to_owned(),
            accent_color: "#e9583f".to_owned(),
            footer_copyright: "Cloud Router. All rights reserved.".to_owned(),
            footer_copyright_i18n: SiteSettingsI18n::new(),
            icp_record_number: DEFAULT_ICP_RECORD_NUMBER.to_owned(),
            icp_record_url: DEFAULT_ICP_RECORD_URL.to_owned(),
            police_record_number: DEFAULT_POLICE_RECORD_NUMBER.to_owned(),
            police_record_url: DEFAULT_POLICE_RECORD_URL.to_owned(),
            seo_title: "Cloud Router".to_owned(),
            seo_title_i18n: SiteSettingsI18n::new(),
            seo_description: "Unified AI gateway and model routing platform.".to_owned(),
            seo_description_i18n: SiteSettingsI18n::new(),
            support_url: String::new(),
            docs_url: "/docs".to_owned(),
            privacy_url: "/privacy".to_owned(),
            terms_url: "/terms".to_owned(),
            custom_css: String::new(),
            footer_brand_enabled: true,
            footer_newsletter_enabled: true,
            footer_product_links_enabled: true,
            footer_resource_links_enabled: true,
            footer_company_links_enabled: true,
            footer_qr_codes_enabled: true,
            footer_social_enabled: true,
            footer_legal_enabled: true,
            footer_social_github_enabled: true,
            footer_social_github_url: "https://github.com/sdkwork-ai".to_owned(),
            footer_social_twitter_enabled: true,
            footer_social_twitter_url: "https://twitter.com".to_owned(),
            footer_social_linkedin_enabled: true,
            footer_social_linkedin_url: "https://linkedin.com".to_owned(),
            footer_social_youtube_enabled: false,
            footer_social_youtube_url: "".to_owned(),
            footer_social_weibo_enabled: false,
            footer_social_weibo_url: "".to_owned(),
            footer_social_xiaohongshu_enabled: false,
            footer_social_xiaohongshu_url: "".to_owned(),
            footer_social_bilibili_enabled: false,
            footer_social_bilibili_url: "".to_owned(),
            footer_social_douyin_enabled: false,
            footer_social_douyin_url: "".to_owned(),
            footer_social_zhihu_enabled: false,
            footer_social_zhihu_url: "".to_owned(),
            footer_social_telegram_enabled: false,
            footer_social_telegram_url: "".to_owned(),
            footer_social_discord_enabled: false,
            footer_social_discord_url: "".to_owned(),
            footer_social_email_enabled: true,
            footer_social_email_url: "mailto:contact@sdkwork.com".to_owned(),
            // "Nothing has been authored yet": the portal falls back to its built-in copy and
            // to the release catalog checked into the repository.
            homepage: json!({}),
            downloads: json!({}),
        }
    }
}

impl SiteSettings {
    pub fn normalized(mut self) -> Self {
        normalize_i18n_map(&mut self.site_name_i18n);
        normalize_required_string(&mut self.site_name, "Cloud Router");
        normalize_i18n_map(&mut self.short_name_i18n);
        normalize_required_string(&mut self.short_name, &self.site_name);
        normalize_i18n_map(&mut self.description_i18n);
        normalize_optional_string(&mut self.description);
        normalize_media_resource(&mut self.logo, "image");
        normalize_media_resource(&mut self.icon, "image");
        normalize_media_resource(&mut self.favicon, "image");
        normalize_media_resource(&mut self.official_account_qr_code, "image");
        normalize_media_resource(&mut self.community_group_qr_code, "image");
        normalize_media_resource(&mut self.video_channel_qr_code, "image");
        normalize_media_resource(&mut self.douyin_qr_code, "image");
        normalize_color(&mut self.brand_color, "#0f172a");
        normalize_color(&mut self.accent_color, "#e9583f");
        normalize_i18n_map(&mut self.footer_copyright_i18n);
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
        normalize_i18n_map(&mut self.seo_title_i18n);
        normalize_required_string(&mut self.seo_title, &self.site_name);
        normalize_i18n_map(&mut self.seo_description_i18n);
        normalize_optional_string(&mut self.seo_description);
        if self.seo_description.is_empty() {
            self.seo_description = self.description.clone();
        }
        normalize_optional_string(&mut self.support_url);
        normalize_optional_string(&mut self.docs_url);
        normalize_optional_string(&mut self.privacy_url);
        normalize_optional_string(&mut self.terms_url);
        normalize_optional_string(&mut self.custom_css);
        normalize_optional_string(&mut self.footer_social_github_url);
        normalize_optional_string(&mut self.footer_social_twitter_url);
        normalize_optional_string(&mut self.footer_social_linkedin_url);
        normalize_optional_string(&mut self.footer_social_youtube_url);
        normalize_optional_string(&mut self.footer_social_weibo_url);
        normalize_optional_string(&mut self.footer_social_xiaohongshu_url);
        normalize_optional_string(&mut self.footer_social_bilibili_url);
        normalize_optional_string(&mut self.footer_social_douyin_url);
        normalize_optional_string(&mut self.footer_social_zhihu_url);
        normalize_optional_string(&mut self.footer_social_telegram_url);
        normalize_optional_string(&mut self.footer_social_discord_url);
        normalize_optional_string(&mut self.footer_social_email_url);
        self
    }

    /// Resolves the published copy for an end user's locale.
    ///
    /// A copy field keeps its base value unless the locale carries a non-blank override,
    /// which is what keeps a deployment that never opened `/admin/site` rendering exactly
    /// the copy it shipped with. Locale negotiation already picked the effective tag
    /// (`I18N_SPEC.md` §2); this only applies it, so the reported map is left untouched and
    /// the admin surface still sees every translation.
    pub fn localized_for(mut self, locale: Option<&str>) -> Self {
        let Some(locale) = locale.and_then(canonical_site_settings_locale) else {
            return self;
        };
        apply_i18n_override(&mut self.site_name, &self.site_name_i18n, &locale);
        apply_i18n_override(&mut self.short_name, &self.short_name_i18n, &locale);
        apply_i18n_override(&mut self.description, &self.description_i18n, &locale);
        apply_i18n_override(&mut self.seo_title, &self.seo_title_i18n, &locale);
        apply_i18n_override(
            &mut self.seo_description,
            &self.seo_description_i18n,
            &locale,
        );
        apply_i18n_override(
            &mut self.footer_copyright,
            &self.footer_copyright_i18n,
            &locale,
        );
        self
    }
}

fn apply_i18n_override(target: &mut String, map: &SiteSettingsI18n, locale: &str) {
    let Some(value) = map.get(locale) else {
        return;
    };
    let value = value.trim();
    if value.is_empty() {
        return;
    }
    *target = value.to_owned();
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

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::{
        canonical_site_settings_locale, unsupported_site_settings_locale_keys, SiteSettings,
        SiteSettingsI18n,
    };

    fn overrides(entries: &[(&str, &str)]) -> SiteSettingsI18n {
        entries
            .iter()
            .map(|(tag, text)| ((*tag).to_owned(), (*text).to_owned()))
            .collect::<BTreeMap<String, String>>()
    }

    /// The override is what a reader in that language sees; the base is what everyone else sees.
    #[test]
    fn localized_for_replaces_the_base_copy_in_the_requested_language() {
        let settings = SiteSettings {
            site_name: "Cloud Router".to_owned(),
            site_name_i18n: overrides(&[("zh-CN", "云路由")]),
            footer_copyright_i18n: overrides(&[("zh-CN", "云路由 版权所有")]),
            ..SiteSettings::default()
        };
        let base_footer = settings.footer_copyright.clone();

        let zh = settings.clone().localized_for(Some("zh-CN"));
        assert_eq!("云路由", zh.site_name);
        assert_eq!("云路由 版权所有", zh.footer_copyright);
        // The override layer is untouched: the response still carries every language.
        assert_eq!(
            zh.site_name_i18n.get("zh-CN").map(String::as_str),
            Some("云路由")
        );

        let de = settings.localized_for(Some("de-DE"));
        assert_eq!("Cloud Router", de.site_name);
        assert_eq!(base_footer, de.footer_copyright);
    }

    /// A locale with no entry, a blank entry and an absent locale all publish the base copy —
    /// that is what makes "clearing a translation" a safe operation.
    #[test]
    fn localized_for_falls_back_to_the_base_copy_for_missing_or_blank_entries() {
        let settings = SiteSettings {
            site_name: "Cloud Router".to_owned(),
            site_name_i18n: overrides(&[("zh-CN", "云路由"), ("ja-JP", "   ")]),
            ..SiteSettings::default()
        };

        for locale in [None, Some("ja-JP"), Some("fr-FR"), Some("")] {
            assert_eq!(
                "Cloud Router",
                settings.clone().localized_for(locale).site_name,
                "locale {locale:?} must fall back to the base copy"
            );
        }
    }

    /// An alias must not be folded onto a canonical tag: `normalize_locale_tag` maps `zh-HK`
    /// onto `zh-CN`, which would publish Simplified Chinese copy to a Traditional reader.
    #[test]
    fn only_canonical_locale_tags_address_an_override() {
        assert_eq!(
            Some("zh-CN".to_owned()),
            canonical_site_settings_locale("zh-CN")
        );
        assert_eq!(
            Some("en-US".to_owned()),
            canonical_site_settings_locale(" en-US ")
        );

        for alias in ["zh", "zh-HK", "en", "ja", "EN-us", "th-TH", ""] {
            assert_eq!(
                None,
                canonical_site_settings_locale(alias),
                "{alias:?} must not address an override"
            );
        }
    }

    /// The write path rejects rather than drops, so an operator never saves copy that no locale
    /// can resolve — a silent drop would look like a successful save that changed nothing.
    #[test]
    fn unsupported_keys_are_reported_by_name() {
        assert!(unsupported_site_settings_locale_keys(&SiteSettingsI18n::new()).is_empty());
        assert!(unsupported_site_settings_locale_keys(&overrides(&[
            ("en-US", "Cloud Router"),
            ("zh-CN", "云路由"),
        ]))
        .is_empty());

        // An alias rather than a canonical tag: `zh-HK` would be folded onto `zh-CN` by
        // `normalize_locale_tag`, which for an override map means overwriting another language.
        assert_eq!(
            vec!["zh-HK"],
            unsupported_site_settings_locale_keys(&overrides(&[("zh-HK", "雲路由")]))
        );
        assert_eq!(
            vec!["en"],
            unsupported_site_settings_locale_keys(&overrides(&[
                ("en-US", "Cloud Router"),
                ("en", "Cloud Router"),
            ]))
        );
    }
}
