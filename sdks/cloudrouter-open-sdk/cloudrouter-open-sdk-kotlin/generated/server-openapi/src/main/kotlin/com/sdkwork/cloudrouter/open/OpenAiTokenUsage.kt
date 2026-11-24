package com.sdkwork.cloudrouter.open

data class OpenAiTokenUsage(
    val completionTokens: Int,
    val completionTokensDetails: OpenAiCompletionTokensDetails? = null,
    val promptTokens: Int,
    val promptTokensDetails: OpenAiPromptTokensDetails? = null,
    val totalTokens: Int
)
