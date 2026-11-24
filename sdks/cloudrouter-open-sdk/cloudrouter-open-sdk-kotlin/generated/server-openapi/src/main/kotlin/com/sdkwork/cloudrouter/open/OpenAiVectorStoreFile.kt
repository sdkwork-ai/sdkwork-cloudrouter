package com.sdkwork.cloudrouter.open

data class OpenAiVectorStoreFile(
    val attributes: Map<String, String>? = null,
    val chunkingStrategy: String? = null,
    val createdAt: Int,
    val id: String,
    val lastError: String? = null,
    val object_: String,
    val status: String,
    val usageBytes: Int? = null,
    val vectorStoreId: String
)
