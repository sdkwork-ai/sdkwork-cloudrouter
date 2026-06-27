package com.sdkwork.clawrouter.backend

data class AdminDashboardDataResponse(
    val activeUsers: String? = null,
    val modelDistribution: List<AdminPieChartItem>? = null,
    val multimodal: List<AdminPieChartItem>? = null,
    val recentUsage: List<AdminDashboardRecentUsageItem>? = null,
    val traffic: List<AdminDashboardTrafficItem>? = null,
    val userConsumption: List<AdminPieChartItem>? = null
)
