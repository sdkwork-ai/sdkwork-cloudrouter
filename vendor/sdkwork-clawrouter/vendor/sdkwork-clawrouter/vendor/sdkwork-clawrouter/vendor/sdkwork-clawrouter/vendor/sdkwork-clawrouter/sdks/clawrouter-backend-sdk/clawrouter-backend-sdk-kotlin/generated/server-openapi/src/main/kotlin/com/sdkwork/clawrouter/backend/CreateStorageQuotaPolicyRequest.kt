package com.sdkwork.clawrouter.backend

data class CreateStorageQuotaPolicyRequest(
    val enforcement: String? = null,
    val quotaLimit: String? = null,
    val quotaLimitBytes: String? = null,
    val scopeId: String? = null,
    val scopeType: String? = null,
    val singleFileLimitBytes: String? = null
)
