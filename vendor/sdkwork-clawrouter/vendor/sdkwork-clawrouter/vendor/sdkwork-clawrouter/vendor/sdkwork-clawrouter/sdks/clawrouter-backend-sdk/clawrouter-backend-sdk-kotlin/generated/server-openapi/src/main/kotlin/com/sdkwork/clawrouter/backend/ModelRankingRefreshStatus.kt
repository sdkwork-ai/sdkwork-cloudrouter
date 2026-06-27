package com.sdkwork.clawrouter.backend

data class ModelRankingRefreshStatus(
    val cacheMaxAgeSeconds: String? = null,
    val generatedAt: String? = null,
    val generatedCount: String? = null,
    val latestJob: ModelRankingRefreshLatestJob? = null,
    val nextRefreshAt: String? = null,
    val organizationId: String? = null,
    val rankScope: String? = null,
    val refreshIntervalSeconds: String? = null,
    val snapshotDate: String? = null,
    val snapshotPeriod: String? = null,
    val sourceCount: String? = null,
    val sourceTables: List<String>? = null,
    val status: String? = null,
    val tenantId: String? = null,
    val windowEnd: String? = null,
    val windowStart: String? = null
)
