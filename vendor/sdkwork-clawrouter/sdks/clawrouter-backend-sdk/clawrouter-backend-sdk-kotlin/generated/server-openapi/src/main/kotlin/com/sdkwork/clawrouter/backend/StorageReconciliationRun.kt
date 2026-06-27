package com.sdkwork.clawrouter.backend

data class StorageReconciliationRun(
    val bucketId: String? = null,
    val bucketName: String? = null,
    val dryRun: Boolean? = null,
    val finishedAt: String? = null,
    val id: String? = null,
    val issueCount: String? = null,
    val issues: String? = null,
    val providerCode: String? = null,
    val providerId: String? = null,
    val runId: String? = null,
    val runType: String? = null,
    val scope: String? = null,
    val startedAt: String? = null,
    val status: String? = null
)
