package com.sdkwork.clawrouter.backend

data class AdminCacheOverviewResponse(
    val instances: List<AdminCacheInstance>? = null,
    val namespacePolicies: List<AdminCacheNamespacePolicy>? = null,
    val summary: AdminCacheSummary? = null
)
