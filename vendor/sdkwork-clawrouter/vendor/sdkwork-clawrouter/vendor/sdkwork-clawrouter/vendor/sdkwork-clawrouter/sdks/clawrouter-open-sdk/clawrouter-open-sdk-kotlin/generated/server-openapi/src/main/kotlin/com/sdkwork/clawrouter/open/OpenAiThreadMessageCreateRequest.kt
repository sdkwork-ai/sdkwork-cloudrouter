package com.sdkwork.clawrouter.open

data class OpenAiThreadMessageCreateRequest(
    val attachments: List<String>? = null,
    val content: String? = null,
    val metadata: Map<String, String>? = null,
    val role: String? = null
)
