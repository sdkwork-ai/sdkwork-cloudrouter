package com.sdkwork.clawrouter.open

data class OpenAiResponseInputTokenCount(
    val inputTokens: Int? = null,
    val inputTokensDetails: OpenAiResponseInputTokensDetails? = null,
    val model: String? = null,
    val object_: String? = null
)
