use serde::{Deserialize, Serialize};

use crate::models::{MediaResource};

/// Admin site settings update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminSiteSettingsUpdateRequest {
    /// Accent color field on admin site settings update request.
    #[serde(rename = "accentColor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub accent_color: Option<String>,

    /// Brand color field on admin site settings update request.
    #[serde(rename = "brandColor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub brand_color: Option<String>,

    /// Custom css field on admin site settings update request.
    #[serde(rename = "customCss")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_css: Option<String>,

    /// Description field on admin site settings update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Docs url field on admin site settings update request.
    #[serde(rename = "docsUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub docs_url: Option<String>,

    /// Favicon field on admin site settings update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub favicon: Option<MediaResource>,

    /// Footer copyright field on admin site settings update request.
    #[serde(rename = "footerCopyright")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub footer_copyright: Option<String>,

    /// Icon field on admin site settings update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<MediaResource>,

    /// Icp record number field on admin site settings update request.
    #[serde(rename = "icpRecordNumber")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icp_record_number: Option<String>,

    /// Icp record url field on admin site settings update request.
    #[serde(rename = "icpRecordUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icp_record_url: Option<String>,

    /// Logo field on admin site settings update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logo: Option<MediaResource>,

    /// Police record number field on admin site settings update request.
    #[serde(rename = "policeRecordNumber")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub police_record_number: Option<String>,

    /// Police record url field on admin site settings update request.
    #[serde(rename = "policeRecordUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub police_record_url: Option<String>,

    /// Privacy url field on admin site settings update request.
    #[serde(rename = "privacyUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub privacy_url: Option<String>,

    /// Seo description field on admin site settings update request.
    #[serde(rename = "seoDescription")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seo_description: Option<String>,

    /// Seo title field on admin site settings update request.
    #[serde(rename = "seoTitle")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seo_title: Option<String>,

    /// Short name field on admin site settings update request.
    #[serde(rename = "shortName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub short_name: Option<String>,

    /// Site name field on admin site settings update request.
    #[serde(rename = "siteName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub site_name: Option<String>,

    /// Support url field on admin site settings update request.
    #[serde(rename = "supportUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub support_url: Option<String>,

    /// Terms url field on admin site settings update request.
    #[serde(rename = "termsUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub terms_url: Option<String>,
}
