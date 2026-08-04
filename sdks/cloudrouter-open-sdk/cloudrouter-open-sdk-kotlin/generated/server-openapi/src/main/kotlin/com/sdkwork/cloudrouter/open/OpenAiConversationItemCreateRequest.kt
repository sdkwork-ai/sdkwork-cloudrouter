package com.sdkwork.cloudrouter.open

data class OpenAiConversationItemCreateRequest(
    val content: List<OpenAiConversationContentPart>? = null,
    val metadata: Map<String, String>? = null,
    val role: String? = null,
    val type: String? = null
)
