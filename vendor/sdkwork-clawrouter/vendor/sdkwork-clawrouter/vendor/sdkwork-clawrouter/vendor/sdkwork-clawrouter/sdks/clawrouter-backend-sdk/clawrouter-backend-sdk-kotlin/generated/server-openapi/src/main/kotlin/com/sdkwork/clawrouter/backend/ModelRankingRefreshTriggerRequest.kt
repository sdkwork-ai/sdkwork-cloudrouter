package com.sdkwork.clawrouter.backend

data class ModelRankingRefreshTriggerRequest(
    val cacheMaxAgeSeconds: String? = null,
    val limit: String? = null,
    val lookbackDays: String? = null,
    val rankScope: String? = null,
    val refreshIntervalSeconds: String? = null,
    val snapshotPeriod: String? = null
)
