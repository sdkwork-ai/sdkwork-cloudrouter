package com.sdkwork.clawrouter.open

data class OpenAiVectorStore(
    val bytes: Int? = null,
    val createdAt: Int? = null,
    val expiresAfter: String? = null,
    val expiresAt: Int? = null,
    val fileCounts: OpenAiVectorStoreFileCounts? = null,
    val id: String? = null,
    val lastActiveAt: Int? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null,
    val object_: String? = null,
    val status: String? = null,
    val usageBytes: Int? = null
)
