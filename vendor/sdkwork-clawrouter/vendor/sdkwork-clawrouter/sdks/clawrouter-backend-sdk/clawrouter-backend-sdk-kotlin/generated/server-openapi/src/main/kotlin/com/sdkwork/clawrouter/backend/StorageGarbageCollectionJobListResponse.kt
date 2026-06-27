package com.sdkwork.clawrouter.backend

data class StorageGarbageCollectionJobListResponse(
    val items: List<StorageGarbageCollectionJob>? = null,
    val nextCursor: String? = null,
    val requestId: String? = null
)
