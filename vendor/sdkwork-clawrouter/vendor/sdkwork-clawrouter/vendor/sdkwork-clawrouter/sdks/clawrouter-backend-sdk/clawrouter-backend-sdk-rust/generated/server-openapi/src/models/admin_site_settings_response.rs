use serde::{Deserialize, Serialize};

use crate::models::{MediaResource};

/// Admin site settings response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminSiteSettingsResponse {
    /// Accent color field on admin site settings response.
    #[serde(rename = "accentColor")]
    pub accent_color: String,

    /// Brand color field on admin site settings response.
    #[serde(rename = "brandColor")]
    pub brand_color: String,

    /// Custom css field on admin site settings response.
    #[serde(rename = "customCss")]
    pub custom_css: String,

    /// Description field on admin site settings response.
    pub description: String,

    /// Docs url field on admin site settings response.
    #[serde(rename = "docsUrl")]
    pub docs_url: String,

    /// Favicon field on admin site settings response.
    pub favicon: MediaResource,

    /// Footer copyright field on admin site settings response.
    #[serde(rename = "footerCopyright")]
    pub footer_copyright: String,

    /// Icon field on admin site settings response.
    pub icon: MediaResource,

    /// Icp record number field on admin site settings response.
    #[serde(rename = "icpRecordNumber")]
    pub icp_record_number: String,

    /// Icp record url field on admin site settings response.
    #[serde(rename = "icpRecordUrl")]
    pub icp_record_url: String,

    /// Logo field on admin site settings response.
    pub logo: MediaResource,

    /// Police record number field on admin site settings response.
    #[serde(rename = "policeRecordNumber")]
    pub police_record_number: String,

    /// Police record url field on admin site settings response.
    #[serde(rename = "policeRecordUrl")]
    pub police_record_url: String,

    /// Privacy url field on admin site settings response.
    #[serde(rename = "privacyUrl")]
    pub privacy_url: String,

    /// Seo description field on admin site settings response.
    #[serde(rename = "seoDescription")]
    pub seo_description: String,

    /// Seo title field on admin site settings response.
    #[serde(rename = "seoTitle")]
    pub seo_title: String,

    /// Short name field on admin site settings response.
    #[serde(rename = "shortName")]
    pub short_name: String,

    /// Site name field on admin site settings response.
    #[serde(rename = "siteName")]
    pub site_name: String,

    /// Support url field on admin site settings response.
    #[serde(rename = "supportUrl")]
    pub support_url: String,

    /// Terms url field on admin site settings response.
    #[serde(rename = "termsUrl")]
    pub terms_url: String,
}
