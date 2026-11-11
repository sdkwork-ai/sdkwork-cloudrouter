package com.sdkwork.cloudrouter.open

data class OpenAiResponseInputTokenCountRequest(
    val conversation: String? = null,
    val input: String? = null,
    val instructions: String? = null,
    val model: String? = null,
    val parallelToolCalls: Boolean? = null,
    val personality: String? = null,
    val previousResponseId: String? = null,
    val reasoning: String? = null,
    val text: String? = null,
    val toolChoice: String? = null,
    val tools: List<String>? = null,
    val truncation: String? = null
)
