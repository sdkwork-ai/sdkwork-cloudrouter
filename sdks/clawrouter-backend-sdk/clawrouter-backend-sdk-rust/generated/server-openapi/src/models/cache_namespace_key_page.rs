use serde::{Deserialize, Serialize};

use crate::models::{PageInfo};

/// Cache namespace key page schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CacheNamespaceKeyPage {
    /// Instance name field on cache namespace key page.
    #[serde(rename = "instanceName")]
    pub instance_name: String,

    /// Items field on cache namespace key page.
    pub items: Vec<serde_json::Value>,

    /// Namespace field on cache namespace key page.
    pub namespace: String,

    /// Page info field on cache namespace key page.
    #[serde(rename = "pageInfo")]
    pub page_info: PageInfo,

    /// Returned items field on cache namespace key page.
    #[serde(rename = "returnedItems")]
    pub returned_items: String,

    /// Scan complete field on cache namespace key page.
    #[serde(rename = "scanComplete")]
    pub scan_complete: bool,

    /// Scanned items field on cache namespace key page.
    #[serde(rename = "scannedItems")]
    pub scanned_items: String,
}
