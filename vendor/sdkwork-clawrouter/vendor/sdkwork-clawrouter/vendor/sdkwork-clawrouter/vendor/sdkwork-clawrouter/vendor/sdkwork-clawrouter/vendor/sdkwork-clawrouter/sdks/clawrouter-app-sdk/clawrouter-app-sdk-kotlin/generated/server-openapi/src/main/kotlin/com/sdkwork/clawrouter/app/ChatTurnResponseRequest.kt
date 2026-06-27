package com.sdkwork.clawrouter.app

data class ChatTurnResponseRequest(
    val message: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val provider: String? = null,
    val runtime: String? = null,
    val runtimeInvocationId: String? = null,
    val status: String? = null,
    val usage: Map<String, Any>? = null,
    val usageFactId: String? = null
)
