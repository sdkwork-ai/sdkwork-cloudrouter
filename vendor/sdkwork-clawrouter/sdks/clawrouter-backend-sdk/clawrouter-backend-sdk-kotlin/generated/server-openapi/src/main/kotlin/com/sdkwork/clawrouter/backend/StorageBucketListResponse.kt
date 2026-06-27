package com.sdkwork.clawrouter.backend

data class StorageBucketListResponse(
    val items: List<StorageBucketConfig>? = null,
    val nextCursor: String? = null,
    val requestId: String? = null
)
