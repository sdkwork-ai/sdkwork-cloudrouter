package com.sdkwork.cloudrouter.open

data class OpenAiResponseInputTokenCount(
    val inputTokens: Int,
    val inputTokensDetails: OpenAiResponseInputTokensDetails? = null,
    val model: String? = null,
    val object_: String? = null
)
