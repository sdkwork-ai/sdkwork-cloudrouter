package com.sdkwork.clawrouter.open

data class OpenAiOrganizationUsageBucket(
    val endTime: Int? = null,
    val inputTokens: Int? = null,
    val numRequests: Int? = null,
    val object_: String? = null,
    val outputTokens: Int? = null,
    val results: List<String>? = null,
    val startTime: Int? = null
)
