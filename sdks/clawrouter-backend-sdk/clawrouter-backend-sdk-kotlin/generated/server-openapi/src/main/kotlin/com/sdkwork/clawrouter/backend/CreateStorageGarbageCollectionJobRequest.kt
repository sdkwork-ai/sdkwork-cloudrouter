package com.sdkwork.clawrouter.backend

data class CreateStorageGarbageCollectionJobRequest(
    val criteria: Map<String, String>? = null,
    val dryRun: Boolean? = null,
    val dryRunSample: String? = null,
    val jobType: String? = null,
    val retentionWindow: String? = null,
    val target: String? = null
)
