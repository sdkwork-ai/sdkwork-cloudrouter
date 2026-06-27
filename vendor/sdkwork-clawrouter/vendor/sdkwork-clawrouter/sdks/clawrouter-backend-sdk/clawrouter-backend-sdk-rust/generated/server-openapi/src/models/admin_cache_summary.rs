use serde::{Deserialize, Serialize};

/// Admin cache summary schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminCacheSummary {
    /// Cache deletes field on admin cache summary.
    #[serde(rename = "cacheDeletes")]
    pub cache_deletes: String,

    /// Cache errors field on admin cache summary.
    #[serde(rename = "cacheErrors")]
    pub cache_errors: String,

    /// Cache hits field on admin cache summary.
    #[serde(rename = "cacheHits")]
    pub cache_hits: String,

    /// Cache inspections field on admin cache summary.
    #[serde(rename = "cacheInspections")]
    pub cache_inspections: String,

    /// Cache misses field on admin cache summary.
    #[serde(rename = "cacheMisses")]
    pub cache_misses: String,

    /// Cache refreshes field on admin cache summary.
    #[serde(rename = "cacheRefreshes")]
    pub cache_refreshes: String,

    /// Cache writes field on admin cache summary.
    #[serde(rename = "cacheWrites")]
    pub cache_writes: String,

    /// Expired entries field on admin cache summary.
    #[serde(rename = "expiredEntries")]
    pub expired_entries: String,

    /// Runtime target field on admin cache summary.
    #[serde(rename = "runtimeTarget")]
    pub runtime_target: String,

    /// Total entries field on admin cache summary.
    #[serde(rename = "totalEntries")]
    pub total_entries: String,

    /// Total instances field on admin cache summary.
    #[serde(rename = "totalInstances")]
    pub total_instances: String,

    /// Total namespaces field on admin cache summary.
    #[serde(rename = "totalNamespaces")]
    pub total_namespaces: String,
}
