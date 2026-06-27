package com.sdkwork.clawrouter.open

data class OpenAiRunCreateRequest(
    val additionalInstructions: String? = null,
    val assistantId: String? = null,
    val instructions: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val stream: Boolean? = null,
    val tools: List<String>? = null
)
