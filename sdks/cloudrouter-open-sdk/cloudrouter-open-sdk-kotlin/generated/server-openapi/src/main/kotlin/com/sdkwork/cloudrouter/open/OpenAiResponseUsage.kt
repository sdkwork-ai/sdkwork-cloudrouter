package com.sdkwork.cloudrouter.open

data class OpenAiResponseUsage(
    val inputTokens: Int,
    val inputTokensDetails: OpenAiResponseInputTokensDetails? = null,
    val outputTokens: Int,
    val outputTokensDetails: OpenAiResponseOutputTokensDetails? = null,
    val totalTokens: Int
)
