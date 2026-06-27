package com.sdkwork.clawrouter.open

data class AnthropicCountMessageTokensRequest(
    val maxTokens: Int? = null,
    val messages: List<AnthropicMessageParam>? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val stopSequences: List<String>? = null,
    val stream: Boolean? = null,
    val system: String? = null,
    val temperature: Double? = null,
    val thinking: AnthropicThinkingConfig? = null,
    val toolChoice: AnthropicToolChoice? = null,
    val tools: List<AnthropicTool>? = null,
    val topK: Int? = null,
    val topP: Double? = null
)
