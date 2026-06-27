package com.sdkwork.clawrouter.backend

data class StorageGarbageCollectionJob(
    val candidateCount: String? = null,
    val createdAt: String? = null,
    val dryRun: Boolean? = null,
    val id: String? = null,
    val jobId: String? = null,
    val jobType: String? = null,
    val retention: String? = null,
    val status: String? = null,
    val target: String? = null
)
