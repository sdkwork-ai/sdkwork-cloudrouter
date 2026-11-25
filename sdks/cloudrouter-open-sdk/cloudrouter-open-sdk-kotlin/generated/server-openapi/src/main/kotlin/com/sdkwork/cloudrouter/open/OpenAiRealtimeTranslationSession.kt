package com.sdkwork.cloudrouter.open

data class OpenAiRealtimeTranslationSession(
    val clientSecret: OpenAiRealtimeClientSecretValue? = null,
    val id: String,
    val object_: String,
    val sourceLanguage: String? = null,
    val targetLanguage: String? = null
)
