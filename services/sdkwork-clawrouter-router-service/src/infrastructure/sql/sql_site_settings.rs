use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::domain::{DomainError, DomainResult};
use crate::ports::SiteSettings;

pub(crate) const SITE_SETTINGS_SOURCE_TABLE: &str = "ops_site_runtime_settings";
pub(crate) const SITE_SETTINGS_AUDIT_TARGET_TYPE: i32 = 66;
pub(crate) const CONFIG_SCOPE_SITE: i32 = 40;
pub(crate) const CONFIG_TYPE_SITE_SETTINGS: i32 = SITE_SETTINGS_AUDIT_TARGET_TYPE;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub(crate) struct StoredSiteSettings {
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
            short_name: value.short_name,
            description: value.description,
            logo: value.logo,
            icon: value.icon,
            favicon: value.favicon,
            brand_color: value.brand_color,
            accent_color: value.accent_color,
            footer_copyright: value.footer_copyright,
            icp_record_number: value.icp_record_number,
            icp_record_url: value.icp_record_url,
            police_record_number: value.police_record_number,
            police_record_url: value.police_record_url,
            seo_title: value.seo_title,
            seo_description: value.seo_description,
            support_url: value.support_url,
            docs_url: value.docs_url,
            privacy_url: value.privacy_url,
            terms_url: value.terms_url,
            custom_css: value.custom_css,
        }
    }
}

impl From<StoredSiteSettings> for SiteSettings {
    fn from(value: StoredSiteSettings) -> Self {
        Self {
            site_name: value.site_name,
            short_name: value.short_name,
            description: value.description,
            logo: value.logo,
            icon: value.icon,
            favicon: value.favicon,
            brand_color: value.brand_color,
            accent_color: value.accent_color,
            footer_copyright: value.footer_copyright,
            icp_record_number: value.icp_record_number,
            icp_record_url: value.icp_record_url,
            police_record_number: value.police_record_number,
            police_record_url: value.police_record_url,
            seo_title: value.seo_title,
            seo_description: value.seo_description,
            support_url: value.support_url,
            docs_url: value.docs_url,
            privacy_url: value.privacy_url,
            terms_url: value.terms_url,
            custom_css: value.custom_css,
        }
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
}
