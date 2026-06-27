package com.sdkwork.clawrouter.open

data class OpenAiThreadAndRunCreateRequest(
    val assistantId: String? = null,
    val instructions: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val stream: Boolean? = null,
    val thread: OpenAiThreadCreateRequest? = null,
    val tools: List<String>? = null
)
