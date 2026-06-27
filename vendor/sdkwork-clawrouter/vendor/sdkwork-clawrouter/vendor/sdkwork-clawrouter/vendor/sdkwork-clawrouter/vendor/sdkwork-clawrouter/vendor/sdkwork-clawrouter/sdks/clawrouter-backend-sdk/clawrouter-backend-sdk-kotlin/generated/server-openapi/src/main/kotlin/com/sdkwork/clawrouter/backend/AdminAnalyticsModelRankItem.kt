package com.sdkwork.clawrouter.backend

data class AdminAnalyticsModelRankItem(
    val averageTokensPerRequest: Double? = null,
    val catalogKey: String? = null,
    val errorRate: Double? = null,
    val modality: String? = null,
    val model: String? = null,
    val points: Double? = null,
    val rank: String? = null,
    val requestCount: String? = null,
    val totalTokens: Double? = null,
    val upstreamCost: Double? = null,
    val userCount: String? = null,
    val vendor: String? = null
)
