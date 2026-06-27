package com.sdkwork.clawrouter.open

data class OpenAiProjectRateLimit(
    val batch1DayMaxInputTokens: Int? = null,
    val id: String? = null,
    val maxImagesPer1Minute: Int? = null,
    val maxRequestsPer1Minute: Int? = null,
    val maxTokensPer1Minute: Int? = null,
    val model: String? = null,
    val object_: String? = null
)
