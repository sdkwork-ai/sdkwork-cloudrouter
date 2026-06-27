package com.sdkwork.clawrouter.backend

data class StorageProviderHealthCheckResponse(
    val checkedAt: String? = null,
    val healthy: Boolean? = null,
    val providerId: String? = null,
    val requestId: String? = null,
    val status: String? = null
)
