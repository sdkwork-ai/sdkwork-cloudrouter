package com.sdkwork.cloudrouter.open

data class OpenAiBatchCreateRequest(
    val completionWindow: String,
    val endpoint: String,
    val inputFileId: String,
    val metadata: Map<String, String>? = null,
    val outputExpiresAfter: Map<String, String>? = null
)
