package com.sdkwork.clawrouter.open

data class OpenAiTokenUsage(
    val completionTokens: Int? = null,
    val completionTokensDetails: OpenAiCompletionTokensDetails? = null,
    val promptTokens: Int? = null,
    val promptTokensDetails: OpenAiPromptTokensDetails? = null,
    val totalTokens: Int? = null
)
