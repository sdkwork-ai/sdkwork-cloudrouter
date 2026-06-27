package com.sdkwork.clawrouter.backend

data class AdminMcpHealthCheckResponse(
    val checkedAt: String? = null,
    val errorMasked: String? = null,
    val healthStatus: String? = null,
    val healthy: Boolean? = null,
    val latencyMs: String? = null,
    val serverId: String? = null
)
