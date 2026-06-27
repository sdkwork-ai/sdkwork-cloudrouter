package com.sdkwork.clawrouter.open

data class OpenAiBatchCreateRequest(
    val completionWindow: String? = null,
    val endpoint: String? = null,
    val inputFileId: String? = null,
    val metadata: Map<String, String>? = null
)
