package com.sdkwork.clawrouter.backend

data class CacheOverview(
    val instances: List<Map<String, Any>>? = null,
    val namespacePolicies: List<Map<String, Any>>? = null,
    val summary: Map<String, Any>? = null
)
