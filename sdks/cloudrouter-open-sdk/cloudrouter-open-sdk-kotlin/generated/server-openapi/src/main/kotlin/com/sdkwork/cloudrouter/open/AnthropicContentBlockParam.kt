package com.sdkwork.cloudrouter.open

data class AnthropicContentBlockParam(
    val cacheControl: AnthropicCacheControl? = null,
    val caller: Map<String, String>? = null,
    val citations: List<Map<String, String>>? = null,
    val content: String? = null,
    val context: String? = null,
    val data_: String? = null,
    val id: String? = null,
    val input: Map<String, String>? = null,
    val isError: Boolean? = null,
    val name: String? = null,
    val signature: String? = null,
    val source: AnthropicContentSource? = null,
    val text: String? = null,
    val thinking: String? = null,
    val title: String? = null,
    val toolUseId: String? = null,
    val toolsetName: String? = null,
    val type: String? = null
)
