package com.sdkwork.cloudrouter.open

data class OpenAiConversationCreateRequest(
    val items: List<OpenAiConversationItemCreateRequest>? = null,
    val metadata: Map<String, String>? = null
)
