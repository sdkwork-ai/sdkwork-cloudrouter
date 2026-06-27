package com.sdkwork.clawrouter.backend

data class StorageProviderListResponse(
    val items: List<StorageProviderConfig>? = null,
    val requestId: String? = null
)
