package com.sdkwork.clawrouter.open

data class OpenAiContainer(
    val createdAt: Int? = null,
    val expiresAt: Int? = null,
    val id: String? = null,
    val lastActiveAt: Int? = null,
    val memoryLimit: String? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null,
    val object_: String? = null,
    val status: String? = null
)
