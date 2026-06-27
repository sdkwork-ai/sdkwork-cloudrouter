package com.sdkwork.clawrouter.open

data class OpenAiContainerCreateRequest(
    val fileIds: List<String>? = null,
    val memoryLimit: String? = null,
    val metadata: Map<String, String>? = null,
    val name: String? = null
)
