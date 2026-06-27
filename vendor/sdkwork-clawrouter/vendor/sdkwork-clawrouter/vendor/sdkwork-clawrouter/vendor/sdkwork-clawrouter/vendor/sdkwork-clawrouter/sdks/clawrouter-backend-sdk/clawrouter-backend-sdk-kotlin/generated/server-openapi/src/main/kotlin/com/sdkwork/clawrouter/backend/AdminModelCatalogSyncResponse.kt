package com.sdkwork.clawrouter.backend

data class AdminModelCatalogSyncResponse(
    val acceptedCount: String? = null,
    val capabilityCount: String? = null,
    val catalogRoot: String? = null,
    val catalogVersion: String? = null,
    val dryRun: Boolean? = null,
    val familyCount: String? = null,
    val meterCount: String? = null,
    val mode: String? = null,
    val modelCount: String? = null,
    val models: List<AdminAiModelItem>? = null,
    val priceCount: String? = null,
    val rankingCount: String? = null,
    val requestedCatalogVersion: String? = null,
    val snapshotId: String? = null,
    val source: String? = null,
    val sourceHash: String? = null,
    val syncRunId: String? = null,
    val synced: Boolean? = null,
    val vendorCodes: List<String>? = null,
    val vendorCount: String? = null,
    val vendors: List<AdminModelVendorItem>? = null
)
