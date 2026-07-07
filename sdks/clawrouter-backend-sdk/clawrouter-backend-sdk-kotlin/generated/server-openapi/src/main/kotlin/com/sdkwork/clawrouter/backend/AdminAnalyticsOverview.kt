package com.sdkwork.clawrouter.backend

data class AdminAnalyticsOverview(
    val endTime: String? = null,
    val insights: List<Map<String, Any>>? = null,
    val modalityDistribution: List<Map<String, Any>>? = null,
    val modelDistribution: List<Map<String, Any>>? = null,
    val modelRankings: Map<String, Any>? = null,
    val rankingSize: Int? = null,
    val startTime: String? = null,
    val summary: Map<String, Any>? = null,
    val timeRange: String? = null,
    val trend: List<Map<String, Any>>? = null,
    val userRankings: Map<String, Any>? = null
)
