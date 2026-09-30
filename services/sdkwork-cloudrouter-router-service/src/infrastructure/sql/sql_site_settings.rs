use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::domain::{DomainError, DomainResult};
use crate::ports::{SiteSettings, SiteSettingsI18n};

pub(crate) const SITE_SETTINGS_SOURCE_TABLE: &str = "ops_site_runtime_settings";
pub(crate) const SITE_SETTINGS_AUDIT_TARGET_TYPE: i32 = 66;
pub(crate) const CONFIG_SCOPE_SITE: i32 = 40;
pub(crate) const CONFIG_TYPE_SITE_SETTINGS: i32 = SITE_SETTINGS_AUDIT_TARGET_TYPE;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub(crate) struct StoredSiteSettings {
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
    /// Operator-authored homepage document. Reproduced verbatim from the JSONB payload so a
    /// portal-only field never has to round-trip through a service release.
    pub homepage: Value,
    /// Operator-authored download catalog. Same verbatim treatment as `homepage`.
    pub downloads: Value,
}

impl Default for StoredSiteSettings {
    fn default() -> Self {
        SiteSettings::default().into()
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredSiteSettingsEnvelope {
    action: Option<String>,
    settings: StoredSiteSettings,
}

impl From<SiteSettings> for StoredSiteSettings {
    fn from(value: SiteSettings) -> Self {
        Self {
            site_name: value.site_name,
            site_name_i18n: value.site_name_i18n,
            short_name: value.short_name,
            short_name_i18n: value.short_name_i18n,
            description: value.description,
            description_i18n: value.description_i18n,
            logo: value.logo,
            icon: value.icon,
            favicon: value.favicon,
            official_account_qr_code: value.official_account_qr_code,
            community_group_qr_code: value.community_group_qr_code,
            video_channel_qr_code: value.video_channel_qr_code,
            douyin_qr_code: value.douyin_qr_code,
            official_account_qr_code_enabled: value.official_account_qr_code_enabled,
            community_group_qr_code_enabled: value.community_group_qr_code_enabled,
            video_channel_qr_code_enabled: value.video_channel_qr_code_enabled,
            douyin_qr_code_enabled: value.douyin_qr_code_enabled,
            brand_color: value.brand_color,
            accent_color: value.accent_color,
            footer_copyright: value.footer_copyright,
            footer_copyright_i18n: value.footer_copyright_i18n,
            icp_record_number: value.icp_record_number,
            icp_record_url: value.icp_record_url,
            police_record_number: value.police_record_number,
            police_record_url: value.police_record_url,
            seo_title: value.seo_title,
            seo_title_i18n: value.seo_title_i18n,
            seo_description: value.seo_description,
            seo_description_i18n: value.seo_description_i18n,
            support_url: value.support_url,
            docs_url: value.docs_url,
            privacy_url: value.privacy_url,
            terms_url: value.terms_url,
            custom_css: value.custom_css,
            footer_brand_enabled: value.footer_brand_enabled,
            footer_newsletter_enabled: value.footer_newsletter_enabled,
            footer_product_links_enabled: value.footer_product_links_enabled,
            footer_resource_links_enabled: value.footer_resource_links_enabled,
            footer_company_links_enabled: value.footer_company_links_enabled,
            footer_qr_codes_enabled: value.footer_qr_codes_enabled,
            footer_social_enabled: value.footer_social_enabled,
            footer_legal_enabled: value.footer_legal_enabled,
            footer_social_github_enabled: value.footer_social_github_enabled,
            footer_social_github_url: value.footer_social_github_url,
            footer_social_twitter_enabled: value.footer_social_twitter_enabled,
            footer_social_twitter_url: value.footer_social_twitter_url,
            footer_social_linkedin_enabled: value.footer_social_linkedin_enabled,
            footer_social_linkedin_url: value.footer_social_linkedin_url,
            footer_social_youtube_enabled: value.footer_social_youtube_enabled,
            footer_social_youtube_url: value.footer_social_youtube_url,
            footer_social_weibo_enabled: value.footer_social_weibo_enabled,
            footer_social_weibo_url: value.footer_social_weibo_url,
            footer_social_xiaohongshu_enabled: value.footer_social_xiaohongshu_enabled,
            footer_social_xiaohongshu_url: value.footer_social_xiaohongshu_url,
            footer_social_bilibili_enabled: value.footer_social_bilibili_enabled,
            footer_social_bilibili_url: value.footer_social_bilibili_url,
            footer_social_douyin_enabled: value.footer_social_douyin_enabled,
            footer_social_douyin_url: value.footer_social_douyin_url,
            footer_social_zhihu_enabled: value.footer_social_zhihu_enabled,
            footer_social_zhihu_url: value.footer_social_zhihu_url,
            footer_social_telegram_enabled: value.footer_social_telegram_enabled,
            footer_social_telegram_url: value.footer_social_telegram_url,
            footer_social_discord_enabled: value.footer_social_discord_enabled,
            footer_social_discord_url: value.footer_social_discord_url,
            footer_social_email_enabled: value.footer_social_email_enabled,
            footer_social_email_url: value.footer_social_email_url,
            homepage: value.homepage,
            downloads: value.downloads,
        }
    }
}

impl From<StoredSiteSettings> for SiteSettings {
    fn from(value: StoredSiteSettings) -> Self {
        Self {
            site_name: value.site_name,
            site_name_i18n: value.site_name_i18n,
            short_name: value.short_name,
            short_name_i18n: value.short_name_i18n,
            description: value.description,
            description_i18n: value.description_i18n,
            logo: value.logo,
            icon: value.icon,
            favicon: value.favicon,
            official_account_qr_code: value.official_account_qr_code,
            community_group_qr_code: value.community_group_qr_code,
            video_channel_qr_code: value.video_channel_qr_code,
            douyin_qr_code: value.douyin_qr_code,
            official_account_qr_code_enabled: value.official_account_qr_code_enabled,
            community_group_qr_code_enabled: value.community_group_qr_code_enabled,
            video_channel_qr_code_enabled: value.video_channel_qr_code_enabled,
            douyin_qr_code_enabled: value.douyin_qr_code_enabled,
            brand_color: value.brand_color,
            accent_color: value.accent_color,
            footer_copyright: value.footer_copyright,
            footer_copyright_i18n: value.footer_copyright_i18n,
            icp_record_number: value.icp_record_number,
            icp_record_url: value.icp_record_url,
            police_record_number: value.police_record_number,
            police_record_url: value.police_record_url,
            seo_title: value.seo_title,
            seo_title_i18n: value.seo_title_i18n,
            seo_description: value.seo_description,
            seo_description_i18n: value.seo_description_i18n,
            support_url: value.support_url,
            docs_url: value.docs_url,
            privacy_url: value.privacy_url,
            terms_url: value.terms_url,
            custom_css: value.custom_css,
            footer_brand_enabled: value.footer_brand_enabled,
            footer_newsletter_enabled: value.footer_newsletter_enabled,
            footer_product_links_enabled: value.footer_product_links_enabled,
            footer_resource_links_enabled: value.footer_resource_links_enabled,
            footer_company_links_enabled: value.footer_company_links_enabled,
            footer_qr_codes_enabled: value.footer_qr_codes_enabled,
            footer_social_enabled: value.footer_social_enabled,
            footer_legal_enabled: value.footer_legal_enabled,
            footer_social_github_enabled: value.footer_social_github_enabled,
            footer_social_github_url: value.footer_social_github_url,
            footer_social_twitter_enabled: value.footer_social_twitter_enabled,
            footer_social_twitter_url: value.footer_social_twitter_url,
            footer_social_linkedin_enabled: value.footer_social_linkedin_enabled,
            footer_social_linkedin_url: value.footer_social_linkedin_url,
            footer_social_youtube_enabled: value.footer_social_youtube_enabled,
            footer_social_youtube_url: value.footer_social_youtube_url,
            footer_social_weibo_enabled: value.footer_social_weibo_enabled,
            footer_social_weibo_url: value.footer_social_weibo_url,
            footer_social_xiaohongshu_enabled: value.footer_social_xiaohongshu_enabled,
            footer_social_xiaohongshu_url: value.footer_social_xiaohongshu_url,
            footer_social_bilibili_enabled: value.footer_social_bilibili_enabled,
            footer_social_bilibili_url: value.footer_social_bilibili_url,
            footer_social_douyin_enabled: value.footer_social_douyin_enabled,
            footer_social_douyin_url: value.footer_social_douyin_url,
            footer_social_zhihu_enabled: value.footer_social_zhihu_enabled,
            footer_social_zhihu_url: value.footer_social_zhihu_url,
            footer_social_telegram_enabled: value.footer_social_telegram_enabled,
            footer_social_telegram_url: value.footer_social_telegram_url,
            footer_social_discord_enabled: value.footer_social_discord_enabled,
            footer_social_discord_url: value.footer_social_discord_url,
            footer_social_email_enabled: value.footer_social_email_enabled,
            footer_social_email_url: value.footer_social_email_url,
            homepage: normalize_stored_content_document(value.homepage),
            downloads: normalize_stored_content_document(value.downloads),
        }
    }
}

/// Collapses "key absent" and "explicit null" onto the single empty-object spelling.
///
/// [`StoredSiteSettings`] is `#[serde(default)]`, so a row written before these fields existed
/// deserializes them as `Value::Null`; a payload written by a client that does not know about
/// them may carry `null` literally. Both mean exactly what `{}` means — nothing authored — and
/// the portal maps all three identically. Normalising on the way out keeps the response from
/// publishing a `null` where the API contract declares an object, which would otherwise force
/// every consumer to special-case a value the service itself considers empty.
fn normalize_stored_content_document(value: Value) -> Value {
    if value.is_null() {
        json!({})
    } else {
        value
    }
}

pub(crate) fn settings_payload(settings: &SiteSettings) -> DomainResult<String> {
    serde_json::to_string(&StoredSiteSettings::from(settings.clone()))
        .map_err(|error| DomainError::new(error.to_string()))
}

pub(crate) fn settings_snapshot_payload(settings: &SiteSettings) -> DomainResult<String> {
    serde_json::to_string(&StoredSiteSettingsEnvelope {
        action: Some("update_site_settings".to_owned()),
        settings: StoredSiteSettings::from(settings.clone()),
    })
    .map_err(|error| DomainError::new(error.to_string()))
}

use crate::infrastructure::sql::string_value::is_blank;

pub(crate) fn settings_from_payload(payload: &str) -> DomainResult<SiteSettings> {
    if is_blank(Some(payload)) {
        return Ok(SiteSettings::default());
    }
    let value = serde_json::from_str::<serde_json::Value>(payload)
        .map_err(|error| DomainError::new(error.to_string()))?;
    let settings = value.get("settings").cloned().unwrap_or(value);
    let missing_short_name = settings
        .as_object()
        .map(|object| !object.contains_key("shortName"))
        .unwrap_or(false);
    let missing_seo_title = settings
        .as_object()
        .map(|object| !object.contains_key("seoTitle"))
        .unwrap_or(false);
    serde_json::from_value::<StoredSiteSettings>(settings)
        .map(|mut stored| {
            if missing_short_name {
                stored.short_name.clear();
            }
            if missing_seo_title {
                stored.seo_title.clear();
            }
            SiteSettings::from(stored).normalized()
        })
        .map_err(|error| DomainError::new(error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::{settings_from_payload, settings_payload, settings_snapshot_payload};
    use crate::ports::SiteSettings;

    #[test]
    fn settings_from_payload_accepts_partial_snapshot() {
        let settings = settings_from_payload(
            r##"{"action":"update_site_settings","settings":{"siteName":"Tenant Gateway","brandColor":"bad"}}"##,
        )
        .unwrap();

        assert_eq!("Tenant Gateway", settings.site_name);
        assert_eq!("Tenant Gateway", settings.short_name);
        assert_eq!("#0f172a", settings.brand_color);
        assert_eq!("Tenant Gateway", settings.seo_title);
    }

    #[test]
    fn settings_payload_round_trips_compliance_filings() {
        let settings = SiteSettings {
            site_name: "Tenant Gateway".to_owned(),
            icp_record_number: "京ICP备2026000000号-1".to_owned(),
            icp_record_url: "https://beian.miit.gov.cn/".to_owned(),
            police_record_number: "京公网安备11010502000000号".to_owned(),
            police_record_url:
                "https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=11010502000000"
                    .to_owned(),
            ..SiteSettings::default()
        };

        let payload = settings_payload(&settings).unwrap();
        let snapshot_payload = settings_snapshot_payload(&settings).unwrap();

        for decoded in [
            settings_from_payload(&payload).unwrap(),
            settings_from_payload(&snapshot_payload).unwrap(),
        ] {
            assert_eq!("京ICP备2026000000号-1", decoded.icp_record_number);
            assert_eq!("https://beian.miit.gov.cn/", decoded.icp_record_url);
            assert_eq!("京公网安备11010502000000号", decoded.police_record_number);
            assert_eq!(
                "https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=11010502000000",
                decoded.police_record_url
            );
        }
    }

    #[test]
    fn settings_payload_round_trips_qr_codes() {
        let settings = SiteSettings {
            official_account_qr_code: serde_json::json!({
                "kind": "image",
                "source": "external_url",
                "publicUrl": "https://example.com/official-account-qr.png"
            }),
            community_group_qr_code: serde_json::json!({
                "kind": "image",
                "source": "external_url",
                "publicUrl": "https://example.com/community-group-qr.png"
            }),
            ..SiteSettings::default()
        };

        let payload = settings_payload(&settings).unwrap();
        let snapshot_payload = settings_snapshot_payload(&settings).unwrap();

        for decoded in [
            settings_from_payload(&payload).unwrap(),
            settings_from_payload(&snapshot_payload).unwrap(),
        ] {
            assert_eq!(
                "https://example.com/official-account-qr.png",
                decoded
                    .official_account_qr_code
                    .get("publicUrl")
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or_default()
            );
            assert_eq!(
                "https://example.com/community-group-qr.png",
                decoded
                    .community_group_qr_code
                    .get("publicUrl")
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or_default()
            );
        }
    }

    /// Every channel carries its own image *and* its own visibility switch, and both have to
    /// survive the round trip. A switch that only lives in the request DTO would make the
    /// admin toggle look like it saved while the footer kept rendering the channel.
    #[test]
    fn settings_payload_round_trips_every_qr_channel_and_switch() {
        let settings = SiteSettings {
            official_account_qr_code: serde_json::json!({
                "kind": "image",
                "source": "external_url",
                "publicUrl": "https://example.com/official.png"
            }),
            community_group_qr_code: serde_json::json!({
                "kind": "image",
                "source": "external_url",
                "publicUrl": "https://example.com/community.png"
            }),
            video_channel_qr_code: serde_json::json!({
                "kind": "image",
                "source": "external_url",
                "publicUrl": "https://example.com/video.png"
            }),
            douyin_qr_code: serde_json::json!({
                "kind": "image",
                "source": "external_url",
                "publicUrl": "https://example.com/douyin.png"
            }),
            official_account_qr_code_enabled: true,
            community_group_qr_code_enabled: false,
            video_channel_qr_code_enabled: true,
            douyin_qr_code_enabled: false,
            ..SiteSettings::default()
        };

        let payload = settings_payload(&settings).unwrap();
        let snapshot_payload = settings_snapshot_payload(&settings).unwrap();

        for decoded in [
            settings_from_payload(&payload).unwrap(),
            settings_from_payload(&snapshot_payload).unwrap(),
        ] {
            let public_url = |value: &serde_json::Value| {
                value
                    .get("publicUrl")
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or_default()
                    .to_owned()
            };
            assert_eq!(
                "https://example.com/official.png",
                public_url(&decoded.official_account_qr_code)
            );
            assert_eq!(
                "https://example.com/community.png",
                public_url(&decoded.community_group_qr_code)
            );
            assert_eq!(
                "https://example.com/video.png",
                public_url(&decoded.video_channel_qr_code)
            );
            assert_eq!(
                "https://example.com/douyin.png",
                public_url(&decoded.douyin_qr_code)
            );
            // An explicit `false` must survive as `false`; falling back to the default would
            // quietly re-show a channel the operator had hidden.
            assert!(decoded.official_account_qr_code_enabled);
            assert!(!decoded.community_group_qr_code_enabled);
            assert!(decoded.video_channel_qr_code_enabled);
            assert!(!decoded.douyin_qr_code_enabled);
        }
    }

    /// A snapshot written before the footer became composable mentions neither the section
    /// switches nor the follow-us links. Decoding it must reproduce the footer those
    /// deployments already render, not an empty one.
    #[test]
    fn settings_from_payload_backfills_footer_defaults_for_legacy_snapshots() {
        let settings = settings_from_payload(
            r##"{"action":"update_site_settings","settings":{"siteName":"Tenant Gateway"}}"##,
        )
        .unwrap();

        for (label, enabled) in [
            ("brand", settings.footer_brand_enabled),
            ("newsletter", settings.footer_newsletter_enabled),
            ("productLinks", settings.footer_product_links_enabled),
            ("resourceLinks", settings.footer_resource_links_enabled),
            ("companyLinks", settings.footer_company_links_enabled),
            ("qrCodes", settings.footer_qr_codes_enabled),
            ("social", settings.footer_social_enabled),
            ("legal", settings.footer_legal_enabled),
        ] {
            assert!(enabled, "footer section {label} must default to visible");
        }

        for (label, enabled) in [
            ("officialAccount", settings.official_account_qr_code_enabled),
            ("communityGroup", settings.community_group_qr_code_enabled),
            ("videoChannel", settings.video_channel_qr_code_enabled),
            ("douyin", settings.douyin_qr_code_enabled),
        ] {
            assert!(enabled, "QR channel {label} must default to visible");
        }

        // The four links the footer hardcoded before the registry existed.
        assert!(settings.footer_social_github_enabled);
        assert_eq!(
            "https://github.com/sdkwork-ai",
            settings.footer_social_github_url
        );
        assert!(settings.footer_social_twitter_enabled);
        assert_eq!("https://twitter.com", settings.footer_social_twitter_url);
        assert!(settings.footer_social_linkedin_enabled);
        assert_eq!("https://linkedin.com", settings.footer_social_linkedin_url);
        assert!(settings.footer_social_email_enabled);
        assert_eq!(
            "mailto:contact@sdkwork.com",
            settings.footer_social_email_url
        );

        // And the platforms nobody was showing must stay off.
        for (label, enabled) in [
            ("youtube", settings.footer_social_youtube_enabled),
            ("weibo", settings.footer_social_weibo_enabled),
            ("xiaohongshu", settings.footer_social_xiaohongshu_enabled),
            ("bilibili", settings.footer_social_bilibili_enabled),
            ("douyin", settings.footer_social_douyin_enabled),
            ("zhihu", settings.footer_social_zhihu_enabled),
            ("telegram", settings.footer_social_telegram_enabled),
            ("discord", settings.footer_social_discord_enabled),
        ] {
            assert!(!enabled, "social platform {label} must default to hidden");
        }
    }

    /// Every translated copy field has to survive the JSONB round trip.
    ///
    /// The settings snapshot is the only home these maps have, so a field that is read back but
    /// never serialized — or serialized under a different name — would leave the admin page
    /// showing an empty translation for copy the reader still sees in that language.
    #[test]
    fn settings_payload_round_trips_every_translated_copy_field() {
        let settings = SiteSettings {
            site_name_i18n: [("zh-CN".to_owned(), "云路由".to_owned())]
                .into_iter()
                .collect(),
            short_name_i18n: [("zh-CN".to_owned(), "云路由".to_owned())]
                .into_iter()
                .collect(),
            description_i18n: [("ja-JP".to_owned(), "統合 AI ゲートウェイ".to_owned())]
                .into_iter()
                .collect(),
            seo_title_i18n: [("zh-CN".to_owned(), "云路由 · 统一 AI 网关".to_owned())]
                .into_iter()
                .collect(),
            seo_description_i18n: [("de-DE".to_owned(), "Einheitliches KI-Gateway".to_owned())]
                .into_iter()
                .collect(),
            footer_copyright_i18n: [("zh-CN".to_owned(), "云路由 版权所有".to_owned())]
                .into_iter()
                .collect(),
            ..SiteSettings::default()
        };

        let payload = settings_payload(&settings).unwrap();
        let snapshot_payload = settings_snapshot_payload(&settings).unwrap();

        for decoded in [
            settings_from_payload(&payload).unwrap(),
            settings_from_payload(&snapshot_payload).unwrap(),
        ] {
            let read = |map: &crate::ports::SiteSettingsI18n, tag: &str| {
                map.get(tag).cloned().unwrap_or_default()
            };
            assert_eq!("云路由", read(&decoded.site_name_i18n, "zh-CN"));
            assert_eq!("云路由", read(&decoded.short_name_i18n, "zh-CN"));
            assert_eq!(
                "統合 AI ゲートウェイ",
                read(&decoded.description_i18n, "ja-JP")
            );
            assert_eq!(
                "云路由 · 统一 AI 网关",
                read(&decoded.seo_title_i18n, "zh-CN")
            );
            assert_eq!(
                "Einheitliches KI-Gateway",
                read(&decoded.seo_description_i18n, "de-DE")
            );
            assert_eq!(
                "云路由 版权所有",
                read(&decoded.footer_copyright_i18n, "zh-CN")
            );
            // A language that was never translated stays absent rather than becoming an empty
            // string, which is what keeps the reader on the base copy.
            assert!(!decoded.site_name_i18n.contains_key("fr-FR"));
        }
    }

    /// A snapshot written by a build that predates the override maps, or hand-edited in the
    /// database, must decode to the base copy rather than to a broken payload.
    #[test]
    fn settings_from_payload_drops_unusable_override_entries() {
        let settings = settings_from_payload(
            r##"{"action":"update_site_settings","settings":{"siteName":"Cloud Router",
                "siteNameI18n":{"zh-CN":"云路由","zh-HK":"雲路由","en":"Cloud Router","fr-FR":"   "}}}"##,
        )
        .unwrap();

        assert_eq!(
            Some("云路由"),
            settings.site_name_i18n.get("zh-CN").map(String::as_str)
        );
        // An alias (`zh-HK`, `en`) would have silently overwritten another language's copy, and a
        // blank value is the same state as "no override".
        assert_eq!(1, settings.site_name_i18n.len());
    }

    /// A payload with no override keys at all — every snapshot in the field today — has to decode
    /// to empty maps, so the reader falls back to the single authored string.
    #[test]
    fn settings_from_payload_defaults_override_maps_to_empty() {
        let settings = settings_from_payload(
            r##"{"action":"update_site_settings","settings":{"siteName":"Tenant Gateway"}}"##,
        )
        .unwrap();

        for (label, map) in [
            ("siteNameI18n", &settings.site_name_i18n),
            ("shortNameI18n", &settings.short_name_i18n),
            ("descriptionI18n", &settings.description_i18n),
            ("seoTitleI18n", &settings.seo_title_i18n),
            ("seoDescriptionI18n", &settings.seo_description_i18n),
            ("footerCopyrightI18n", &settings.footer_copyright_i18n),
        ] {
            assert!(map.is_empty(), "{label} must default to an empty map");
        }
    }
}
