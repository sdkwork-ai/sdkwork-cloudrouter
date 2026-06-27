package com.sdkwork.clawrouter.app

data class ChatMessageItem(
    val content: String? = null,
    val conversationId: String? = null,
    val createdAt: String? = null,
    val direction: String? = null,
    val id: String? = null,
    val model: String? = null,
    val provider: String? = null,
    val role: String? = null,
    val runtime: String? = null,
    val runtimeInvocationId: String? = null,
    val status: String? = null,
    val turnId: String? = null,
    val usage: Map<String, Any>? = null,
    val usageLinkId: String? = null
)
