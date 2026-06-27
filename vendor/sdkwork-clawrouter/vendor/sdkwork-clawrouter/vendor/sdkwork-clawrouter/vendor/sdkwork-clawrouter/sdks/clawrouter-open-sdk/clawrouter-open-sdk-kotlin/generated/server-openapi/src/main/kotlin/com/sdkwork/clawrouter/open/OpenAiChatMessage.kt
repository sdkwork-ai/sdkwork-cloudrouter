package com.sdkwork.clawrouter.open

data class OpenAiChatMessage(
    val content: String? = null,
    val functionCall: OpenAiFunctionCall? = null,
    val name: String? = null,
    val refusal: String? = null,
    val role: String? = null,
    val toolCallId: String? = null,
    val toolCalls: List<OpenAiToolCall>? = null
)
