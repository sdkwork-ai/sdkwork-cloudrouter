package com.sdkwork.cloudrouter.open

data class OpenAiRealtimeTranslationSession(
    val clientSecret: OpenAiRealtimeClientSecretValue? = null,
    val id: String? = null,
    val object_: String? = null,
    val sourceLanguage: String? = null,
    val targetLanguage: String? = null
)
