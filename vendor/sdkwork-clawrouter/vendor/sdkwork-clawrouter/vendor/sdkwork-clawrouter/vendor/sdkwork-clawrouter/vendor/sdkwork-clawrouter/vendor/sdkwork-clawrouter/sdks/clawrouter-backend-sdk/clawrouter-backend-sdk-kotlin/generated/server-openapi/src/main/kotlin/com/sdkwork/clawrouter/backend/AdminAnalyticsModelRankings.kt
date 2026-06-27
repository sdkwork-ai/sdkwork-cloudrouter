package com.sdkwork.clawrouter.backend

data class AdminAnalyticsModelRankings(
    val points: List<AdminAnalyticsModelRankItem>? = null,
    val requests: List<AdminAnalyticsModelRankItem>? = null,
    val tokens: List<AdminAnalyticsModelRankItem>? = null
)
