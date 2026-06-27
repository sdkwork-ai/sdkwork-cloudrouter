package com.sdkwork.clawrouter.backend

data class AdminCacheNamespacePolicy(
    val consistency: String? = null,
    val enabled: Boolean? = null,
    val failureMode: String? = null,
    val instanceName: String? = null,
    val jitterPercent: String? = null,
    val namespace: String? = null,
    val scope: String? = null,
    val sensitivity: String? = null,
    val staleWhileRevalidateSeconds: String? = null,
    val tags: List<String>? = null,
    val ttlSeconds: String? = null
)
