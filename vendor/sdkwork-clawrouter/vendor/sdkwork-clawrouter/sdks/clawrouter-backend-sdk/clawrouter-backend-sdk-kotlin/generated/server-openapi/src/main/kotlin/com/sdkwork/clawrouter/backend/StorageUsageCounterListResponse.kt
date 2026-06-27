package com.sdkwork.clawrouter.backend

data class StorageUsageCounterListResponse(
    val items: List<StorageUsageCounter>? = null,
    val nextCursor: String? = null,
    val requestId: String? = null
)
