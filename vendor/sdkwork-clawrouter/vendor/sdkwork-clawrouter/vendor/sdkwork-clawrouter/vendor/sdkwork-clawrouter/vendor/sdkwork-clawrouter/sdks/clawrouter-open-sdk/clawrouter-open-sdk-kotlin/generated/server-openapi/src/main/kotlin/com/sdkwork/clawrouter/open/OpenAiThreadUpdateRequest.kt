package com.sdkwork.clawrouter.open

data class OpenAiThreadUpdateRequest(
    val metadata: Map<String, String>? = null,
    val toolResources: String? = null
)
