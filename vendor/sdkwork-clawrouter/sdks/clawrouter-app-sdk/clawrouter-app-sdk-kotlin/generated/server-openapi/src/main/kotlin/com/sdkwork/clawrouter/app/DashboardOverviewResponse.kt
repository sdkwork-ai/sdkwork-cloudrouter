package com.sdkwork.clawrouter.app

data class DashboardOverviewResponse(
    val announcements: List<DashboardAnnouncement>? = null,
    val chartData: List<DashboardChartPoint>? = null,
    val configurationDomains: List<DashboardConfigurationDomain>? = null,
    val multimodalSparkline: List<DashboardSparklinePoint>? = null,
    val performanceSparkline: List<DashboardSparklinePoint>? = null,
    val requestSparkline: List<DashboardSparklinePoint>? = null,
    val summary: DashboardOverviewSummary? = null,
    val topModels: List<DashboardTopModel>? = null,
    val warnings: List<String>? = null
)
