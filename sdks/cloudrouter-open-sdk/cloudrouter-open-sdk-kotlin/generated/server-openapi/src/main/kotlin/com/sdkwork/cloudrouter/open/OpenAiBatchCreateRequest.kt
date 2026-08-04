package com.sdkwork.cloudrouter.open

data class OpenAiBatchCreateRequest(
    val completionWindow: String? = null,
    val endpoint: String? = null,
    val inputFileId: String? = null,
    val metadata: Map<String, String>? = null
)
