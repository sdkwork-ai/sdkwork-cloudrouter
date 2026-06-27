package com.sdkwork.clawrouter.open

data class OpenAiConversationItem(
    val content: List<OpenAiConversationContentPart>? = null,
    val createdAt: Int? = null,
    val id: String? = null,
    val metadata: Map<String, String>? = null,
    val object_: String? = null,
    val role: String? = null,
    val status: String? = null,
    val type: String? = null
)
