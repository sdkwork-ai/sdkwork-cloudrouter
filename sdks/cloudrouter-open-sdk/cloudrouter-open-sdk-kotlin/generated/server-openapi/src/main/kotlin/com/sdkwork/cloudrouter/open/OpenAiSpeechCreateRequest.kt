package com.sdkwork.cloudrouter.open

data class OpenAiSpeechCreateRequest(
    val input: String,
    val instructions: String? = null,
    val model: String,
    val responseFormat: String? = null,
    val speed: Double? = null,
    val streamFormat: String? = null,
    val voice: String
)
