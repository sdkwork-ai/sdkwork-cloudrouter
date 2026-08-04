package com.sdkwork.cloudrouter.open

data class OpenAiThreadCreateRequest(
    val messages: List<OpenAiThreadMessageCreateRequest>? = null,
    val metadata: Map<String, String>? = null,
    val toolResources: String? = null
)
