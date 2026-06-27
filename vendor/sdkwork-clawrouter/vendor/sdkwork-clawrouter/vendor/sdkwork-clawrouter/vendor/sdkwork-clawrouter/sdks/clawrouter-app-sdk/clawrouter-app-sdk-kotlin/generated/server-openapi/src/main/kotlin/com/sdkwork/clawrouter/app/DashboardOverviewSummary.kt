package com.sdkwork.clawrouter.app

data class DashboardOverviewSummary(
    val audioRequests: String? = null,
    val availableCredits: Double? = null,
    val errorCount: String? = null,
    val imageRequests: String? = null,
    val musicRequests: String? = null,
    val requestCount: String? = null,
    val rpm: Double? = null,
    val totalRequestCount: String? = null,
    val totalUsedCredits: Double? = null,
    val tpm: Double? = null,
    val usedCredits: Double? = null,
    val videoRequests: String? = null
)
