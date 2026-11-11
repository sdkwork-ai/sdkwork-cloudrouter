package com.sdkwork.cloudrouter.open

data class OpenAiVideoCreateRequest(
    val inputReference: Map<String, String>? = null,
    val model: String? = null,
    val prompt: String? = null,
    val seconds: String? = null,
    val size: String? = null
)
