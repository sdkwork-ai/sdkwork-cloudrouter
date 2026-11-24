package com.sdkwork.cloudrouter.open

data class OpenAiContainer(
    val createdAt: Int,
    val expiresAt: Int? = null,
    val id: String,
    val lastActiveAt: Int? = null,
    val memoryLimit: String? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null,
    val object_: String,
    val status: String
)
