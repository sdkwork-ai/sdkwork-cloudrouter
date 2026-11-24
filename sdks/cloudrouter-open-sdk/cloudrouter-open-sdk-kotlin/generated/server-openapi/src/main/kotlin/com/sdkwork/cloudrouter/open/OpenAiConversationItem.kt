package com.sdkwork.cloudrouter.open

data class OpenAiConversationItem(
    val content: List<OpenAiConversationContentPart>? = null,
    val createdAt: Int? = null,
    val id: String,
    val metadata: Map<String, String>? = null,
    val object_: String,
    val role: String? = null,
    val status: String? = null,
    val type: String
)
