package com.sdkwork.clawrouter.app

data class RoutingUsageSnapshot(
    val chartData: List<RoutingUsageData>? = null,
    val modelStats: List<RoutingModelStats>? = null
)
