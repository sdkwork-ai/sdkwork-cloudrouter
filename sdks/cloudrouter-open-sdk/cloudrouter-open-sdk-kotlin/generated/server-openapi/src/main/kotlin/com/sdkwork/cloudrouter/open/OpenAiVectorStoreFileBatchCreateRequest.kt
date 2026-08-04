package com.sdkwork.cloudrouter.open

data class OpenAiVectorStoreFileBatchCreateRequest(
    val attributes: Map<String, String>? = null,
    val chunkingStrategy: String? = null,
    val fileIds: List<String>? = null
)
