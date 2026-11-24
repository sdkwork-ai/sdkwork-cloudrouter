package com.sdkwork.cloudrouter.open

data class OpenAiToolCall(
    val function: OpenAiFunctionCall? = null,
    val id: String,
    val type: String
)
