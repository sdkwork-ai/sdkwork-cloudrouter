package com.sdkwork.clawrouter.backend

data class CreateStorageReconciliationRunRequest(
    val bucketId: String? = null,
    val checkMode: String? = null,
    val dryRun: Boolean? = null,
    val providerId: String? = null,
    val reason: String? = null,
    val runType: String? = null
)
