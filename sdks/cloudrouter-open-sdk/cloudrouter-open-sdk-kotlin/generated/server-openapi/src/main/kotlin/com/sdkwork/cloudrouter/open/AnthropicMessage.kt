package com.sdkwork.cloudrouter.open

data class AnthropicMessage(
    val content: List<AnthropicContentBlock>,
    val id: String,
    val model: String,
    val role: String,
    val stopReason: String,
    val stopSequence: String? = null,
    val type: String,
    val usage: AnthropicUsage
)
