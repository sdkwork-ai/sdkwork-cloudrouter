package com.sdkwork.clawrouter.backend

data class CacheOperationOutcome(
    val cacheKey: String? = null,
    val deletedEntries: String? = null,
    val instanceName: String? = null,
    val namespace: String? = null,
    val operation: String? = null,
    val refreshedEntries: String? = null,
    val status: String? = null
)
