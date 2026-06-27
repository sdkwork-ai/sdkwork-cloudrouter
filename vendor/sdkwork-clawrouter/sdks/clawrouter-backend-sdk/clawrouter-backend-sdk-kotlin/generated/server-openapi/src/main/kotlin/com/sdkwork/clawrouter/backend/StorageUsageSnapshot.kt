package com.sdkwork.clawrouter.backend

data class StorageUsageSnapshot(
    val fileCount: String? = null,
    val id: String? = null,
    val reservedBytes: String? = null,
    val scope: String? = null,
    val scopeId: String? = null,
    val scopeType: String? = null,
    val snapshotAt: String? = null,
    val snapshotType: String? = null,
    val usedBytes: String? = null
)
