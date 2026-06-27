package com.sdkwork.clawrouter.backend

data class ModelRankingRefreshLatestJob(
    val durationMs: String? = null,
    val endedAt: String? = null,
    val failureCount: String? = null,
    val failureReason: String? = null,
    val generatedCount: String? = null,
    val id: String? = null,
    val jobName: String? = null,
    val nextRefreshAt: String? = null,
    val organizationId: String? = null,
    val rankScope: String? = null,
    val snapshotDate: String? = null,
    val snapshotPeriod: String? = null,
    val sourceCount: String? = null,
    val startedAt: String? = null,
    val status: String? = null,
    val successCount: String? = null,
    val tenantId: String? = null,
    val windowEnd: String? = null,
    val windowStart: String? = null
)
