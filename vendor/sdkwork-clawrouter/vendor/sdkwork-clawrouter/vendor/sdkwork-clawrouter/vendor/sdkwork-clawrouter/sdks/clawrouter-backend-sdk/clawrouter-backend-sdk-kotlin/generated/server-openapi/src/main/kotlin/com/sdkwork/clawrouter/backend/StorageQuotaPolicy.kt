package com.sdkwork.clawrouter.backend

data class StorageQuotaPolicy(
    val createdAt: String? = null,
    val enforcement: String? = null,
    val id: String? = null,
    val limit: String? = null,
    val quotaLimitBytes: String? = null,
    val scopeId: String? = null,
    val scopeType: String? = null,
    val singleFileLimitBytes: String? = null,
    val status: String? = null,
    val updatedAt: String? = null,
    val used: String? = null,
    val usedBytes: String? = null
)
