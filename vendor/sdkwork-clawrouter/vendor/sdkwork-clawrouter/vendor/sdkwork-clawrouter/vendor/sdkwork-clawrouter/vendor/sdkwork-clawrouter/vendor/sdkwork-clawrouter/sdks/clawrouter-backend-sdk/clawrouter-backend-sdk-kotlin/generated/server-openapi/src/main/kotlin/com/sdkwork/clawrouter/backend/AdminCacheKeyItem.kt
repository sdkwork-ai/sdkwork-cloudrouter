package com.sdkwork.clawrouter.backend

data class AdminCacheKeyItem(
    val expiresInSeconds: String? = null,
    val instanceName: String? = null,
    val key: String? = null,
    val namespace: String? = null,
    val status: String? = null
)
