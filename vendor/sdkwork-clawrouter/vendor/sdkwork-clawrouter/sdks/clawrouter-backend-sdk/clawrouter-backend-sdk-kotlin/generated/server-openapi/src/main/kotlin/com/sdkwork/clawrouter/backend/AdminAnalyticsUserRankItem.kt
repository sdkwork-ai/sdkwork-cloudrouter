package com.sdkwork.clawrouter.backend

data class AdminAnalyticsUserRankItem(
    val email: String? = null,
    val modelDistribution: List<AdminPieChartItem>? = null,
    val points: Double? = null,
    val rank: String? = null,
    val requestCount: String? = null,
    val totalTokens: Double? = null,
    val userId: String? = null,
    val userName: String? = null
)
