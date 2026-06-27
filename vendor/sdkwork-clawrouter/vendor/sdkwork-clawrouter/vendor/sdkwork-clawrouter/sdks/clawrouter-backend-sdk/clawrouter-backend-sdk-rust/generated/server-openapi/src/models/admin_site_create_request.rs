use serde::{Deserialize, Serialize};

use crate::models::{MediaResource};

/// Admin site create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminSiteCreateRequest {
    /// Base url field on admin site create request.
    #[serde(rename = "baseUrl")]
    pub base_url: String,

    /// Credential ref field on admin site create request.
    #[serde(rename = "credentialRef")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub credential_ref: Option<String>,

    /// Description field on admin site create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Display name field on admin site create request.
    #[serde(rename = "displayName")]
    pub display_name: String,

    /// Docs url field on admin site create request.
    #[serde(rename = "docsUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub docs_url: Option<String>,

    /// Domains field on admin site create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub domains: Option<Vec<String>>,

    /// Environment field on admin site create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub environment: Option<String>,

    /// Logo field on admin site create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logo: Option<MediaResource>,

    /// Masked label field on admin site create request.
    #[serde(rename = "maskedLabel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub masked_label: Option<String>,

    /// Owner kind field on admin site create request.
    #[serde(rename = "ownerKind")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner_kind: Option<String>,

    /// Region code field on admin site create request.
    #[serde(rename = "regionCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub region_code: Option<String>,

    /// Site code field on admin site create request.
    #[serde(rename = "siteCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub site_code: Option<String>,

    /// Site name field on admin site create request.
    #[serde(rename = "siteName")]
    pub site_name: String,

    /// Site type field on admin site create request.
    #[serde(rename = "siteType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub site_type: Option<String>,

    /// Status field on admin site create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Vendor codes field on admin site create request.
    #[serde(rename = "vendorCodes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor_codes: Option<Vec<String>>,

    /// Website url field on admin site create request.
    #[serde(rename = "websiteUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub website_url: Option<String>,
}
