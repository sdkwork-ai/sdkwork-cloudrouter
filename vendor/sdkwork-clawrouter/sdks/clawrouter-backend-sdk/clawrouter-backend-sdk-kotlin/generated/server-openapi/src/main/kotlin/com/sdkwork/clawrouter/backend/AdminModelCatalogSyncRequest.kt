package com.sdkwork.clawrouter.backend

data class AdminModelCatalogSyncRequest(
    val catalogRoot: String? = null,
    val catalogVersion: String? = null,
    val force: Boolean? = null,
    val mode: String? = null,
    val source: String? = null,
    val vendorCodes: List<String>? = null
)
