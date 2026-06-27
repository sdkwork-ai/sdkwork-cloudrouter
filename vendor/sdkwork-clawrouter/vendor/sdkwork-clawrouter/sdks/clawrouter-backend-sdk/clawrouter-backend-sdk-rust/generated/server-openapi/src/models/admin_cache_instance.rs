use serde::{Deserialize, Serialize};

/// Admin cache instance schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminCacheInstance {
    /// Cache deletes field on admin cache instance.
    #[serde(rename = "cacheDeletes")]
    pub cache_deletes: String,

    /// Cache errors field on admin cache instance.
    #[serde(rename = "cacheErrors")]
    pub cache_errors: String,

    /// Cache hits field on admin cache instance.
    #[serde(rename = "cacheHits")]
    pub cache_hits: String,

    /// Cache inspections field on admin cache instance.
    #[serde(rename = "cacheInspections")]
    pub cache_inspections: String,

    /// Cache misses field on admin cache instance.
    #[serde(rename = "cacheMisses")]
    pub cache_misses: String,

    /// Cache refreshes field on admin cache instance.
    #[serde(rename = "cacheRefreshes")]
    pub cache_refreshes: String,

    /// Cache writes field on admin cache instance.
    #[serde(rename = "cacheWrites")]
    pub cache_writes: String,

    /// Connection profile name field on admin cache instance.
    #[serde(rename = "connectionProfileName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub connection_profile_name: Option<String>,

    /// Default ttl seconds field on admin cache instance.
    #[serde(rename = "defaultTtlSeconds")]
    pub default_ttl_seconds: String,

    /// Entry count field on admin cache instance.
    #[serde(rename = "entryCount")]
    pub entry_count: String,

    /// Expired entry count field on admin cache instance.
    #[serde(rename = "expiredEntryCount")]
    pub expired_entry_count: String,

    /// Key prefix field on admin cache instance.
    #[serde(rename = "keyPrefix")]
    pub key_prefix: String,

    /// Max entries field on admin cache instance.
    #[serde(rename = "maxEntries")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_entries: Option<String>,

    /// Name field on admin cache instance.
    pub name: String,

    /// Provider kind field on admin cache instance.
    #[serde(rename = "providerKind")]
    pub provider_kind: String,

    /// Purpose field on admin cache instance.
    pub purpose: String,

    /// Status field on admin cache instance.
    pub status: String,

    /// Supports delete field on admin cache instance.
    #[serde(rename = "supportsDelete")]
    pub supports_delete: bool,

    /// Supports inspect field on admin cache instance.
    #[serde(rename = "supportsInspect")]
    pub supports_inspect: bool,

    /// Supports refresh field on admin cache instance.
    #[serde(rename = "supportsRefresh")]
    pub supports_refresh: bool,
}
