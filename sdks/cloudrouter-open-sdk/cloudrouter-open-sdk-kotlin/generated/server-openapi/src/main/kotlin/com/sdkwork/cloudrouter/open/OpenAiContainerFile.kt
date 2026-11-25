package com.sdkwork.cloudrouter.open

data class OpenAiContainerFile(
    val bytes: Int? = null,
    val containerId: String? = null,
    val createdAt: Int,
    val filename: String? = null,
    val id: String,
    val metadata: Map<String, String>? = null,
    val object_: String,
    val path: String? = null,
    val purpose: String? = null
)
