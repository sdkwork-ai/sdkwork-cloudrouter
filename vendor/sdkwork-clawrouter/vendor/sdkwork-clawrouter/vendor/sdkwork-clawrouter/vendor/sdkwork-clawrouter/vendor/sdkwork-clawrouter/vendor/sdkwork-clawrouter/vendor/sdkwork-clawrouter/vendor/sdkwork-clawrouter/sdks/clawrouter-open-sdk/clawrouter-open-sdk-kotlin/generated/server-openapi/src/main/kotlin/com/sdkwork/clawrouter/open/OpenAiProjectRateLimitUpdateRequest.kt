package com.sdkwork.clawrouter.open

data class OpenAiProjectRateLimitUpdateRequest(
    val batch1DayMaxInputTokens: Int? = null,
    val maxImagesPer1Minute: Int? = null,
    val maxRequestsPer1Minute: Int? = null,
    val maxTokensPer1Minute: Int? = null
)
