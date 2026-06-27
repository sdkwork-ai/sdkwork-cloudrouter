package com.sdkwork.clawrouter.backend

data class AdminMonitorPerformanceItem(
    val cpu: Double? = null,
    val memory: Double? = null,
    val network: Double? = null,
    val time: String? = null
)
