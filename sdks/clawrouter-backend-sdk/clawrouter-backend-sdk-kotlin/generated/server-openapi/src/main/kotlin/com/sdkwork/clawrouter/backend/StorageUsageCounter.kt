package com.sdkwork.clawrouter.backend

data class StorageUsageCounter(
    val fileCount: String? = null,
    val files: String? = null,
    val id: String? = null,
    val reserved: String? = null,
    val reservedBytes: String? = null,
    val scope: String? = null,
    val scopeId: String? = null,
    val scopeType: String? = null,
    val snapshotAt: String? = null,
    val updatedAt: String? = null,
    val used: String? = null,
    val usedBytes: String? = null
)
