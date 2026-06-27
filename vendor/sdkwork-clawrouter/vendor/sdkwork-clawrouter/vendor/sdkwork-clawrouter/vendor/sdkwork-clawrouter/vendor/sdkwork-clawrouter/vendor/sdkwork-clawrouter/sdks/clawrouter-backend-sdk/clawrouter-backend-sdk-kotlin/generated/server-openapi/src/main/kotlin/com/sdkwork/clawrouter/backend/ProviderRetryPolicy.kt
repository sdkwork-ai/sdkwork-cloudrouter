package com.sdkwork.clawrouter.backend

data class ProviderRetryPolicy(
    val backoffMs: Int? = null,
    val maxAttempts: Int? = null,
    val retryableStatusCodes: List<Int>? = null
)
