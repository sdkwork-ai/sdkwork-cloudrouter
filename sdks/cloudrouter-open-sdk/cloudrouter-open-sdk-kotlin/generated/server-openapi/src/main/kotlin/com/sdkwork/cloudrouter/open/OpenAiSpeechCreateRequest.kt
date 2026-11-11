package com.sdkwork.cloudrouter.open

data class OpenAiSpeechCreateRequest(
    val input: String? = null,
    val instructions: String? = null,
    val model: String? = null,
    val responseFormat: String? = null,
    val speed: Double? = null,
    val streamFormat: String? = null,
    val voice: String? = null
)
