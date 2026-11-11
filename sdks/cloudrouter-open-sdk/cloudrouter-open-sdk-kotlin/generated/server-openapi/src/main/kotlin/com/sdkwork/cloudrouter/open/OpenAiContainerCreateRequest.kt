package com.sdkwork.cloudrouter.open

data class OpenAiContainerCreateRequest(
    val expiresAfter: Map<String, String>? = null,
    val fileIds: List<String>? = null,
    val memoryLimit: String? = null,
    val name: String? = null,
    val networkPolicy: Map<String, String>? = null,
    val skills: List<Map<String, String>>? = null
)
