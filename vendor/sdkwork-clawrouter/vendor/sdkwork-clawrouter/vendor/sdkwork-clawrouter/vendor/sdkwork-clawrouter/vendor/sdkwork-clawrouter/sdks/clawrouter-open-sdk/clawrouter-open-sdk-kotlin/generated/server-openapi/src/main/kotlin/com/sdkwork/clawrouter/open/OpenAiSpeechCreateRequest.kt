package com.sdkwork.clawrouter.open

data class OpenAiSpeechCreateRequest(
    val input: String? = null,
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val responseFormat: String? = null,
    val speed: Double? = null,
    val voice: String? = null
)
