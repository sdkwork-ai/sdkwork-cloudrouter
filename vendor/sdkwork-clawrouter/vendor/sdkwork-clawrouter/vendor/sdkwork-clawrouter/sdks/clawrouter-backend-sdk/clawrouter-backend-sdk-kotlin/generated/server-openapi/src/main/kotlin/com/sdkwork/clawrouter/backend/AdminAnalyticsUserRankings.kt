package com.sdkwork.clawrouter.backend

data class AdminAnalyticsUserRankings(
    val points: List<AdminAnalyticsUserRankItem>? = null,
    val requests: List<AdminAnalyticsUserRankItem>? = null,
    val tokens: List<AdminAnalyticsUserRankItem>? = null
)
