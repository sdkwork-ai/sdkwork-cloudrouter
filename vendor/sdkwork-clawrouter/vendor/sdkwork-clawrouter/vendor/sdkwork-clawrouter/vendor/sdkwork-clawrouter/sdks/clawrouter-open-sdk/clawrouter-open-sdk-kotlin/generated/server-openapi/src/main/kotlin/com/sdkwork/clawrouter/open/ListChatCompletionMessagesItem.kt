package com.sdkwork.clawrouter.open

data class ListChatCompletionMessagesItem(
    val content: String? = null,
    val created: Int? = null,
    val createdAt: Int? = null,
    val id: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val object_: String? = null,
    val output: List<String>? = null,
    val role: String? = null,
    val status: String? = null,
    val usage: OpenAiTokenUsage? = null
)
