package com.sdkwork.clawrouter.backend

data class StorageUsageSnapshotListResponse(
    val items: List<StorageUsageSnapshot>? = null,
    val nextCursor: String? = null,
    val requestId: String? = null
)
