package com.sdkwork.cloudrouter.open

data class AnthropicCountMessageTokensRequest(
    val cacheControl: AnthropicCacheControl? = null,
    val messages: List<AnthropicMessageParam>? = null,
    val model: String? = null,
    val outputConfig: AnthropicOutputConfig? = null,
    val speed: String? = null,
    val system: String? = null,
    val thinking: AnthropicThinkingConfig? = null,
    val toolChoice: AnthropicToolChoice? = null,
    val tools: List<AnthropicTool>? = null
)
