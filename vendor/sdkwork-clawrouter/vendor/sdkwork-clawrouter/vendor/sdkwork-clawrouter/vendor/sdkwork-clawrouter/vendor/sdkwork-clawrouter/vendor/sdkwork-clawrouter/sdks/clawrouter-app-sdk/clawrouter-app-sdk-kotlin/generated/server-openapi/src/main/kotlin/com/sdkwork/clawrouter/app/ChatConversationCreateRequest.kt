package com.sdkwork.clawrouter.app

data class ChatConversationCreateRequest(
    val agentId: String? = null,
    val agentSessionId: String? = null,
    val defaultModel: String? = null,
    val defaultProvider: String? = null,
    val memorySpaceId: String? = null,
    val metadata: Map<String, String>? = null,
    val sourceSurface: String? = null,
    val title: String? = null
)
