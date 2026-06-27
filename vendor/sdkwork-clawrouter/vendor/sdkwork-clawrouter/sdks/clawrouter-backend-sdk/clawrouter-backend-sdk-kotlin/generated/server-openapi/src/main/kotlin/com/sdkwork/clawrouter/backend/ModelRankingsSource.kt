package com.sdkwork.clawrouter.backend

data class ModelRankingsSource(
    val cacheMaxAgeSeconds: String? = null,
    val generatedAt: String? = null,
    val nextRefreshAt: String? = null,
    val observedAt: String? = null,
    val rankScope: String? = null,
    val refreshIntervalSeconds: String? = null,
    val snapshotDate: String? = null,
    val snapshotPeriod: String? = null,
    val sourceDescription: String? = null,
    val sourceLabel: String? = null,
    val sourceTables: List<String>? = null,
    val windowEnd: String? = null,
    val windowStart: String? = null
)
