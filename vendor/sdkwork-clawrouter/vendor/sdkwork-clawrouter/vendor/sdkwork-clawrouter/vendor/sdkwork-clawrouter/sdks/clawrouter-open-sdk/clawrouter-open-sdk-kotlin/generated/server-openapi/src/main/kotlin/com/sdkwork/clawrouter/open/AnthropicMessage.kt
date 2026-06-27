package com.sdkwork.clawrouter.open

data class AnthropicMessage(
    val content: List<AnthropicContentBlock>? = null,
    val id: String? = null,
    val model: String? = null,
    val role: String? = null,
    val stopReason: String? = null,
    val stopSequence: String? = null,
    val type: String? = null,
    val usage: AnthropicUsage? = null
)
