package com.sdkwork.cloudrouter.open

data class XaiUsage(
    val completionTokens: Int? = null,
    val costInUsdTicks: Int? = null,
    val numSourcesUsed: Int? = null,
    val promptTokens: Int? = null,
    val totalTokens: Int? = null
)
