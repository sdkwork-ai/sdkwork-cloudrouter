package com.sdkwork.clawrouter.open

data class OpenAiVectorStoreFileBatchCreateRequest(
    val attributes: Map<String, String>? = null,
    val chunkingStrategy: String? = null,
    val fileIds: List<String>? = null
)
