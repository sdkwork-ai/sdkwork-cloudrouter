use serde::{Deserialize, Serialize};

use crate::models::{MediaResource};

/// Admin site item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminSiteItem {
    /// Base url field on admin site item.
    #[serde(rename = "baseUrl")]
    pub base_url: String,

    /// Consecutive error count field on admin site item.
    #[serde(rename = "consecutiveErrorCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub consecutive_error_count: Option<String>,

    /// Description field on admin site item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Display name field on admin site item.
    #[serde(rename = "displayName")]
    pub display_name: String,

    /// Docs url field on admin site item.
    #[serde(rename = "docsUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub docs_url: Option<String>,

    /// Domains field on admin site item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub domains: Option<Vec<String>>,

    /// Environment field on admin site item.
    pub environment: String,

    /// Health status field on admin site item.
    #[serde(rename = "healthStatus")]
    pub health_status: String,

    /// Id field on admin site item.
    pub id: String,

    /// Last checked at field on admin site item.
    #[serde(rename = "lastCheckedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_checked_at: Option<String>,

    /// Last latency ms field on admin site item.
    #[serde(rename = "lastLatencyMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_latency_ms: Option<String>,

    /// Last sync at field on admin site item.
    #[serde(rename = "lastSyncAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_sync_at: Option<String>,

    /// Logo field on admin site item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logo: Option<MediaResource>,

    /// Owner kind field on admin site item.
    #[serde(rename = "ownerKind")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner_kind: Option<String>,

    /// Region code field on admin site item.
    #[serde(rename = "regionCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub region_code: Option<String>,

    /// Site code field on admin site item.
    #[serde(rename = "siteCode")]
    pub site_code: String,

    /// Site name field on admin site item.
    #[serde(rename = "siteName")]
    pub site_name: String,

    /// Site type field on admin site item.
    #[serde(rename = "siteType")]
    pub site_type: String,

    /// Sort order field on admin site item.
    #[serde(rename = "sortOrder")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<String>,

    /// Status field on admin site item.
    pub status: String,

    /// Vendor codes field on admin site item.
    #[serde(rename = "vendorCodes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor_codes: Option<Vec<String>>,

    /// Website url field on admin site item.
    #[serde(rename = "websiteUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub website_url: Option<String>,
}
