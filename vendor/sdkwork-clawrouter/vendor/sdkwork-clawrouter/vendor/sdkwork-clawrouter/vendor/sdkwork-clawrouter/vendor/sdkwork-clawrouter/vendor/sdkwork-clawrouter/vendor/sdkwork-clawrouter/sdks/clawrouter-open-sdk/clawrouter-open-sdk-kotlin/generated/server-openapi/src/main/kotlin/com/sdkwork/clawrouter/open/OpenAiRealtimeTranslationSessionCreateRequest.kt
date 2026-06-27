package com.sdkwork.clawrouter.open

data class OpenAiRealtimeTranslationSessionCreateRequest(
    val metadata: Map<String, String>? = null,
    val model: String? = null,
    val sourceLanguage: String? = null,
    val targetLanguage: String? = null
)
