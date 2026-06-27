package com.sdkwork.clawrouter.open

data class OpenAiVectorStoreFileCreateRequest(
    val attributes: Map<String, String>? = null,
    val chunkingStrategy: String? = null,
    val fileId: String? = null
)
