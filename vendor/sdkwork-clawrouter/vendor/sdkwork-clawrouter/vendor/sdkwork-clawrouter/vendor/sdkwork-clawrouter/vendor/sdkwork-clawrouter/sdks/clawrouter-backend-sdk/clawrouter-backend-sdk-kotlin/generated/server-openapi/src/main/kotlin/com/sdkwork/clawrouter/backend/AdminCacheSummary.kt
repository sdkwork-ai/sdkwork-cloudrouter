package com.sdkwork.clawrouter.backend

data class AdminCacheSummary(
    val cacheDeletes: String? = null,
    val cacheErrors: String? = null,
    val cacheHits: String? = null,
    val cacheInspections: String? = null,
    val cacheMisses: String? = null,
    val cacheRefreshes: String? = null,
    val cacheWrites: String? = null,
    val expiredEntries: String? = null,
    val runtimeTarget: String? = null,
    val totalEntries: String? = null,
    val totalInstances: String? = null,
    val totalNamespaces: String? = null
)
