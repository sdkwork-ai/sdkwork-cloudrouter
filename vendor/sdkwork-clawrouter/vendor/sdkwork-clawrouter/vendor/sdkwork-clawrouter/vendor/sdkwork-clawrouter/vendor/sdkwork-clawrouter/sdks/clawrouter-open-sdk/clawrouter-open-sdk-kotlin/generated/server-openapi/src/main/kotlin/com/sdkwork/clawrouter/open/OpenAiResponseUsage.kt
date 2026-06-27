package com.sdkwork.clawrouter.open

data class OpenAiResponseUsage(
    val inputTokens: Int? = null,
    val inputTokensDetails: OpenAiResponseInputTokensDetails? = null,
    val outputTokens: Int? = null,
    val outputTokensDetails: OpenAiResponseOutputTokensDetails? = null,
    val totalTokens: Int? = null
)
