package com.sdkwork.clawrouter.backend

data class StorageUsageLedgerListResponse(
    val items: List<StorageUsageLedgerEntry>? = null,
    val nextCursor: String? = null,
    val requestId: String? = null
)
