package com.sdkwork.clawrouter.backend

data class AdminSiteConnectionCheckResponse(
    val checkedAt: String? = null,
    val healthStatus: String? = null,
    val latencyMs: String? = null,
    val message: String? = null,
    val siteId: String? = null,
    val status: String? = null
)
