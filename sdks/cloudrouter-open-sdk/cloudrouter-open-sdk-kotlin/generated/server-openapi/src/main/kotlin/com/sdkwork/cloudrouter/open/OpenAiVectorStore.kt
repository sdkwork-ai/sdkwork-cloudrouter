package com.sdkwork.cloudrouter.open

data class OpenAiVectorStore(
    val bytes: Int? = null,
    val createdAt: Int,
    val expiresAfter: String? = null,
    val expiresAt: Int? = null,
    val fileCounts: OpenAiVectorStoreFileCounts? = null,
    val id: String,
    val lastActiveAt: Int? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null,
    val object_: String,
    val status: String,
    val usageBytes: Int? = null
)
