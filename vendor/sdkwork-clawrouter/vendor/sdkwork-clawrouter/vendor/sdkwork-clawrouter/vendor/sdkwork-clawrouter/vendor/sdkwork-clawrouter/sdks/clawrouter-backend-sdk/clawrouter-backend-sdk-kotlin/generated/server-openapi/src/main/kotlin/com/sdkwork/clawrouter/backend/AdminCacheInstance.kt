package com.sdkwork.clawrouter.backend

data class AdminCacheInstance(
    val cacheDeletes: String? = null,
    val cacheErrors: String? = null,
    val cacheHits: String? = null,
    val cacheInspections: String? = null,
    val cacheMisses: String? = null,
    val cacheRefreshes: String? = null,
    val cacheWrites: String? = null,
    val connectionProfileName: String? = null,
    val defaultTtlSeconds: String? = null,
    val entryCount: String? = null,
    val expiredEntryCount: String? = null,
    val keyPrefix: String? = null,
    val maxEntries: String? = null,
    val name: String? = null,
    val providerKind: String? = null,
    val purpose: String? = null,
    val status: String? = null,
    val supportsDelete: Boolean? = null,
    val supportsInspect: Boolean? = null,
    val supportsRefresh: Boolean? = null
)
