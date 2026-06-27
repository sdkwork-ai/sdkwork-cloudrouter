package com.sdkwork.clawrouter.open

data class OpenAiVectorStoreFile(
    val attributes: Map<String, String>? = null,
    val chunkingStrategy: String? = null,
    val createdAt: Int? = null,
    val id: String? = null,
    val lastError: String? = null,
    val object_: String? = null,
    val status: String? = null,
    val usageBytes: Int? = null,
    val vectorStoreId: String? = null
)
