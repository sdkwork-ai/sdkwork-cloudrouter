package com.sdkwork.cloudrouter.open

data class OpenAiThread(
    val createdAt: Int,
    val id: String,
    val metadata: Map<String, String>? = null,
    val object_: String,
    val toolResources: String? = null
)
