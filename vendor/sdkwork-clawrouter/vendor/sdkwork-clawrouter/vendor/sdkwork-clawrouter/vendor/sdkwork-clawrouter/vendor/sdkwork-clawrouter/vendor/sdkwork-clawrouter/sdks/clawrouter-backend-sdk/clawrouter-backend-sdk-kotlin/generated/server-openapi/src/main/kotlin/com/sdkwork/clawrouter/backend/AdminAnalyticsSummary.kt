package com.sdkwork.clawrouter.backend

data class AdminAnalyticsSummary(
    val activeModels: String? = null,
    val activeUsers: String? = null,
    val averagePointsPerRequest: Double? = null,
    val averageTokensPerRequest: Double? = null,
    val errorRate: Double? = null,
    val failedRequests: String? = null,
    val successfulRequests: String? = null,
    val totalPoints: Double? = null,
    val totalRequests: String? = null,
    val totalTokens: Double? = null,
    val totalUsers: String? = null,
    val upstreamCost: Double? = null
)
