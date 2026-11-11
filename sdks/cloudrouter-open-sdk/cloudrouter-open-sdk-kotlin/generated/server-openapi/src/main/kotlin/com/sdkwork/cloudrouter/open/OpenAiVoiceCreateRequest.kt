package com.sdkwork.cloudrouter.open

data class OpenAiVoiceCreateRequest(
    val model: String? = null,
    val name: String? = null,
    val prompt: String? = null,
    val scriptHint: String? = null,
    val type: String? = null
)
