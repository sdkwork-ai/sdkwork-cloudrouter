package com.sdkwork.clawrouter.app

data class ChatTurnCreateRequest(
    val agentId: String? = null,
    val agentSessionId: String? = null,
    val message: String? = null,
    val metadata: Map<String, String>? = null,
    val mode: String? = null,
    val model: String? = null,
    val provider: String? = null
)
