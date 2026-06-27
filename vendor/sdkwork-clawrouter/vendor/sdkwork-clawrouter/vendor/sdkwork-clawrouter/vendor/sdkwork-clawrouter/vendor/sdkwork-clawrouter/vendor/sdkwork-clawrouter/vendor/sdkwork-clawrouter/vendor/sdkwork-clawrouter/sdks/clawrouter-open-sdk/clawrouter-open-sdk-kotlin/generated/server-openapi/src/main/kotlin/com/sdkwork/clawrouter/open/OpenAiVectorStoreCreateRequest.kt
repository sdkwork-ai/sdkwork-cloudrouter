package com.sdkwork.clawrouter.open

data class OpenAiVectorStoreCreateRequest(
    val chunkingStrategy: String? = null,
    val expiresAfter: String? = null,
    val fileIds: List<String>? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null
)
