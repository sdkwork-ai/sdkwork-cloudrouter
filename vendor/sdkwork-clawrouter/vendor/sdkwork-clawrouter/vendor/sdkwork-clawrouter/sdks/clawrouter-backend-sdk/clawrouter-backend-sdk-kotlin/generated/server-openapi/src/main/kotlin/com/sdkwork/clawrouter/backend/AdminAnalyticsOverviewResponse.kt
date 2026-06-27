package com.sdkwork.clawrouter.backend

data class AdminAnalyticsOverviewResponse(
    val endTime: String? = null,
    val insights: List<AdminAnalyticsInsight>? = null,
    val limit: String? = null,
    val modalityDistribution: List<AdminPieChartItem>? = null,
    val modelDistribution: List<AdminPieChartItem>? = null,
    val modelRankings: AdminAnalyticsModelRankings? = null,
    val startTime: String? = null,
    val summary: AdminAnalyticsSummary? = null,
    val timeRange: String? = null,
    val trend: List<AdminAnalyticsTrendPoint>? = null,
    val userRankings: AdminAnalyticsUserRankings? = null
)
