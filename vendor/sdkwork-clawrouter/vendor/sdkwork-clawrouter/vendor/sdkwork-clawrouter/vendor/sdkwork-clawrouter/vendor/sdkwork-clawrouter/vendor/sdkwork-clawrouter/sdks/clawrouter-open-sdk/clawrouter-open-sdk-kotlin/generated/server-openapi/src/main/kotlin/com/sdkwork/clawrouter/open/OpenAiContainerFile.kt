package com.sdkwork.clawrouter.open

data class OpenAiContainerFile(
    val bytes: Int? = null,
    val containerId: String? = null,
    val createdAt: Int? = null,
    val filename: String? = null,
    val id: String? = null,
    val metadata: Map<String, String>? = null,
    val object_: String? = null,
    val path: String? = null,
    val purpose: String? = null
)
