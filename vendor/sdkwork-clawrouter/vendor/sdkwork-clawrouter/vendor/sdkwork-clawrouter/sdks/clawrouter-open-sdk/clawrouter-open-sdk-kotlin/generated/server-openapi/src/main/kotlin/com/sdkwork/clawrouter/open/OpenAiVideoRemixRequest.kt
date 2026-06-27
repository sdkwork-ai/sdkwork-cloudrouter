package com.sdkwork.clawrouter.open

data class OpenAiVideoRemixRequest(
    val image: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val prompt: String? = null,
    val seconds: Int? = null,
    val size: String? = null,
    val video: String? = null
)
