package com.sdkwork.clawrouter.backend

data class CacheNamespaceKeyPage(
    val instanceName: String? = null,
    val items: List<Map<String, Any>>? = null,
    val namespace: String? = null,
    val pageInfo: PageInfo? = null,
    val returnedItems: String? = null,
    val scanComplete: Boolean? = null,
    val scannedItems: String? = null
)
