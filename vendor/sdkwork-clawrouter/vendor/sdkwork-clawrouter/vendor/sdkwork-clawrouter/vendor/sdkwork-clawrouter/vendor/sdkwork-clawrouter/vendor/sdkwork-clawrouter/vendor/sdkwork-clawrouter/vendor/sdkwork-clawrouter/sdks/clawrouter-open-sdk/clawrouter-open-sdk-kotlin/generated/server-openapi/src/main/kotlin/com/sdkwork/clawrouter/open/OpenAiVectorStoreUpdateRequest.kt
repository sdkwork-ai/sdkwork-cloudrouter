package com.sdkwork.clawrouter.open

data class OpenAiVectorStoreUpdateRequest(
    val expiresAfter: String? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null
)
