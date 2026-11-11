package com.sdkwork.cloudrouter.open

data class AnthropicTool(
    val allowedCallers: List<String>? = null,
    val cacheControl: AnthropicCacheControl? = null,
    val deferLoading: Boolean? = null,
    val description: String? = null,
    val eagerInputStreaming: Boolean? = null,
    val inputExamples: List<Map<String, String>>? = null,
    val inputSchema: ProviderJsonSchema? = null,
    val name: String? = null,
    val strict: Boolean? = null,
    val type: String? = null
)
