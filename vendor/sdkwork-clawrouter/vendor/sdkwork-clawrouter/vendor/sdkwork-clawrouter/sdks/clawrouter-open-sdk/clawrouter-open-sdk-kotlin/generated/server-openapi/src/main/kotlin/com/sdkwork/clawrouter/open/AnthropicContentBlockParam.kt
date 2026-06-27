package com.sdkwork.clawrouter.open

data class AnthropicContentBlockParam(
    val content: String? = null,
    val id: String? = null,
    val input: Map<String, String>? = null,
    val name: String? = null,
    val source: AnthropicContentSource? = null,
    val text: String? = null,
    val toolUseId: String? = null,
    val type: String? = null
)
