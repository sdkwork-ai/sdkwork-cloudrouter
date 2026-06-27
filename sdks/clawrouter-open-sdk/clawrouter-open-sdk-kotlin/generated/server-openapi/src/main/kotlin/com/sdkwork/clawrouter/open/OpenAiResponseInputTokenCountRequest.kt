package com.sdkwork.clawrouter.open

data class OpenAiResponseInputTokenCountRequest(
    val input: String? = null,
    val instructions: String? = null,
    val model: String? = null,
    val tools: List<String>? = null
)
