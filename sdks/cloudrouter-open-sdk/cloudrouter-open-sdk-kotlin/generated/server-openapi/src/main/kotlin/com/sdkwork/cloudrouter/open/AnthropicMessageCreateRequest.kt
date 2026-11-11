package com.sdkwork.cloudrouter.open

data class AnthropicMessageCreateRequest(
    val cacheControl: AnthropicCacheControl? = null,
    val container: AnthropicContainer? = null,
    val diagnostics: AnthropicDiagnostics? = null,
    val inferenceGeo: String? = null,
    val maxTokens: Int? = null,
    val messages: List<AnthropicMessageParam>? = null,
    val metadata: AnthropicMetadata? = null,
    val model: String? = null,
    val outputConfig: AnthropicOutputConfig? = null,
    val serviceTier: String? = null,
    val speed: String? = null,
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
