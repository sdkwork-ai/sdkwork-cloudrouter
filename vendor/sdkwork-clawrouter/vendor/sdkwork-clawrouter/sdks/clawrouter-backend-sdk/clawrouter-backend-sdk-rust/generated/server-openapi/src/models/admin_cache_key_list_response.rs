use serde::{Deserialize, Serialize};

use crate::models::{AdminCacheKeyItem};

/// Admin cache key list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminCacheKeyListResponse {
    /// Has more field on admin cache key list response.
    #[serde(rename = "hasMore")]
    pub has_more: bool,

    /// Instance name field on admin cache key list response.
    #[serde(rename = "instanceName")]
    pub instance_name: String,

    /// Items field on admin cache key list response.
    pub items: Vec<AdminCacheKeyItem>,

    /// Limit field on admin cache key list response.
    pub limit: String,

    /// Namespace field on admin cache key list response.
    pub namespace: String,

    /// Next cursor field on admin cache key list response.
    #[serde(rename = "nextCursor")]
    pub next_cursor: String,

    /// Returned items field on admin cache key list response.
    #[serde(rename = "returnedItems")]
    pub returned_items: String,

    /// Scan complete field on admin cache key list response.
    #[serde(rename = "scanComplete")]
    pub scan_complete: bool,

    /// Scanned items field on admin cache key list response.
    #[serde(rename = "scannedItems")]
    pub scanned_items: String,
}
