package com.sdkwork.clawrouter.app

data class RoutingRetryPolicy(
    val backoffMs: String? = null,
    val maxAttempts: String? = null,
    val retryableStatusCodes: List<String>? = null
)
