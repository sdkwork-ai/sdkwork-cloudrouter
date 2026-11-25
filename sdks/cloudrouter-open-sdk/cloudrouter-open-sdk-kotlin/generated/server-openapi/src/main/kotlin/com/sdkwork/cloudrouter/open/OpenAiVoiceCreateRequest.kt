package com.sdkwork.cloudrouter.open

data class OpenAiVoiceCreateRequest(
    val model: String? = null,
    val name: String,
    val prompt: String,
    val scriptHint: String? = null,
    val type: String
)
