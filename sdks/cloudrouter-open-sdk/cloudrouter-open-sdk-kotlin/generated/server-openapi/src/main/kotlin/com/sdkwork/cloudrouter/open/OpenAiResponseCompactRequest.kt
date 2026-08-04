package com.sdkwork.cloudrouter.open

data class OpenAiResponseCompactRequest(
    val input: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val previousResponseId: String? = null
)
