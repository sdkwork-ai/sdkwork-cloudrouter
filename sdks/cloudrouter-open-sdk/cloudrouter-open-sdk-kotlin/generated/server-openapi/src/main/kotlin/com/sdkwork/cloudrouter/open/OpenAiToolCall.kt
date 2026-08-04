package com.sdkwork.cloudrouter.open

data class OpenAiToolCall(
    val function: OpenAiFunctionCall? = null,
    val id: String? = null,
    val type: String? = null
)
