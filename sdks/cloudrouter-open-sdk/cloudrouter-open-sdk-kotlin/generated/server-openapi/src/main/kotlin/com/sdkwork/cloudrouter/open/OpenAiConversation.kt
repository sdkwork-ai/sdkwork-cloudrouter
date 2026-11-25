package com.sdkwork.cloudrouter.open

data class OpenAiConversation(
    val createdAt: Int,
    val id: String,
    val metadata: Map<String, String>? = null,
    val object_: String
)
