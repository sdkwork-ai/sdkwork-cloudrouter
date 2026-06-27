package com.sdkwork.clawrouter.backend

data class StorageReconciliationRunListResponse(
    val items: List<StorageReconciliationRun>? = null,
    val nextCursor: String? = null,
    val requestId: String? = null
)
